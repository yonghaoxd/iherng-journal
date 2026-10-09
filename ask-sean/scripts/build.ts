/**
 * Combine articles and their enrichments into knowledge/catalog.json, the compact
 * index the router reads. Entries are sorted and carry no timestamps so the router
 * prompt stays byte-identical between builds and keeps hitting DeepSeek's cache.
 */
import path from "node:path";
import { loadEnv } from "../lib/env";
import {
  BUNDLE_PATH,
  CATALOG_PATH,
  ENRICH_DIR,
  MANIFEST_PATH,
  hashOf,
  loadArticles,
  readJson,
  readJsonIfExists,
  writeJson,
} from "../lib/knowledge";
import { buildRouterPrompt } from "../lib/router";
import type { Catalog, CatalogEntry, Enrichment, KnowledgeBundle, Manifest } from "../lib/types";

async function main() {
  loadEnv();
  const manifest = await readJson<Manifest>(MANIFEST_PATH);
  const missing: string[] = [];
  const stale: string[] = [];
  const unreviewed: string[] = [];
  const entries: CatalogEntry[] = [];

  const articles = await loadArticles();
  for (const article of articles) {
    const enrichment = await readJsonIfExists<Enrichment>(path.join(ENRICH_DIR, `${article.id}.json`));
    if (!enrichment) missing.push(article.id);
    else if (enrichment.sourceHash !== manifest.articles[article.id].hash) stale.push(article.id);
    else if (!enrichment.reviewed) unreviewed.push(article.id);

    entries.push({
      id: article.id,
      title: article.title,
      date: article.date,
      series: article.series,
      askingSeanEpisode: article.askingSeanEpisode,
      tag: article.tag,
      excerpt: article.excerpt,
      viewerQuestion: article.question.text,
      answer: article.answer.summary,
      points: article.reasons.map((reason) => reason.title),
      aliases: enrichment?.aliases ?? [],
      questions: enrichment?.questions ?? [],
    });
  }

  const version = hashOf({ entries, articles: manifest.articles });
  const catalog: Catalog = { version, articles: entries };
  await writeJson(CATALOG_PATH, catalog);
  // One file holding everything the deployed Worker needs, since it cannot read the disk.
  await writeJson(BUNDLE_PATH, { catalog, articles } satisfies KnowledgeBundle);

  // ~4 characters per token is close enough for English prose.
  const promptTokens = Math.round(buildRouterPrompt(catalog).length / 4);
  console.log(`Catalog ${version}: ${entries.length} articles, router prompt ≈ ${promptTokens} tokens`);
  if (missing.length) console.warn(`  no enrichment yet (run npm run kb:enrich): ${missing.join(", ")}`);
  if (stale.length) console.warn(`  enrichment out of date (run npm run kb:enrich): ${stale.join(", ")}`);
  if (unreviewed.length) console.warn(`  not reviewed yet: ${unreviewed.length} of ${entries.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
