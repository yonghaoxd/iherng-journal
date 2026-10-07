/** Ask one question from the command line: npm run ask -- "Should I buy a condo or landed?" */
import { sourceLabel } from "../lib/answer";
import { ask } from "../lib/ask";
import type { Usage } from "../lib/deepseek";
import { loadEnv } from "../lib/env";
import { loadKnowledge } from "../lib/knowledge";
import type { Article } from "../lib/types";

function describe(article: Article): string {
  return `${article.title} (${sourceLabel(article)}, ${article.date}, ${article.basis})`;
}

function describeUsage(usage: Usage): string {
  const input = usage.cacheHit + usage.cacheMiss;
  return `Tokens: ${input} in (${usage.cacheHit} cached), ${usage.output} out · cost ≈ $${usage.costUsd.toFixed(6)}`;
}

async function main() {
  loadEnv();
  const question = process.argv.slice(2).join(" ");
  if (!question) {
    console.error('Usage: npm run ask -- "your question"');
    process.exit(1);
  }

  const result = await ask(question, await loadKnowledge());
  if (result.status === "rejected") {
    console.log(result.reason);
    return;
  }

  if (result.status === "out_of_scope") {
    console.log(result.message);
  } else {
    console.log(`TL;DR: ${result.tldr}\n\n${result.body}\n\nSources:`);
    for (const { marker, article } of result.citations) {
      console.log(`  [${marker}] ${describe(article)}`);
      console.log(`       ${article.articleUrl}\n       ${article.video.url}`);
    }
    if (result.truncated) console.log("\n(warning: answer was cut off at the token limit)");
  }
  if (result.related.length) {
    console.log(`\nRelated reads:\n${result.related.map((article) => `  - ${describe(article)}`).join("\n")}`);
  }
  console.log(`\n${describeUsage(result.usage)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
