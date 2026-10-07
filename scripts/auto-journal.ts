/**
 * Daily job (Windows Task Scheduler) that turns new Asking Sean uploads into iherng
 * Journal articles and publishes them unattended.
 *
 * For each Asking Sean video uploaded after the job was first run that has no article:
 *   1. download Sean's English captions with yt-dlp (project .venv)
 *   2. have DeepSeek write the article in the Journal's Ask Sean format
 *   3. check it: every field present, and Sean's quote word for word in the captions
 *      (one rewrite is allowed with the problems fed back)
 *   4. add it to the Journal, then typecheck and build the site
 *   5. commit, push and deploy the Journal to Cloudflare Pages
 *   6. start the asking-iherng GitHub workflow so the chatbot picks the article up
 * Any failure leaves the Journal as it was; the video is retried the next day, up to
 * MAX_ATTEMPTS days. The job never runs while the Journal has uncommitted changes.
 *
 *   npm run auto:journal                         normal daily run
 *   npm run auto:journal -- --dry-run --video ID  write a draft to .cache/auto-journal/drafts only
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { addUsage, chat, NO_USAGE, type Usage } from "../lib/deepseek";
import { loadEnv, requireEnv } from "../lib/env";
import { readJsonIfExists, writeJson } from "../lib/knowledge";

const CHANNEL_FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCXXg22fFnTvH5ptRlTaxORQ";
const PAGES_PROJECT = "iherng-journal";
const CHATBOT_REPO = "yonghaoxd/asking-iherng";
const MAX_ATTEMPTS = 5;
const MAX_PER_RUN = 2;
const MIN_TRANSCRIPT_WORDS = 1500;

const WORK_DIR = path.resolve(".cache/auto-journal");
const STATE_PATH = path.join(WORK_DIR, "state.json");
const LOG_PATH = path.join(WORK_DIR, "log.txt");
const PYTHON = path.resolve(".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const IS_WINDOWS = process.platform === "win32";
const NPM = IS_WINDOWS ? "npm.cmd" : "npm";
const NPX = IS_WINDOWS ? "npx.cmd" : "npx";

// ---------------------------------------------------------------------------
// Small helpers

async function log(message: string): Promise<void> {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  await mkdir(WORK_DIR, { recursive: true });
  await appendFile(LOG_PATH, line + "\n", "utf8");
}

/** Run a program and return stdout; throws with its output on failure. */
function run(command: string, args: string[], cwd: string): string {
  // .cmd launchers (npm, npx) can only be started through a shell on Windows.
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: command.endsWith(".cmd"),
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().split("\n").slice(-15).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed:\n${output}`);
  }
  return result.stdout ?? "";
}

function words(text: string): string[] {
  return text.toLowerCase().replace(/[‘’]/g, "'").match(/[a-z0-9']+/g) ?? [];
}

/** Same rule as the Journal's scripts/verify_quotes.py: the quote's words appear in order in the captions. */
function isVerbatim(quote: string, transcript: string): boolean {
  const needle = ` ${words(quote).join(" ")} `;
  return needle.trim().length > 0 && ` ${words(transcript).join(" ")} `.includes(needle);
}

// ---------------------------------------------------------------------------
// State: which videos were handled, and since when the job is responsible.

interface VideoState {
  status: "pending" | "published" | "failed";
  attempts: number;
  slug?: string;
  lastError?: string;
  updatedAt: string;
}

interface State {
  /** Only videos uploaded after this are written up automatically. */
  since: string;
  videos: Record<string, VideoState>;
}

// ---------------------------------------------------------------------------
// YouTube

interface FeedVideo {
  id: string;
  title: string;
  published: string;
}

/** The channel feed fails intermittently (404/500), so retry a few times. */
async function fetchFeed(): Promise<FeedVideo[]> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const response = await fetch(CHANNEL_FEED).catch(() => null);
    if (response?.ok) {
      const xml = await response.text();
      return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => ({
        id: entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "",
        title: (entry.match(/<title>([^<]+)<\/title>/)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
        published: entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "",
      }));
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  throw new Error("YouTube channel feed unavailable after 6 attempts");
}

interface VideoInfo {
  title: string;
  description: string;
  uploadDate: string;
  durationSeconds: number;
}

/** Port of the Journal's scripts/clean_youtube_vtt.py: rolling auto-captions to plain text. */
function cleanVtt(source: string): string {
  const transcript: string[] = [];
  for (const block of source.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/);
    const timestamp = lines.findIndex((line) => line.includes("-->"));
    if (timestamp === -1) continue;
    const cue = lines
      .slice(timestamp + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');
    const tokens = cue.split(/\s+/).filter(Boolean);
    let overlap = 0;
    for (let size = Math.min(transcript.length, tokens.length); size > 0; size--) {
      if (transcript.slice(-size).join(" ") === tokens.slice(0, size).join(" ")) {
        overlap = size;
        break;
      }
    }
    transcript.push(...tokens.slice(overlap));
  }
  return transcript.join(" ").replace(/\s+([,.?!:;])/g, "$1").replace(/\s+/g, " ").trim();
}

async function downloadCaptions(videoId: string): Promise<{ transcript: string; info: VideoInfo }> {
  const dir = path.join(WORK_DIR, "captions");
  await mkdir(dir, { recursive: true });
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const template = path.join(dir, "%(id)s.%(ext)s");

  // Sean's own English track first; YouTube rate-limits extra (translated) tracks.
  for (const language of ["en-orig", "en"]) {
    const file = path.join(dir, `${videoId}.${language}.vtt`);
    if (!existsSync(file)) {
      try {
        run(
          PYTHON,
          ["-m", "yt_dlp", "--skip-download", "--write-auto-subs", "--write-subs", "--sub-langs", language,
            "--sub-format", "vtt", "--write-info-json", "--no-warnings", "-o", template, url],
          process.cwd(),
        );
      } catch (error) {
        await log(`  captions (${language}) not downloaded: ${(error as Error).message.split("\n").pop()}`);
      }
    }
    if (existsSync(file)) {
      const raw = JSON.parse(await readFile(path.join(dir, `${videoId}.info.json`), "utf8")) as {
        title: string;
        description?: string;
        upload_date: string;
        duration: number;
      };
      return {
        transcript: cleanVtt(await readFile(file, "utf8")),
        info: {
          title: raw.title,
          description: raw.description ?? "",
          uploadDate: `${raw.upload_date.slice(0, 4)}-${raw.upload_date.slice(4, 6)}-${raw.upload_date.slice(6, 8)}`,
          durationSeconds: raw.duration,
        },
      };
    }
  }
  throw new Error("no English captions yet (YouTube may still be generating them)");
}

// ---------------------------------------------------------------------------
// Writing the article

/** A Journal article in the Ask Sean format, keys in the order the Journal's files use. */
interface JournalArticle {
  slug: string;
  series: "iherng-podcast";
  episode: number;
  title: string;
  shortTitle: string;
  tag: string;
  date: string;
  videoId: string;
  videoTitle: string;
  duration: string;
  excerpt: string;
  qa: {
    kind: "question" | "problem";
    asker: string;
    context: string;
    question: string;
    quote: string;
    answer: string;
    reasons: { title: string; body: string }[];
    actions: string[];
    caveat: string;
  };
  sourceNote: string;
  sources: { label: string; url: string }[];
  location: string;
}

type Draft = Pick<JournalArticle, "slug" | "title" | "shortTitle" | "tag" | "location" | "excerpt" | "qa">;

const WRITER_PROMPT = `You write articles for the iherng Journal, an independent editorial companion to Sean Tan's (YouTube: iherng) Malaysian property channel. Each "Asking Sean" episode becomes one article in the Journal's Ask Sean format: the viewer's situation and question, Sean's answer, why, what to do, and when it doesn't apply.

You get the episode's auto-generated English captions (no punctuation, occasional mis-heard words) and its description. Use ONLY what is said in this episode. Never add outside facts, current rates or your own advice. Keep figures exactly as Sean or the viewer stated them. Use British spelling. Write in English.

Reply with JSON only, in this shape:
{
  "slug": "kebab-case-topic-not-the-viewer, max 6 words",
  "title": "The viewer's dilemma as a short question, max 70 characters",
  "shortTitle": "max 30 characters",
  "tag": "Topic label, e.g. \\"Family & life stage\\", \\"Affordability\\", \\"Delayed projects\\"",
  "location": "Who or where it is about, e.g. \\"Young families\\", \\"First-time buyers\\", or a named area",
  "excerpt": "1-2 sentences, max 220 characters: the situation, then what Sean explains",
  "qa": {
    "kind": "question if a viewer wrote in, otherwise problem",
    "asker": "e.g. \\"JC, a viewer who wrote in by email\\"; empty string if no viewer",
    "context": "2-4 sentences of the viewer's facts as stated: age, income, savings, the property, prices",
    "question": "The viewer's question in one sentence",
    "quote": "Sean's most direct answer, 5-25 words, copied WORD FOR WORD from the captions (you may add punctuation and capitals, nothing else)",
    "answer": "1-3 sentences: Sean's verdict, stated directly",
    "reasons": [{"title": "short claim, max 8 words", "body": "1-3 sentences with the figures as stated"}],
    "actions": ["imperative sentence"],
    "caveat": "1-2 sentences: when Sean's answer does not apply"
  }
}

Exactly 4 reasons and exactly 5 actions. Match the tone of the two example articles that follow: plain, specific, no hype.`;

async function writerExamples(journalDir: string): Promise<string> {
  const examples: string[] = [];
  for (const slug of ["new-baby-investment-strategy", "cancelled-booking-fomo"]) {
    const article = JSON.parse(
      await readFile(path.join(journalDir, "content", "articles", `${slug}.json`), "utf8"),
    ) as JournalArticle;
    const { title, shortTitle, tag, location, excerpt, qa } = article;
    examples.push(JSON.stringify({ slug, title, shortTitle, tag, location, excerpt, qa }, null, 1));
  }
  return examples.map((example, index) => `EXAMPLE ARTICLE ${index + 1}\n${example}`).join("\n\n");
}

function problemsWith(draft: Draft, transcript: string): string[] {
  const problems: string[] = [];
  const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  for (const key of ["slug", "title", "shortTitle", "tag", "location", "excerpt"] as const) {
    if (!text(draft[key])) problems.push(`"${key}" is missing`);
  }
  const qa = draft.qa;
  if (!qa) return [...problems, `"qa" is missing`];
  for (const key of ["context", "question", "quote", "answer", "caveat"] as const) {
    if (!text(qa[key])) problems.push(`"qa.${key}" is missing`);
  }
  if (qa.kind !== "question" && qa.kind !== "problem") problems.push(`"qa.kind" must be "question" or "problem"`);
  if (!Array.isArray(qa.reasons) || qa.reasons.length !== 4 || !qa.reasons.every((r) => text(r?.title) && text(r?.body))) {
    problems.push("there must be exactly 4 reasons, each with a title and body");
  }
  if (!Array.isArray(qa.actions) || qa.actions.length !== 5 || !qa.actions.every(text)) {
    problems.push("there must be exactly 5 actions");
  }
  if (text(draft.slug) && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)) problems.push(`slug "${draft.slug}" is not kebab-case`);
  if (text(draft.title) && draft.title.length > 90) problems.push("title is longer than 90 characters");
  if (text(qa.quote)) {
    const quoteWords = words(qa.quote).length;
    if (quoteWords < 3 || quoteWords > 40) problems.push(`quote has ${quoteWords} words; keep it to 5-25`);
    if (!isVerbatim(qa.quote, transcript)) {
      problems.push(`quote "${qa.quote}" does not appear word for word in the captions; copy Sean's exact words`);
    }
  }
  if (/[㐀-鿿]/.test(JSON.stringify(draft))) problems.push("the article must be in English");
  return problems;
}

async function writeArticle(
  video: FeedVideo,
  episode: number,
  transcript: string,
  info: VideoInfo,
  journalDir: string,
): Promise<{ draft: Draft; usage: Usage }> {
  const system = `${WRITER_PROMPT}\n\n${await writerExamples(journalDir)}`;
  const source = [
    `EPISODE: Asking Sean #${episode}, uploaded ${info.uploadDate}`,
    `VIDEO TITLE: ${info.title}`,
    `DESCRIPTION:\n${info.description.slice(0, 3000)}`,
    `CAPTIONS:\n${transcript}`,
  ].join("\n\n");

  let usage = NO_USAGE;
  let feedback = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await chat({
      system,
      user: feedback ? `${source}\n\nYOUR PREVIOUS DRAFT HAD THESE PROBLEMS, FIX THEM:\n${feedback}` : source,
      maxTokens: 16000,
      json: true,
      thinking: true,
    });
    usage = addUsage(usage, result.usage);
    let draft: Draft;
    try {
      draft = JSON.parse(result.content) as Draft;
    } catch {
      feedback = "- the reply was not valid JSON";
      continue;
    }
    const problems = problemsWith(draft, transcript);
    if (problems.length === 0) return { draft, usage };
    feedback = problems.map((problem) => `- ${problem}`).join("\n");
    await log(`  draft ${attempt} rejected:\n${feedback}`);
  }
  throw new Error(`draft failed checks twice:\n${feedback}`);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

function toArticle(draft: Draft, video: FeedVideo, episode: number, info: VideoInfo, slug: string): JournalArticle {
  const date = new Date(`${info.uploadDate}T12:00:00Z`);
  const monthYear = date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const fullDate = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const url = `https://www.youtube.com/watch?v=${video.id}`;
  return {
    slug,
    series: "iherng-podcast",
    episode,
    title: draft.title.trim(),
    shortTitle: draft.shortTitle.trim(),
    tag: draft.tag.trim(),
    date: info.uploadDate,
    videoId: video.id,
    videoTitle: info.title,
    duration: formatDuration(info.durationSeconds),
    excerpt: draft.excerpt.trim(),
    qa: {
      kind: draft.qa.kind,
      // The page prints "From " before the asker.
      asker: draft.qa.asker.trim().replace(/^from\s+/i, ""),
      context: draft.qa.context.trim(),
      question: draft.qa.question.trim(),
      quote: draft.qa.quote.trim().replace(/^["“]|["”]$/g, ""),
      answer: draft.qa.answer.trim(),
      reasons: draft.qa.reasons.map(({ title, body }) => ({ title: title.trim(), body: body.trim() })),
      actions: draft.qa.actions.map((action) => action.trim()),
      caveat: draft.qa.caveat.trim(),
    },
    sourceNote: `Summarised from Sean's full English captions for Asking Sean #${episode}. The quoted answer is verbatim; everything else is paraphrased. Figures are as stated in ${monthYear}.`,
    sources: [{ label: `Original video and English captions · ${fullDate}`, url }],
    location: draft.location.trim(),
  };
}

// ---------------------------------------------------------------------------
// Journal changes

function variableName(slug: string, taken: string): string {
  let name = slug.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
  if (/^[0-9]/.test(name)) name = `ep${name}`;
  while (new RegExp(`\\b${name}\\b`).test(taken)) name += "Ep";
  return name;
}

/** Register the article in lib/articles.ts, newest podcast episode first. */
async function register(journalDir: string, slug: string): Promise<void> {
  const file = path.join(journalDir, "lib", "articles.ts");
  const source = await readFile(file, "utf8");
  const importAnchor = "import seriesData from '@/content/series.json';";
  const listAnchor = "// iherng Podcast, newest episode first";
  if (!source.includes(importAnchor) || !source.includes(listAnchor)) {
    throw new Error("lib/articles.ts no longer has the expected layout; not registering automatically");
  }
  const name = variableName(slug, source);
  const listLine = source.split("\n").find((line) => line.includes(listAnchor))!;
  const indent = listLine.match(/^\s*/)?.[0] ?? "  ";
  const updated = source
    .replace(importAnchor, `import ${name} from '@/content/articles/${slug}.json';\n${importAnchor}`)
    .replace(listLine, `${listLine}\n${indent}${name},`);
  await writeFile(file, updated, "utf8");
}

async function journalState(journalDir: string) {
  const files = (await readdir(path.join(journalDir, "content", "articles"))).filter((file) => file.endsWith(".json"));
  const videoIds = new Set<string>();
  const slugs = new Set<string>();
  for (const file of files) {
    const article = JSON.parse(await readFile(path.join(journalDir, "content", "articles", file), "utf8")) as {
      slug: string;
      videoId?: string;
    };
    slugs.add(article.slug);
    if (article.videoId) videoIds.add(article.videoId);
  }
  return { videoIds, slugs };
}

async function publish(journalDir: string, article: JournalArticle): Promise<void> {
  const articleFile = path.join(journalDir, "content", "articles", `${article.slug}.json`);
  await writeFile(articleFile, JSON.stringify(article, null, 2) + "\n", "utf8");
  try {
    await register(journalDir, article.slug);
    run(NPX, ["tsc", "--noEmit"], journalDir);
    run(NPM, ["run", "build"], journalDir);
  } catch (error) {
    // Put the Journal back exactly as it was.
    await rm(articleFile, { force: true });
    run("git", ["checkout", "--", "lib/articles.ts"], journalDir);
    throw error;
  }

  const message = path.join(WORK_DIR, "commit-message.txt");
  await writeFile(
    message,
    `Add Asking Sean #${article.episode}: ${article.title}\n\n` +
      "Written automatically from the episode's English captions by asking-iherng's\n" +
      "scripts/auto-journal.ts. Sean's quoted answer was checked word for word against\n" +
      "the captions; everything else is paraphrased.\n",
    "utf8",
  );
  run("git", ["add", `content/articles/${article.slug}.json`, "lib/articles.ts"], journalDir);
  run("git", ["commit", "-q", "-F", message], journalDir);
  run("git", ["push", "-q", "origin", "main"], journalDir);
  run(NPX, ["wrangler", "pages", "deploy", "dist/client", "--project-name", PAGES_PROJECT, "--branch", "main"], journalDir);
}

// ---------------------------------------------------------------------------

async function main() {
  loadEnv();
  const journalDir = path.resolve(requireEnv("JOURNAL_DIR"));
  const dryRun = process.argv.includes("--dry-run");
  const forced = process.argv.includes("--video") ? process.argv[process.argv.indexOf("--video") + 1] : undefined;

  let state = await readJsonIfExists<State>(STATE_PATH);
  if (!state) {
    state = { since: new Date().toISOString(), videos: {} };
    await writeJson(STATE_PATH, state);
    await log(`First run: from now on, Asking Sean videos uploaded after ${state.since} will be published.`);
    if (!forced) return;
  }

  if (!dryRun) {
    // Never mix automatic commits with someone's work in progress.
    const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], journalDir).trim();
    const dirty = run("git", ["status", "--porcelain"], journalDir).trim();
    if (branch !== "main" || dirty) {
      await log(`Skipped: the Journal is on "${branch}"${dirty ? " with uncommitted changes" : ""}. Commit or stash first.`);
      return;
    }
    run("git", ["pull", "-q", "--ff-only", "origin", "main"], journalDir);
  }

  const feed = await fetchFeed();
  const { videoIds, slugs } = await journalState(journalDir);
  const candidates = feed.filter((video) => {
    if (forced) return video.id === forced;
    const record = state.videos[video.id];
    return (
      /ASKING SEAN #\d+/i.test(video.title) &&
      !videoIds.has(video.id) &&
      video.published > state.since &&
      record?.status !== "published" &&
      record?.status !== "failed"
    );
  });
  if (forced && candidates.length === 0) candidates.push({ id: forced, title: "", published: "" });
  if (candidates.length === 0) {
    await log("No new Asking Sean episodes.");
    return;
  }

  let published = 0;
  for (const video of candidates.slice(0, MAX_PER_RUN)) {
    const record = state.videos[video.id] ?? { status: "pending", attempts: 0, updatedAt: "" };
    await log(`Working on ${video.id} "${video.title}" (attempt ${record.attempts + 1})`);
    try {
      const { transcript, info } = await downloadCaptions(video.id);
      const episode = Number(info.title.match(/ASKING SEAN #(\d+)/i)?.[1] ?? NaN);
      if (!Number.isFinite(episode)) throw new Error(`no episode number in "${info.title}"`);
      if (words(transcript).length < MIN_TRANSCRIPT_WORDS) {
        throw new Error(`captions are only ${words(transcript).length} words; too short to summarise`);
      }

      const { draft, usage } = await writeArticle(video, episode, transcript, info, journalDir);
      const slug = slugs.has(draft.slug) ? `${draft.slug}-${episode}` : draft.slug;
      const article = toArticle(draft, video, episode, info, slug);
      await log(`  draft passed checks: "${article.title}" (DeepSeek ≈ $${usage.costUsd.toFixed(4)})`);

      if (dryRun) {
        const file = path.join(WORK_DIR, "drafts", `${video.id}.json`);
        await writeJson(file, article);
        await log(`  dry run: draft saved to ${file}`);
        continue;
      }

      await publish(journalDir, article);
      state.videos[video.id] = { status: "published", attempts: record.attempts + 1, slug, updatedAt: new Date().toISOString() };
      published++;
      await log(`  published /articles/${slug}`);
    } catch (error) {
      const attempts = record.attempts + 1;
      const message = (error as Error).message;
      state.videos[video.id] = {
        status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        attempts,
        lastError: message.slice(0, 2000),
        updatedAt: new Date().toISOString(),
      };
      await log(`  not published (${attempts}/${MAX_ATTEMPTS}): ${message}`);
    }
    if (!dryRun) await writeJson(STATE_PATH, state);
  }

  if (published > 0) {
    // The chatbot's daily workflow would catch up anyway; this just makes it immediate.
    try {
      run("gh", ["workflow", "run", "update-knowledge.yml", "-R", CHATBOT_REPO], process.cwd());
      await log("Started the chatbot knowledge update on GitHub.");
    } catch (error) {
      await log(`Could not start the chatbot update (the daily run will pick it up): ${(error as Error).message}`);
    }
  }
}

main().catch(async (error) => {
  await log(`Job failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
