import siteConfig from '@/site.config.json';

/** Shapes returned by the Ask Sean Worker (asking_iherng/worker/index.ts). */
export interface AskSource {
  marker?: string;
  id: string;
  title: string;
  date: string;
  episode: number | null;
  articleUrl: string;
  videoUrl: string;
  videoTitle: string;
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

/** The optional "结合我的处境" fields; any of them may be left out. */
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

/** Local development talks to `npm run worker:dev` in the asking_iherng project. */
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
    throw new Error('连不上问答服务，请检查网络后再试。');
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? '出了点问题，请稍后再试。');
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
