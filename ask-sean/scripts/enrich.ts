/**
 * Ask DeepSeek once per article for the words viewers use for its topic and the
 * questions it answers. The router reads these from the catalog, so synonym
 * handling is paid for once here instead of on every question.
 *
 * Only new or changed articles are sent; pass --force to regenerate everything.
 * Review the output in knowledge/enrich and set "reviewed": true when it looks right.
 */
import path from "node:path";
import { addUsage, chat, NO_USAGE } from "../lib/deepseek";
import { loadEnv } from "../lib/env";
import {
  ENRICH_DIR,
  MANIFEST_PATH,
  loadArticles,
  readJson,
  readJsonIfExists,
  writeJson,
} from "../lib/knowledge";
import type { Article, Enrichment, Manifest } from "../lib/types";

const SYSTEM = `You help build the search catalog for "Ask Sean", a Q&A bot that answers Malaysian property questions using iherng Journal articles (summaries of Sean Tan's YouTube videos).

Given one article, reply with JSON:
{"aliases": ["..."], "questions": ["..."]}

aliases: up to 12 short lowercase words or phrases Malaysian buyers use for things this article actually discusses, especially words that do not appear in the article itself. Map the article's terms to local usage: if it says "apartment", buyers may say "condo"; if it says "landed", they may say "terrace" or "rumah teres". Every alias must name something the article covers; do not add neighbouring topics it never discusses (other property types, loan products, purchase channels). No generic words such as "property", "house", "investment" or "buy".

questions: exactly 5 short, natural questions a viewer might type that this article genuinely answers. The article answers one viewer's case, so phrase the questions generally (not about that viewer). Skip questions the article only touches on. Do not mention specific projects or areas unless the article discusses them.`;

function articleText(article: Article): string {
  return [
    `Title: ${article.title}`,
    `Summary: ${article.excerpt}`,
    `Viewer's situation: ${article.question.context}`,
    `Viewer's question: ${article.question.text}`,
    `Sean's answer: ${article.answer.summary}`,
    `Why:\n${article.reasons.map((reason) => `- ${reason.title}: ${reason.body}`).join("\n")}`,
    `What to do:\n${article.actions.map((action) => `- ${action}`).join("\n")}`,
    article.caveat && `When this doesn't apply: ${article.caveat}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim());
}

async function main() {
  loadEnv();
  const force = process.argv.includes("--force");
  const manifest = await readJson<Manifest>(MANIFEST_PATH);
  let usage = NO_USAGE;
  let generated = 0;

  for (const article of await loadArticles()) {
    const file = path.join(ENRICH_DIR, `${article.id}.json`);
    const sourceHash = manifest.articles[article.id].hash;
    const existing = await readJsonIfExists<Enrichment>(file);
    if (!force && existing?.sourceHash === sourceHash) continue;

    const result = await chat({
      system: SYSTEM,
      user: articleText(article),
      maxTokens: 400,
      json: true,
      temperature: 0.3,
    });
    usage = addUsage(usage, result.usage);

    const parsed = JSON.parse(result.content) as { aliases?: unknown; questions?: unknown };
    const enrichment: Enrichment = {
      id: article.id,
      sourceHash,
      reviewed: false,
      aliases: [...new Set(stringList(parsed.aliases).map((alias) => alias.toLowerCase()))].filter(Boolean),
      questions: stringList(parsed.questions).filter(Boolean).slice(0, 5),
    };
    await writeJson(file, enrichment);
    generated++;

    const note = existing?.reviewed ? " (was reviewed; article changed, please re-check)" : "";
    console.log(`  ${article.id}: ${enrichment.aliases.length} aliases, ${enrichment.questions.length} questions${note}`);
  }

  console.log(
    generated
      ? `Enriched ${generated} articles. Tokens: ${usage.cacheMiss + usage.cacheHit} in, ${usage.output} out. Cost ≈ $${usage.costUsd.toFixed(5)}`
      : "All enrichments are up to date.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
