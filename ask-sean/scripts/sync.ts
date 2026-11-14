/**
 * Read the Buyer Guides and iherng Podcast articles from the Journal's own content
 * files (../content/articles/*.json) into knowledge/articles, and record a content
 * hash per article so the enrich step only spends tokens on articles that changed.
 *
 * The Journal no longer publishes these two series as web pages: their content
 * lives only as data, and AIherng is how readers reach it. So the repository, not
 * the live site, is the source of truth. A content file missing a field the
 * chatbot needs fails the sync rather than silently dropping content.
 */
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "../lib/env";
import {
  ARTICLES_DIR,
  MANIFEST_PATH,
  hashOf,
  listJsonIds,
  readJsonIfExists,
  writeJson,
} from "../lib/knowledge";
import type { Article, Basis, Manifest, Series } from "../lib/types";

const SERIES: readonly Series[] = ["buyer-guides", "iherng-podcast"];

/** The shape of a Q&A article in the Journal's content/articles folder. */
interface ContentArticle {
  slug: string;
  series: string;
  title: string;
  tag: string;
  date: string;
  videoId: string;
  videoTitle: string;
  duration: string;
  excerpt: string;
  sourceNote: string;
  qa?: {
    asker?: string;
    context: string;
    question: string;
    quote: string;
    answer: string;
    answeredBy?: { name: string; role: string };
    reasons: { title: string; body: string }[];
    actions: string[];
    caveat?: string;
  };
}

/** Collapse whitespace the way a rendered page would. */
function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function required(value: string | undefined, field: string, file: string): string {
  const text = clean(value);
  if (!text) throw new Error(`${file}: missing "${field}".`);
  return text;
}

function detectBasis(sourceNote: string): Basis {
  if (/captions were unavailable|episode notes only/i.test(sourceNote)) return "episode-notes";
  if (/captions/i.test(sourceNote)) return "captions";
  return "sean-guide";
}

function toArticle(content: ContentArticle, file: string, siteUrl: string): Article {
  const qa = content.qa;
  if (!qa) throw new Error(`${file}: no "qa" block.`);
  if (!qa.reasons?.length) throw new Error(`${file}: no reasons found.`);
  const episode = content.videoTitle.match(/ASKING SEAN #(\d+)/i);
  const sourceNote = required(content.sourceNote, "sourceNote", file);
  const by = qa.answeredBy?.name ? { by: { name: clean(qa.answeredBy.name), role: clean(qa.answeredBy.role) } } : {};
  const asker = clean(qa.asker);

  // Key order is fixed: the hash in knowledge/manifest.json depends on it.
  return {
    id: content.slug,
    series: content.series as Series,
    title: required(content.title, "title", file),
    excerpt: clean(content.excerpt),
    date: content.date,
    tag: clean(content.tag),
    question: {
      asker: asker ? `From ${asker}` : "",
      context: required(qa.context, "qa.context", file),
      text: required(qa.question, "qa.question", file),
    },
    answer: {
      ...by,
      quote: required(qa.quote, "qa.quote", file).replace(/^[“"]\s*|\s*[”"]$/g, ""),
      summary: required(qa.answer, "qa.answer", file),
    },
    reasons: qa.reasons.map((reason) => ({ title: clean(reason.title), body: clean(reason.body) })),
    actions: qa.actions.map(clean),
    caveat: clean(qa.caveat),
    basis: detectBasis(sourceNote),
    sourceNote,
    askingSeanEpisode: episode ? Number(episode[1]) : null,
    video: {
      id: content.videoId,
      title: content.videoTitle,
      duration: content.duration,
      url: `https://www.youtube.com/watch?v=${content.videoId}`,
    },
    // Kept as the article's stable identifier; the page itself now redirects to AIherng.
    articleUrl: `${siteUrl}/articles/${content.slug}`,
  };
}

async function main() {
  loadEnv();
  const siteUrl = (process.env.JOURNAL_SITE_URL ?? "https://iherng-journal.pages.dev").replace(/\/+$/, "");
  const contentDir = path.resolve(process.env.JOURNAL_DIR ?? "..", "content", "articles");
  const files = (await readdir(contentDir)).filter((file) => file.endsWith(".json")).sort();

  const previous = (await readJsonIfExists<Manifest>(MANIFEST_PATH))?.articles ?? {};
  const hashes: Manifest["articles"] = {};
  const added: string[] = [];
  const changed: string[] = [];

  for (const file of files) {
    const content = JSON.parse(await readFile(path.join(contentDir, file), "utf8")) as ContentArticle;
    if (!SERIES.includes(content.series as Series)) continue;

    const article = toArticle(content, file, siteUrl);
    const hash = hashOf(article);
    hashes[article.id] = { hash };
    if (!previous[article.id]) added.push(article.id);
    else if (previous[article.id].hash !== hash) changed.push(article.id);
    await writeJson(path.join(ARTICLES_DIR, `${article.id}.json`), article);
  }

  const removed: string[] = [];
  for (const id of await listJsonIds(ARTICLES_DIR)) {
    if (hashes[id]) continue;
    await rm(path.join(ARTICLES_DIR, `${id}.json`));
    removed.push(id);
  }

  await writeJson(MANIFEST_PATH, { articles: hashes } satisfies Manifest);

  console.log(`Synced ${Object.keys(hashes).length} articles from ${contentDir}`);
  console.log(`  added: ${added.length ? added.join(", ") : "none"}`);
  console.log(`  changed: ${changed.length ? changed.join(", ") : "none"}`);
  console.log(`  removed: ${removed.length ? removed.join(", ") : "none"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
