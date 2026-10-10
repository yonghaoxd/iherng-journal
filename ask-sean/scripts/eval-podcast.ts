/**
 * Ask AIherng the questions real Asking Sean viewers sent in, with their situation,
 * and write each answer next to what Sean actually told them, so a reader can judge
 * whether the bot gets close to the episode: the same verdict, his reasoning with the
 * viewer's own numbers, and the same next steps.
 *
 *   npx tsx scripts/eval-podcast.ts            runs the pipeline locally (needs DEEPSEEK_API_KEY)
 *   npx tsx scripts/eval-podcast.ts --live     asks the deployed Worker instead
 *   ... --live --api=<preview url>            asks an uploaded, undeployed version
 *
 * Every case includes a situation, so on the live Worker the answers are private:
 * nothing is stored or shown in the public feed, only the cost is logged.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ask } from "../lib/ask";
import { loadEnv } from "../lib/env";
import { loadKnowledge } from "../lib/knowledge";

interface Case {
  /** The Journal article for the episode the question comes from; absent for made-up questions. */
  id?: string;
  q: string;
  situation: string;
}

interface BotAnswer {
  status: string;
  tldr: string;
  body: string;
  sources: string[];
}

const LIVE_API =
  process.argv.find((arg) => arg.startsWith("--api="))?.slice(6) ?? "https://ask-sean-api.yonghaomah.workers.dev";
const ARTICLES = path.resolve("..", "content", "articles");

async function askLive(testCase: Case): Promise<BotAnswer> {
  const response = await fetch(`${LIVE_API}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: testCase.q, situation: { current: testCase.situation } }),
  });
  const data = (await response.json()) as {
    error?: string;
    status?: string;
    tldr?: string | null;
    body?: string | null;
    message?: string | null;
    sources?: { id: string }[];
  };
  if (!response.ok) return { status: `error ${response.status}`, tldr: "", body: data.error ?? "", sources: [] };
  return {
    status: data.status ?? "?",
    tldr: data.tldr ?? "",
    body: data.body ?? data.message ?? "",
    sources: (data.sources ?? []).map((source) => source.id),
  };
}

async function main() {
  const live = process.argv.includes("--live");
  const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice(7);
  if (!live) loadEnv();
  const knowledge = live ? null : await loadKnowledge();
  const cases = (await readFile("evals/podcast.jsonl", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Case)
    .filter((testCase) => !only || (testCase.id !== undefined && only.split(",").includes(testCase.id)));

  const sections: string[] = [];
  for (const testCase of cases) {
    let bot: BotAnswer;
    if (live) {
      bot = await askLive(testCase);
    } else {
      const result = await ask(testCase.q, knowledge!, undefined, { current: testCase.situation });
      bot =
        result.status === "answered"
          ? { status: "answered", tldr: result.tldr, body: result.body, sources: result.citations.map((c) => c.article.id) }
          : { status: result.status, tldr: "", body: "message" in result ? result.message : result.reason, sources: [] };
    }
    if (!testCase.id) {
      console.log(`NEW   ${testCase.q} → ${bot.sources.join(", ") || bot.status}`);
      sections.push(
        [
          `## ${testCase.q}`,
          `**Situation:** ${testCase.situation}`,
          "",
          `### AIherng (${bot.status}; sources: ${bot.sources.join(", ") || "none"})`,
          bot.tldr ? `**TL;DR:** ${bot.tldr}\n` : "",
          bot.body,
        ].join("\n"),
      );
      continue;
    }
    const sean = JSON.parse(await readFile(path.join(ARTICLES, `${testCase.id}.json`), "utf8"));
    const qa = sean.qa;
    const routedRight = bot.sources.includes(testCase.id);
    console.log(`${routedRight ? "OK  " : "MISS"}  #${sean.episode} ${testCase.id} → ${bot.sources.join(", ") || bot.status}`);

    sections.push(
      [
        `## #${sean.episode} ${sean.title}`,
        `**Question:** ${testCase.q}`,
        `**Situation:** ${testCase.situation}`,
        "",
        `### AIherng (${bot.status}; sources: ${bot.sources.join(", ") || "none"}${routedRight ? "" : " — NOT the episode's article"})`,
        bot.tldr ? `**TL;DR:** ${bot.tldr}\n` : "",
        bot.body,
        "",
        `### What Sean said`,
        `> ${qa.quote}`,
        "",
        qa.answer,
        "",
        ...qa.reasons.map((reason: { title: string; body: string }) => `- **${reason.title}.** ${reason.body}`),
        "",
        "**What to do:**",
        ...qa.actions.map((action: string, index: number) => `${index + 1}. ${action}`),
      ].join("\n"),
    );
  }

  await mkdir("evals/results", { recursive: true });
  const file = `evals/results/podcast-${live ? "live" : "local"}-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
  await writeFile(file, `# AIherng vs Sean (${live ? "live Worker" : "local"})\n\n${sections.join("\n\n---\n\n")}\n`);
  console.log(`\nReport: ${file}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
