/**
 * Run every question in evals/route.jsonl through the router and report accuracy
 * and cost. A case passes when the top answer article is one of `expect`, or,
 * when `expect` is empty, when the router returns no answer article.
 *
 * Questions run one at a time so the shared router prompt gets cached after the
 * first couple of calls, as it would in production.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { addUsage, NO_USAGE } from "../lib/deepseek";
import { loadEnv } from "../lib/env";
import { loadCatalog } from "../lib/knowledge";
import { route, type FollowUp, type RouteResult } from "../lib/router";

interface EvalCase {
  q: string;
  expect: string[];
  followUp?: FollowUp;
  note?: string;
}

interface Outcome {
  case: EvalCase;
  answer: string[];
  related: string[];
  pass: boolean;
  error?: string;
}

async function loadCases(): Promise<EvalCase[]> {
  const text = await readFile("evals/route.jsonl", "utf8");
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as EvalCase);
}

function passes(testCase: EvalCase, result: Pick<RouteResult, "answer">): boolean {
  if (testCase.expect.length === 0) return result.answer.length === 0;
  return testCase.expect.includes(result.answer[0]);
}

async function main() {
  loadEnv();
  const catalog = await loadCatalog();
  const cases = await loadCases();

  const known = new Set(catalog.articles.map((entry) => entry.id));
  const typos = cases.flatMap((testCase) => testCase.expect.filter((id) => !known.has(id)));
  if (typos.length) throw new Error(`Unknown article ids in evals/route.jsonl: ${typos.join(", ")}`);

  let usage = NO_USAGE;
  const outcomes: Outcome[] = [];
  for (const testCase of cases) {
    try {
      const result = await route(testCase.q, catalog, testCase.followUp);
      usage = addUsage(usage, result.usage);
      const pass = passes(testCase, result);
      outcomes.push({ case: testCase, answer: result.answer, related: result.related, pass });
      const expected = testCase.expect.length ? testCase.expect.join(" | ") : "(out of scope)";
      console.log(`${pass ? "PASS" : "FAIL"}  ${testCase.q}`);
      if (!pass) console.log(`      got [${result.answer.join(", ")}], expected ${expected}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outcomes.push({ case: testCase, answer: [], related: [], pass: false, error: message });
      console.log(`ERROR ${testCase.q}\n      ${message}`);
    }
  }

  const inScope = outcomes.filter((outcome) => outcome.case.expect.length > 0);
  const outOfScope = outcomes.filter((outcome) => outcome.case.expect.length === 0);
  const count = (list: Outcome[]) => `${list.filter((outcome) => outcome.pass).length}/${list.length}`;
  const wrongRefusals = inScope.filter((outcome) => !outcome.error && outcome.answer.length === 0).length;
  const inputTokens = usage.cacheHit + usage.cacheMiss;

  console.log("\nSummary");
  console.log(`  overall: ${count(outcomes)}`);
  console.log(`  in scope (top article correct): ${count(inScope)}, wrongly refused: ${wrongRefusals}`);
  console.log(`  out of scope (correctly refused): ${count(outOfScope)}`);
  console.log(
    `  tokens: ${inputTokens} in (${Math.round((usage.cacheHit / Math.max(1, inputTokens)) * 100)}% cached), ${usage.output} out`,
  );
  console.log(
    `  cost: $${usage.costUsd.toFixed(5)} total, $${(usage.costUsd / Math.max(1, outcomes.length)).toFixed(6)} per question`,
  );

  await mkdir("evals/results", { recursive: true });
  const file = `evals/results/route-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(file, JSON.stringify({ catalog: catalog.version, usage, outcomes }, null, 2) + "\n");
  console.log(`  details: ${file}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
