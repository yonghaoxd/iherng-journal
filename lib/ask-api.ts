import siteConfig from '@/site.config.json';

/** Shapes returned by the Ask Sean Worker (ask-sean/worker/index.ts). */
export interface AskSource {
  marker?: string;
  id: string;
  title: string;
  date: string;
  episode: number | null;
  articleUrl: string;
  videoUrl: string;
  videoTitle: string;
  /** Added in 2026-11; older Worker builds leave these out. */
  videoId?: string;
  duration?: string;
  /** The answerer's verbatim line from the episode. */
  quote?: string;
  /** A guest's name when the episode's answer is theirs rather than Sean's. */
  answeredBy?: string | null;
}

export interface AskAnswer {
  id: string;
  question: string;
  parentId: string | null;
  status: 'answered' | 'out_of_scope';
  tldr: string | null;
  body: string | null;
  message: string | null;
  sources: AskSource[];
  related: AskSource[];
  askCount: number;
  createdAt: string;
  lastAskedAt: string;
  reused?: boolean;
  /** Shaped by the asker's situation: shown only to them, never stored or listed. */
  private?: boolean;
  /** Client-side only: the situation this private answer was asked with, shown above it. */
  askedWith?: AskSituation;
  /** Client-side only: the answer is still being written. */
  streaming?: boolean;
  followUps?: AskAnswer[];
}

/** The optional "My situation" fields; any of them may be left out. */
export interface AskSituation {
  goal?: string;
  current?: string;
  tried?: string;
}

/** Another way the same question was asked, listed under a popular question. */
export interface SimilarAsk {
  /** The question that answers it (for a reused answer, the original question). */
  id: string;
  question: string;
  askedAt: string;
}

export interface AskFeedItem {
  id: string;
  question: string;
  tldr: string | null;
  /** Recent: times this question was asked. Most asked: times its whole group was asked. */
  askCount: number;
  lastAskedAt: string;
  votes: number;
  /** How many other times a question with the same meaning was asked. */
  similarCount: number;
  /** Most asked only: the other wordings, newest first. */
  similar?: SimilarAsk[];
}

export interface AskFeedPage {
  total: number;
  items: AskFeedItem[];
}

/** Keep in step with ask-sean/lib/ask.ts, which enforces them. */
export const MAX_QUESTION_CHARS = 2000;
export const MAX_SITUATION_CHARS = 1500;

/** Local development talks to `npm run worker:dev` in ask-sean/. */
function apiBase(): string {
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
    return 'http://127.0.0.1:8787';
  }
  return siteConfig.askApiUrl;
}

/** GET, or POST with a JSON body when `body` is given. */
async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      apiBase() + path,
      body === undefined
        ? undefined
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
  } catch {
    throw new Error('Could not reach AIherng. Check your connection and try again.');
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Something went wrong. Please try again shortly.');
  return data;
}

export const askSean = (
  question: string,
  options: {
    parentId?: string;
    situation?: AskSituation;
    /** For a follow-up to a private answer, which the server did not keep. */
    previous?: { question: string; tldr: string };
  } = {},
) => request<AskAnswer>('/api/ask', { question, ...options });

export interface AskStreamHandlers {
  /** The episodes the answer draws on, as soon as they are chosen. */
  onSources?: (sources: AskSource[], related: AskSource[]) => void;
  /** All the text written so far, TL;DR line and [A1] markers included. */
  onText?: (text: string) => void;
}

const FAILED = 'Something went wrong. Please try again shortly.';

/**
 * Like askSean, but a new answer streams in: the sources first, then the text as it
 * is written. Reused answers and errors arrive as plain JSON, as before.
 */
export async function askSeanStream(
  question: string,
  options: Parameters<typeof askSean>[1],
  handlers: AskStreamHandlers,
): Promise<AskAnswer> {
  let response: Response;
  try {
    response = await fetch(apiBase() + '/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ...options, stream: true }),
    });
  } catch {
    throw new Error('Could not reach AIherng. Check your connection and try again.');
  }
  if (!response.body || !response.headers.get('Content-Type')?.includes('text/event-stream')) {
    const data = (await response.json().catch(() => ({}))) as AskAnswer & { error?: string };
    if (!response.ok) throw new Error(data.error ?? FAILED);
    return data;
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let text = '';
  for (;;) {
    let chunk: ReadableStreamReadResult<string>;
    try {
      chunk = await reader.read();
    } catch {
      throw new Error('The connection dropped while AIherng was answering. Please try again.');
    }
    if (chunk.value) buffer += chunk.value;
    // Server-sent events, separated by a blank line: "event: <name>\ndata: <json>".
    let end: number;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = block.match(/^event: (.+)$/m)?.[1];
      const data = block.match(/^data: (.+)$/m)?.[1];
      if (!event || !data) continue;
      const payload = JSON.parse(data);
      if (event === 'sources') handlers.onSources?.(payload.sources, payload.related);
      else if (event === 'delta') {
        text += payload.text;
        handlers.onText?.(text);
      } else if (event === 'done') return payload as AskAnswer;
      else if (event === 'error') throw new Error(payload.error ?? FAILED);
    }
    if (chunk.done) break;
  }
  throw new Error('The connection dropped while AIherng was answering. Please try again.');
}

/**
 * Split text that is still being written into its TL;DR and body, the way the server
 * does once it is complete. A first line that may yet turn out to be the TL;DR is held back.
 */
export function splitDraft(text: string): { tldr: string; body: string } {
  const TLDR = /^\s*\**TL;?DR:?\**:?\s*/i;
  const newline = text.indexOf('\n');
  const first = newline === -1 ? text : text.slice(0, newline);
  const strip = (value: string) => value.replace(/\[A\d+\]/g, '').replace(/\[A?\d*$/, '').trim();
  // Also hold back a marker cut off mid-way ("[A") and a step number with no text yet ("2.").
  const body = (value: string) =>
    value
      .replace(/\[A?\d*$/, '')
      .replace(/(^|\n)\s*\d+[.、)]?\s*$/, '')
      .trim();
  if (TLDR.test(first)) {
    return { tldr: strip(first.replace(TLDR, '')), body: newline === -1 ? '' : body(text.slice(newline + 1)) };
  }
  if (newline === -1 && /^\s*\**(T(L(;?(D(R)?)?)?)?)?$/i.test(first)) return { tldr: '', body: '' };
  return { tldr: '', body: body(text) };
}

export const FEED_PAGE = 20;

export const fetchFeed = (sort: 'recent' | 'popular', offset = 0) =>
  request<AskFeedPage>(`/api/questions?v=2&sort=${sort}&limit=${FEED_PAGE}&offset=${offset}`);

/** One helpful vote per visitor; the server keys it on a hashed IP. */
export const voteQuestion = (id: string, on: boolean) =>
  request<{ votes: number; voted: boolean }>(`/api/questions/${encodeURIComponent(id)}/vote`, { on });

export const fetchQuestion = (id: string) => request<AskAnswer>(`/api/questions/${encodeURIComponent(id)}`);
