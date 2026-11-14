/**
 * Ask Sean API, deployed as a Cloudflare Worker and called from the iherng
 * Journal's /ask page.
 *
 *   POST /api/ask             { question, parentId? } → answer (reused when a near-identical
 *                             question was already answered on this knowledge base)
 *                             { question, situation, previous? } → a private answer shaped by
 *                             the asker's situation; only its cost is stored (private_usage)
 *   GET  /api/questions       ?sort=recent|popular&limit=20 → public feed of answered questions
 *   GET  /api/questions/:id   one question with its sources and follow-ups
 *   GET  /api/health
 */
import bundleJson from "../knowledge/bundle.json";
import { ANSWER_STYLE } from "../lib/answer";
import { ask, checkQuestion, checkSituation, MAX_QUESTION_CHARS } from "../lib/ask";
import type { FollowUp } from "../lib/router";
import { normalizeQuestion, REUSE_THRESHOLD, similarity } from "../lib/similar";
import type { Article, Knowledge, KnowledgeBundle } from "../lib/types";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  DAILY_NEW_ANSWERS_PER_IP: string;
  DAILY_BUDGET_USD: string;
  IP_SALT?: string;
}

interface QuestionRow {
  id: string;
  question: string;
  question_norm: string;
  parent_id: string | null;
  status: "answered" | "out_of_scope";
  tldr: string | null;
  body: string | null;
  message: string | null;
  citations: string;
  related: string;
  ask_count: number;
  created_at: string;
  last_asked_at: string;
}

const bundle = bundleJson as unknown as KnowledgeBundle;
const knowledge: Knowledge = {
  catalog: bundle.catalog,
  articles: new Map(bundle.articles.map((article) => [article.id, article])),
};
// Stored with every answer; an answer is only reused when both the knowledge base
// and the answer style match, so changing either stops old answers being served.
const KB_VERSION = `${bundle.catalog.version}:${ANSWER_STYLE}`;

/** How many recent questions to compare a new one against when looking for a reusable answer. */
const REUSE_CANDIDATES = 500;
const FEED_MAX = 50;

// ---------------------------------------------------------------------------
// Responses

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.ALLOWED_ORIGINS.split(",").map((value) => value.trim());
  if (!allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(request: Request, env: Env, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env) },
  });
}

function fail(request: Request, env: Env, status: number, error: string): Response {
  return json(request, env, { error }, status);
}

function sourceOf(article: Article, marker?: string) {
  return {
    marker,
    id: article.id,
    title: article.title,
    date: article.date,
    episode: article.askingSeanEpisode,
    articleUrl: article.articleUrl,
    videoUrl: article.video.url,
    videoId: article.video.id,
    videoTitle: article.video.title,
    duration: article.video.duration,
    // The answerer's verbatim line, shown on the source card so readers can see what the answer rests on.
    quote: article.answer.quote,
    answeredBy: article.answer.by?.name ?? null,
  };
}

function present(row: QuestionRow, extra: Record<string, unknown> = {}) {
  const citations = JSON.parse(row.citations) as { marker: string; id: string }[];
  const related = JSON.parse(row.related) as string[];
  return {
    id: row.id,
    question: row.question,
    parentId: row.parent_id,
    status: row.status,
    tldr: row.tldr,
    body: row.body,
    message: row.message,
    sources: citations.flatMap(({ marker, id }) => {
      const article = knowledge.articles.get(id);
      return article ? [sourceOf(article, marker)] : [];
    }),
    related: related.flatMap((id) => {
      const article = knowledge.articles.get(id);
      return article ? [sourceOf(article)] : [];
    }),
    askCount: row.ask_count,
    createdAt: row.created_at,
    lastAskedAt: row.last_asked_at,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Storage helpers

// Daily limits reset at midnight Malaysia time (UTC+8, no daylight saving).
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Today's date in Malaysia, e.g. "2026-10-07". */
const today = () => new Date(Date.now() + MYT_OFFSET_MS).toISOString().slice(0, 10);

/** The UTC instant when that Malaysian day began, to compare with the UTC created_at column. */
const dayStartUtc = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - MYT_OFFSET_MS).toISOString();

async function hashIp(request: Request, env: Env): Promise<string> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const data = new TextEncoder().encode(`${env.IP_SALT ?? "ask-sean"}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** An earlier top-level answer on the current knowledge base that this question repeats. */
async function findReusable(env: Env, norm: string): Promise<QuestionRow | null> {
  const exact = await env.DB.prepare(
    `SELECT * FROM questions
     WHERE question_norm = ? AND kb_version = ? AND parent_id IS NULL AND hidden = 0
     ORDER BY ask_count DESC LIMIT 1`,
  )
    .bind(norm, KB_VERSION)
    .first<QuestionRow>();
  if (exact) return exact;

  const { results } = await env.DB.prepare(
    `SELECT id, question_norm FROM questions
     WHERE kb_version = ? AND parent_id IS NULL AND hidden = 0
     ORDER BY last_asked_at DESC LIMIT ?`,
  )
    .bind(KB_VERSION, REUSE_CANDIDATES)
    .all<{ id: string; question_norm: string }>();
  let best: { id: string; score: number } | null = null;
  for (const candidate of results) {
    const score = similarity(norm, candidate.question_norm);
    if (score >= REUSE_THRESHOLD && (!best || score > best.score)) best = { id: candidate.id, score };
  }
  if (!best) return null;
  return env.DB.prepare("SELECT * FROM questions WHERE id = ?").bind(best.id).first<QuestionRow>();
}

// ---------------------------------------------------------------------------
// Routes

/** A private answer's follow-up carries its own context, since nothing was stored to look up. */
function privateFollowUp(raw: unknown): FollowUp | undefined | { reason: string } {
  if (raw === undefined || raw === null) return undefined;
  const value = raw as { question?: unknown; tldr?: unknown };
  if (typeof value.question !== "string" || typeof value.tldr !== "string") return { reason: "The follow-up could not be read." };
  const question = value.question.trim().slice(0, MAX_QUESTION_CHARS);
  const tldr = value.tldr.trim().slice(0, MAX_QUESTION_CHARS);
  return question ? { question, tldr } : undefined;
}

async function handleAsk(request: Request, env: Env): Promise<Response> {
  const payload = (await request.json().catch(() => null)) as {
    question?: unknown;
    parentId?: unknown;
    situation?: unknown;
    previous?: unknown;
  } | null;
  const checked = checkQuestion(typeof payload?.question === "string" ? payload.question : "");
  if ("reason" in checked) return fail(request, env, 400, checked.reason);
  const situationCheck = checkSituation(payload?.situation);
  if ("reason" in situationCheck) return fail(request, env, 400, situationCheck.reason);
  // With a situation the answer is private: never reused, never stored, never in the feed.
  const situation = situationCheck.situation;

  let followUp: FollowUp | undefined;
  const parentId = !situation && typeof payload?.parentId === "string" ? payload.parentId : null;
  if (situation) {
    const previous = privateFollowUp(payload?.previous);
    if (previous && "reason" in previous) return fail(request, env, 400, previous.reason);
    followUp = previous;
  } else if (parentId) {
    const parent = await env.DB.prepare("SELECT * FROM questions WHERE id = ? AND hidden = 0")
      .bind(parentId)
      .first<QuestionRow>();
    if (!parent || parent.status !== "answered") return fail(request, env, 400, "The answer you are following up on could not be found.");
    if (parent.parent_id) return fail(request, env, 400, "Each answer takes one follow-up. Please ask a new question instead.");
    followUp = { question: parent.question, tldr: parent.tldr ?? "" };
  }

  const norm = normalizeQuestion(checked.question);
  // Follow-ups depend on their parent, so they are never reused across conversations.
  if (!followUp && !situation) {
    const reusable = await findReusable(env, norm);
    if (reusable) {
      await env.DB.prepare(
        `UPDATE questions SET ask_count = ask_count + 1,
         last_asked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      )
        .bind(reusable.id)
        .run();
      return json(request, env, present({ ...reusable, ask_count: reusable.ask_count + 1 }, { reused: true }));
    }
  }

  const day = today();
  // 0 (the current setting) means no per-visitor limit; DAILY_BUDGET_USD still caps spending.
  const limit = Number(env.DAILY_NEW_ANSWERS_PER_IP) || 0;
  const ipHash = limit > 0 ? await hashIp(request, env) : null;
  if (ipHash) {
    const used = await env.DB.prepare("SELECT count FROM rate_limits WHERE ip_hash = ? AND day = ?")
      .bind(ipHash, day)
      .first<number>("count");
    if ((used ?? 0) >= limit) {
      return fail(
        request,
        env,
        429,
        `You have used today's ${limit} questions. They reset at midnight Malaysia time.`,
      );
    }
  }

  const since = dayStartUtc(day);
  const spent = await env.DB.prepare(
    `SELECT (SELECT COALESCE(SUM(cost_usd), 0) FROM questions WHERE created_at >= ?)
          + (SELECT COALESCE(SUM(cost_usd), 0) FROM private_usage WHERE created_at >= ?) AS spent`,
  )
    .bind(since, since)
    .first<number>("spent");
  if ((spent ?? 0) >= Number(env.DAILY_BUDGET_USD)) {
    return fail(request, env, 503, "AIherng has reached today's answer limit. Please come back tomorrow.");
  }

  let result: Awaited<ReturnType<typeof ask>>;
  try {
    result = await ask(checked.question, knowledge, followUp, situation);
  } catch (error) {
    // Logged without the situation, which may hold personal details.
    console.error("ask failed", error instanceof Error ? error.message : "unknown error");
    return fail(request, env, 502, "Something went wrong while answering. Please try again shortly.");
  }
  if (result.status === "rejected") return fail(request, env, 400, result.reason);

  const rateLimitWrite = ipHash
    ? [
        env.DB.prepare(
          `INSERT INTO rate_limits (ip_hash, day, count) VALUES (?, ?, 1)
           ON CONFLICT (ip_hash, day) DO UPDATE SET count = count + 1`,
        ).bind(ipHash, day),
      ]
    : [];

  if (situation) {
    // Only the cost is kept; the question, situation and answer go back to the asker alone.
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO private_usage (tokens_in, tokens_cached, tokens_out, cost_usd) VALUES (?, ?, ?, ?)`,
      ).bind(
        result.usage.cacheHit + result.usage.cacheMiss,
        result.usage.cacheHit,
        result.usage.output,
        result.usage.costUsd,
      ),
      ...rateLimitWrite,
    ]);
    const now = new Date().toISOString();
    return json(
      request,
      env,
      present(
        {
          id: crypto.randomUUID(),
          question: checked.question,
          question_norm: norm,
          parent_id: null,
          status: result.status,
          tldr: result.status === "answered" ? result.tldr : null,
          body: result.status === "answered" ? result.body : null,
          message: result.status === "out_of_scope" ? result.message : null,
          citations: JSON.stringify(
            result.status === "answered"
              ? result.citations.map(({ marker, article }) => ({ marker, id: article.id }))
              : [],
          ),
          related: JSON.stringify(result.related.map((article) => article.id)),
          ask_count: 1,
          created_at: now,
          last_asked_at: now,
        },
        { reused: false, private: true },
      ),
    );
  }

  const row: QuestionRow = {
    id: crypto.randomUUID(),
    question: checked.question,
    question_norm: norm,
    parent_id: parentId,
    status: result.status,
    tldr: result.status === "answered" ? result.tldr : null,
    body: result.status === "answered" ? result.body : null,
    message: result.status === "out_of_scope" ? result.message : null,
    citations: JSON.stringify(
      result.status === "answered"
        ? result.citations.map(({ marker, article }) => ({ marker, id: article.id }))
        : [],
    ),
    related: JSON.stringify(result.related.map((article) => article.id)),
    ask_count: 1,
    created_at: new Date().toISOString(),
    last_asked_at: new Date().toISOString(),
  };

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO questions (id, question, question_norm, parent_id, status, tldr, body, message,
         citations, related, kb_version, tokens_in, tokens_cached, tokens_out, cost_usd, created_at, last_asked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      row.id,
      row.question,
      row.question_norm,
      row.parent_id,
      row.status,
      row.tldr,
      row.body,
      row.message,
      row.citations,
      row.related,
      KB_VERSION,
      result.usage.cacheHit + result.usage.cacheMiss,
      result.usage.cacheHit,
      result.usage.output,
      result.usage.costUsd,
      row.created_at,
      row.last_asked_at,
    ),
    ...rateLimitWrite,
  ]);

  return json(request, env, present(row, { reused: false }));
}

async function handleFeed(request: Request, env: Env, url: URL): Promise<Response> {
  const popular = url.searchParams.get("sort") === "popular";
  const limit = Math.min(FEED_MAX, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const { results } = await env.DB.prepare(
    `SELECT id, question, tldr, ask_count, last_asked_at FROM questions
     WHERE status = 'answered' AND hidden = 0 AND parent_id IS NULL
     ORDER BY ${popular ? "ask_count DESC, last_asked_at DESC" : "last_asked_at DESC"} LIMIT ?`,
  )
    .bind(limit)
    .all<Pick<QuestionRow, "id" | "question" | "tldr" | "ask_count" | "last_asked_at">>();
  return json(
    request,
    env,
    results.map((row) => ({
      id: row.id,
      question: row.question,
      tldr: row.tldr,
      askCount: row.ask_count,
      lastAskedAt: row.last_asked_at,
    })),
  );
}

async function handleQuestion(request: Request, env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT * FROM questions WHERE id = ? AND hidden = 0").bind(id).first<QuestionRow>();
  if (!row) return fail(request, env, 404, "That question could not be found.");
  const { results } = await env.DB.prepare(
    "SELECT * FROM questions WHERE parent_id = ? AND hidden = 0 ORDER BY created_at",
  )
    .bind(id)
    .all<QuestionRow>();
  return json(request, env, present(row, { followUps: results.map((child) => present(child)) }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    const url = new URL(request.url);
    const questionMatch = url.pathname.match(/^\/api\/questions\/([\w-]+)$/);

    try {
      if (request.method === "POST" && url.pathname === "/api/ask") return await handleAsk(request, env);
      if (request.method === "GET" && url.pathname === "/api/questions") return await handleFeed(request, env, url);
      if (request.method === "GET" && questionMatch) return await handleQuestion(request, env, questionMatch[1]);
      if (request.method === "GET" && url.pathname === "/api/health") {
        return json(request, env, { ok: true, kbVersion: KB_VERSION, articles: knowledge.articles.size });
      }
      return fail(request, env, 404, "Not found");
    } catch (error) {
      console.error("request failed", error);
      return fail(request, env, 500, "Something went wrong on the server. Please try again shortly.");
    }
  },
} satisfies ExportedHandler<Env>;
