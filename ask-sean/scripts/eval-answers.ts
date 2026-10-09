/**
 * Run evals/answers.jsonl through the full pipeline, flag rule breaks that can be
 * checked mechanically, and write a Markdown report for a human to read.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { sourceLabel } from "../lib/answer";
import { ask, type AskResult } from "../lib/ask";
import { addUsage, NO_USAGE } from "../lib/deepseek";
import { loadEnv } from "../lib/env";
import { loadKnowledge } from "../lib/knowledge";
import type { FollowUp } from "../lib/router";

interface EvalCase {
  q: string;
  expect: "answered" | "out_of_scope";
  followUp?: FollowUp;
  note?: string;
}

const MARKER = /\[A\d+\]/;
const CJK = /[㐀-鿿]/g;
// Chinese characters plus English words, roughly the reading length of mixed text.
const MAX_BODY_LENGTH = 450;
const MAX_TLDR_LENGTH = 60;

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9%']+/g) ?? [];
}

function length(text: string): number {
  return (text.match(CJK) ?? []).length + words(text).length;
}

/**
 * Quoted passages that cannot be Sean's verbatim words: English runs of four or
 * more words missing from every cited quote, or Chinese passages of ten or more
 * characters (his quotes are English, so a long Chinese quote is a paraphrase).
 * Short quoted terms such as 「85% 法则」 are fine.
 */
function inventedQuotes(body: string, verbatim: string[]): string[] {
  const allowed = verbatim.map((quote) => ` ${words(quote).join(" ")} `);
  return [...body.matchAll(/[“"「]([^”"」]+)[”"」]/g)]
    .map((match) => match[1])
    .filter((quoted) => {
      if ((quoted.match(CJK) ?? []).length >= 10) return true;
      const quotedWords = words(quoted);
      if (quotedWords.length < 4) return false;
      return !allowed.some((quote) => quote.includes(` ${quotedWords.join(" ")} `));
    });
}

function problems(testCase: EvalCase, result: AskResult): string[] {
  if (result.status !== testCase.expect) return [`expected ${testCase.expect}, got ${result.status}`];
  if (result.status !== "answered") return [];

  const found: string[] = [];
  const tldrLength = length(result.tldr);
  if (result.missingTldr) found.push("no TL;DR line");
  else if (tldrLength > MAX_TLDR_LENGTH) found.push(`TL;DR length ${tldrLength} (aim ≤ ${MAX_TLDR_LENGTH})`);
  if (result.truncated) found.push("cut off at the token limit");
  if (result.citations.length === 0) found.push("no citations");
  const bodyLength = length(result.body.replace(/\[A\d+\]/g, ""));
  if (bodyLength > MAX_BODY_LENGTH) found.push(`length ${bodyLength} (aim ≤ ${MAX_BODY_LENGTH})`);
  if (!/^\s*1[.、)]/m.test(result.body)) found.push("no numbered action steps");
  const quotes = inventedQuotes(result.body, result.citations.map(({ article }) => article.answer.quote));
  if (quotes.length) found.push(`quotes words that are not Sean's verbatim: "${quotes[0].slice(0, 60)}"`);

  const paragraphs = result.body.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());
  const uncited = paragraphs.filter((paragraph) => !MARKER.test(paragraph)).length;
  if (uncited) found.push(`${uncited} paragraph(s) without a citation`);

  // Answers go straight to the solution; the source card shows the episode and its date.
  const background = result.body.match(
    /(19|20)\d{2}\s*年|节目|这一?集|那一?集|Asking Sean #|episode|一位.{0,15}(观众|买家|租房者|夫妇|读者)/i,
  );
  if (background) found.push(`mentions the episode or viewer ("${background[0]}")`);
  for (const { article } of result.citations) {
    const name = article.question.asker.split(/[\s,]/)[0].replace(/\.$/, "");
    if (name.length >= 2 && new RegExp(`(^|[^A-Za-z])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`).test(result.body)) {
      found.push(`names the viewer ("${name}")`);
    }
  }

  // Direct advice is wanted, but it must read as Sean's, not the bot's own.
  if (!/Sean/.test(`${result.tldr}\n${result.body}`)) found.push("advice not attributed to Sean");
  if ((result.body.match(CJK) ?? []).length < 50) found.push("not written in Chinese");
  return found;
}

function report(testCase: EvalCase, result: AskResult, issues: string[]): string {
  const lines = [`## ${issues.length ? "⚠" : "✓"} ${testCase.q}`];
  if (testCase.followUp) lines.push(`_Follow-up to: ${testCase.followUp.question}_`);
  if (testCase.note) lines.push(`_Note: ${testCase.note}_`);
  if (issues.length) lines.push(`**Issues:** ${issues.join("; ")}`);

  if (result.status === "rejected") {
    lines.push(`Rejected: ${result.reason}`);
  } else if (result.status === "out_of_scope") {
    lines.push(`**Out of scope.** ${result.message}`);
  } else {
    lines.push(`**TL;DR:** ${result.tldr}`, "", result.body, "", "**Sources:**");
    for (const { marker, article } of result.citations) {
      lines.push(`- [${marker}] ${article.title} (${sourceLabel(article)}, ${article.date}, ${article.basis})`);
    }
  }
  if (result.status !== "rejected") {
    if (result.related.length) lines.push(`**Related:** ${result.related.map((article) => article.id).join(", ")}`);
    lines.push(`_Cost ≈ $${result.usage.costUsd.toFixed(6)}, ${result.usage.output} output tokens_`);
  }
  return lines.join("\n");
}

async function main() {
  loadEnv();
  const knowledge = await loadKnowledge();
  const cases = (await readFile("evals/answers.jsonl", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as EvalCase);

  let usage = NO_USAGE;
  let flagged = 0;
  const sections: string[] = [];
  for (const testCase of cases) {
    const result = await ask(testCase.q, knowledge, testCase.followUp);
    if (result.status !== "rejected") usage = addUsage(usage, result.usage);
    const issues = problems(testCase, result);
    if (issues.length) flagged++;
    sections.push(report(testCase, result, issues));
    console.log(`${issues.length ? "FLAG" : "OK  "}  ${testCase.q}${issues.length ? `\n      ${issues.join("; ")}` : ""}`);
  }

  const summary = [
    `# Answer eval · catalog ${knowledge.catalog.version}`,
    "",
    `${cases.length - flagged}/${cases.length} passed the automatic checks.`,
    `Total cost ≈ $${usage.costUsd.toFixed(5)} · ${usage.output} output tokens · ${usage.cacheHit} of ${usage.cacheHit + usage.cacheMiss} input tokens cached.`,
    "",
    "Automatic checks cannot judge whether an answer is faithful to the article. Read each one.",
  ].join("\n");

  await mkdir("evals/results", { recursive: true });
  const file = `evals/results/answers-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
  await writeFile(file, [summary, ...sections].join("\n\n---\n\n") + "\n");
  console.log(`\n${cases.length - flagged}/${cases.length} passed automatic checks · cost ≈ $${usage.costUsd.toFixed(5)}`);
  console.log(`Report: ${file}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
