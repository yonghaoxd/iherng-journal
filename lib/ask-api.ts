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
  followUps?: AskAnswer[];
}

/** The optional "My situation" fields; any of them may be left out. */
export interface AskSituation {
  goal?: string;
  current?: string;
  tried?: string;
}

export interface AskFeedItem {
  id: string;
  question: string;
  tldr: string | null;
  askCount: number;
  lastAskedAt: string;
}

export const MAX_QUESTION_CHARS = 300;
export const MAX_SITUATION_CHARS = 400;

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

export const fetchFeed = (sort: 'recent' | 'popular') =>
  request<AskFeedItem[]>(`/api/questions?sort=${sort}&limit=20`);

export const fetchQuestion = (id: string) => request<AskAnswer>(`/api/questions/${encodeURIComponent(id)}`);
