import { answer, type Citation } from "./answer";
import { addUsage, type Usage } from "./deepseek";
import { route, type FollowUp, type Situation } from "./router";
import type { Article, Knowledge } from "./types";

// Long enough for a question with its background; raised from 300 (2026-11), which cut
// longer questions off mid-sentence. The site's lib/ask-api.ts mirrors both limits.
export const MAX_QUESTION_CHARS = 2000;
/** Per field of the optional situation (goal, current situation, already tried). */
export const MAX_SITUATION_CHARS = 1500;

/** Shown when no episode covers the question, in the question's language like the answers. */
export function outOfScopeMessage(question: string): string {
  return /[\u3400-\u9fff]/.test(question)
    ? "Sean 在节目里还没讲过这个问题，所以这里没有可靠的资料可以回答。"
    : "Sean hasn't covered this in his episodes yet, so there is nothing reliable to answer it from.";
}

/** Milliseconds spent in each stage, for the evals and the Worker's logs. */
export interface Timings {
  routeMs: number;
  /** From the start of the answer call to its first streamed text; only when streaming. */
  firstTextMs?: number;
  answerMs: number;
  totalMs: number;
}

/** Optional callbacks for streaming an answer to the reader as it is written. */
export interface AskHooks {
  /** The articles the answer will draw on, in [A1], [A2], [A3] order, before any text is written. */
  onRouted?: (sources: Article[], related: Article[]) => void;
  onDelta?: (text: string) => void;
}

export type AskResult =
  | { status: "rejected"; reason: string }
  | { status: "out_of_scope"; message: string; related: Article[]; usage: Usage; timings: Timings }
  | {
      status: "answered";
      timings: Timings;
      tldr: string;
      body: string;
      citations: Citation[];
      related: Article[];
      usage: Usage;
      truncated: boolean;
      missingTldr: boolean;
    };

export function checkQuestion(raw: string): { question: string } | { reason: string } {
  const question = raw.replace(/\s+/g, " ").trim();
  // Four characters still allows short Chinese questions such as 「买房好吗」.
  if (question.length < 4) return { reason: "Please write out your full question." };
  if (question.length > MAX_QUESTION_CHARS) {
    return { reason: `Please keep your question under ${MAX_QUESTION_CHARS} characters.` };
  }
  return { question };
}

/**
 * The optional "结合我的处境" fields, trimmed. Returns no situation when all are empty,
 * so an empty form behaves exactly like a plain question.
 */
export function checkSituation(raw: unknown): { situation?: Situation } | { reason: string } {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object") return { reason: "Your situation could not be read." };
  const situation: Situation = {};
  for (const key of ["goal", "current", "tried"] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") return { reason: "Your situation could not be read." };
    const text = value.replace(/\s+/g, " ").trim();
    if (text.length > MAX_SITUATION_CHARS) return { reason: `Please keep your situation under ${MAX_SITUATION_CHARS} characters.` };
    if (text) situation[key] = text;
  }
  return Object.keys(situation).length ? { situation } : {};
}

/**
 * Route, then answer from at most three articles. Out-of-scope questions stop after
 * the router call. Caching repeat questions and rate limits live in the API layer.
 */
export async function ask(
  raw: string,
  knowledge: Knowledge,
  followUp?: FollowUp,
  situation?: Situation,
  hooks: AskHooks = {},
): Promise<AskResult> {
  const checked = checkQuestion(raw);
  if ("reason" in checked) return { status: "rejected", reason: checked.reason };

  const startedAt = Date.now();
  const routed = await route(checked.question, knowledge.catalog, followUp, situation);
  const routeMs = Date.now() - startedAt;
  const lookup = (ids: string[]) =>
    ids.map((id) => knowledge.articles.get(id)).filter((article): article is Article => Boolean(article));
  const sources = lookup(routed.answer);
  const related = lookup(routed.related);

  if (sources.length === 0) {
    const timings = { routeMs, answerMs: 0, totalMs: routeMs };
    return { status: "out_of_scope", message: outOfScopeMessage(checked.question), related, usage: routed.usage, timings };
  }

  hooks.onRouted?.(sources, related);
  const answerStart = Date.now();
  let firstTextMs: number | undefined;
  const onDelta = hooks.onDelta;
  const result = await answer(
    checked.question,
    sources,
    followUp,
    situation,
    onDelta &&
      ((text) => {
        firstTextMs ??= Date.now() - answerStart;
        onDelta(text);
      }),
  );
  const answerMs = Date.now() - answerStart;
  return {
    status: "answered",
    timings: { routeMs, firstTextMs, answerMs, totalMs: routeMs + answerMs },
    tldr: result.tldr,
    body: result.body,
    citations: result.citations,
    related,
    usage: addUsage(routed.usage, result.usage),
    truncated: result.truncated,
    missingTldr: result.missingTldr,
  };
}
