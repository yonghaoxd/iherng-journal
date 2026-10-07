'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CornerDownRight, Link2, Loader2, MessageCircleQuestion, Send, Users } from 'lucide-react';
import {
  askSean,
  fetchFeed,
  fetchQuestion,
  MAX_QUESTION_CHARS,
  type AskAnswer,
  type AskFeedItem,
  type AskSource,
} from '@/lib/ask-api';

const EXAMPLES = [
  '第一间房该买自住还是投资？',
  'Landed 和 condo 哪个比较保值？',
  '提前还清房贷好不好？',
  '买 new launch 还是 subsale？',
];

/** Article links come back as absolute URLs; keep them on this site so they work in every environment. */
function articlePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}

function sourceLabel(source: AskSource): string {
  const episode = source.episode ? `Asking Sean #${source.episode} · ` : '';
  return `${episode}${source.date.slice(0, 4)}`;
}

/** Turn "[A1]" markers into links to the matching source card. */
function withCitations(text: string, answerId: string): ReactNode[] {
  return text.split(/(\[A\d+\])/).map((part, index) => {
    const marker = part.match(/^\[(A\d+)\]$/)?.[1];
    if (!marker) return part;
    return (
      <a key={index} className="askbot-cite" href={`#src-${answerId}-${marker}`} aria-label={`来源 ${marker.slice(1)}`}>
        {marker.slice(1)}
      </a>
    );
  });
}

/** The answer body: paragraphs, numbered steps and a closing "注意：" line. */
function AnswerBody({ body, answerId }: { body: string; answerId: string }) {
  const blocks: ReactNode[] = [];
  let steps: string[] = [];
  const flushSteps = () => {
    if (steps.length) {
      blocks.push(
        <ol key={`steps-${blocks.length}`} className="askbot-steps">
          {steps.map((step, index) => (
            <li key={index}>{withCitations(step, answerId)}</li>
          ))}
        </ol>,
      );
      steps = [];
    }
  };

  for (const line of body.split(/\r?\n/)) {
    const step = line.match(/^\s*\d+[.、)]\s*(.+)$/);
    if (step) {
      steps.push(step[1]);
      continue;
    }
    flushSteps();
    if (!line.trim()) continue;
    const isNote = /^\s*注意[:：]/.test(line);
    blocks.push(
      <p key={`p-${blocks.length}`} className={isNote ? 'askbot-note' : undefined}>
        {withCitations(line, answerId)}
      </p>,
    );
  }
  flushSteps();
  return <div className="askbot-body">{blocks}</div>;
}

function SourceList({ sources, answerId }: { sources: AskSource[]; answerId: string }) {
  if (!sources.length) return null;
  return (
    <div className="askbot-sources">
      <span className="ask-label">来源</span>
      <ol>
        {sources.map((source) => (
          <li key={source.marker ?? source.id} id={`src-${answerId}-${source.marker}`}>
            <span className="askbot-source-num">{source.marker?.slice(1)}</span>
            <div>
              <Link href={articlePath(source.articleUrl)} className="askbot-source-title">
                {source.title}
              </Link>
              <div className="askbot-source-meta">
                <span>{sourceLabel(source)}</span>
                <a href={source.videoUrl} target="_blank" rel="noreferrer">
                  看原视频 <ArrowUpRight size={12} />
                </a>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RelatedReads({ related, title }: { related: AskSource[]; title: string }) {
  if (!related.length) return null;
  return (
    <div className="askbot-related">
      <span className="ask-label">{title}</span>
      <div className="askbot-related-list">
        {related.map((source) => (
          <Link key={source.id} href={articlePath(source.articleUrl)} className="askbot-related-card">
            <span>{source.title}</span>
            <small>{sourceLabel(source)}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AnswerView({ answer, nested = false }: { answer: AskAnswer; nested?: boolean }) {
  return (
    <article className={`askbot-answer ${nested ? 'nested' : ''}`} aria-live="polite">
      <p className="askbot-question">
        {nested && <CornerDownRight size={15} />}
        {answer.question}
      </p>
      {answer.askCount > 1 && (
        <p className="askbot-count">
          <Users size={13} /> {answer.askCount} 次类似提问
        </p>
      )}

      {answer.status === 'answered' && answer.body ? (
        <>
          {answer.tldr && (
            <div className="askbot-tldr">
              <span className="ask-label accent">结论</span>
              <p>{answer.tldr}</p>
            </div>
          )}
          <AnswerBody body={answer.body} answerId={answer.id} />
          <SourceList sources={answer.sources} answerId={answer.id} />
          {!nested && <RelatedReads related={answer.related} title="延伸阅读" />}
        </>
      ) : (
        <>
          <p className="askbot-out-of-scope">{answer.message}</p>
          <p className="askbot-hint">
            想看具体楼盘的点评，可以去 <Link href="/property-reviews">Property Reviews</Link>。
          </p>
          <RelatedReads related={answer.related} title="可以先看看这些文章" />
        </>
      )}
    </article>
  );
}

function QuestionForm({
  onSubmit,
  busy,
  placeholder,
  compact = false,
}: {
  onSubmit: (question: string) => Promise<boolean>;
  busy: boolean;
  placeholder: string;
  compact?: boolean;
}) {
  const [text, setText] = useState('');
  const submit = async () => {
    if (busy || !text.trim()) return;
    if (await onSubmit(text.trim())) setText('');
  };
  return (
    <form
      className={`askbot-form ${compact ? 'compact' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <textarea
        value={text}
        maxLength={MAX_QUESTION_CHARS}
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void submit();
          }
        }}
      />
      <div className="askbot-form-row">
        <span className="askbot-counter">
          {text.length}/{MAX_QUESTION_CHARS} · Ctrl + Enter 发送
        </span>
        <button type="submit" className="askbot-submit" disabled={busy || !text.trim()}>
          {busy ? <Loader2 size={15} className="askbot-spin" /> : <Send size={15} />}
          {compact ? '追问' : '提问'}
        </button>
      </div>
    </form>
  );
}

export function AskSeanChat() {
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [feed, setFeed] = useState<AskFeedItem[] | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback((order: 'recent' | 'popular') => {
    fetchFeed(order)
      .then(setFeed)
      .catch(() => setFeed([]));
  }, []);

  const show = useCallback((next: AskAnswer) => {
    setAnswer(next);
    window.history.replaceState(null, '', `/ask?q=${next.parentId ?? next.id}`);
    requestAnimationFrame(() => answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  const open = useCallback(
    async (id: string) => {
      setError('');
      try {
        show(await fetchQuestion(id));
      } catch (problem) {
        setError((problem as Error).message);
      }
    },
    [show],
  );

  // A shared link (/ask?q=<id>) opens that answer; state is only set once the fetch settles.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('q');
    if (!id) return;
    fetchQuestion(id)
      .then(show)
      .catch((problem: Error) => setError(problem.message));
  }, [show]);

  useEffect(() => loadFeed(sort), [sort, loadFeed]);

  const ask = async (question: string, parentId?: string): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      const result = await askSean(question, parentId);
      if (parentId && answer) {
        setAnswer({ ...answer, followUps: [...(answer.followUps ?? []), result] });
      } else {
        show({ ...result, followUps: [] });
      }
      loadFeed(sort);
      return true;
    } catch (problem) {
      setError((problem as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canFollowUp = answer?.status === 'answered' && !answer.parentId && !answer.followUps?.length;

  return (
    <div className="askbot">
      <section className="askbot-ask">
        <QuestionForm onSubmit={(question) => ask(question)} busy={busy} placeholder="你在买房上卡在哪里？例如：第一间房该买自住还是投资？" />
        <div className="askbot-examples">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" disabled={busy} onClick={() => void ask(example)}>
              {example}
            </button>
          ))}
        </div>
        <p className="askbot-disclaimer">
          问答会公开显示，但不记名，请不要写电话、地址等个人资料。回答由 AI 根据 iherng Journal 的文章整理，不是 Sean
          本人回复，也不构成理财建议；数字以节目录制时为准。每人每天可以问 3 个问题（马来西亚时间午夜重置），看别人问过的不限次数。
        </p>
      </section>

      <div ref={answerRef} className="askbot-answer-slot">
        {busy && !answer && (
          <p className="askbot-loading">
            <Loader2 size={16} className="askbot-spin" /> 正在翻 Sean 的节目…
          </p>
        )}
        {error && <p className="askbot-error">{error}</p>}
        {answer && (
          <div className="askbot-thread">
            <AnswerView answer={answer} />
            {answer.followUps?.map((followUp) => <AnswerView key={followUp.id} answer={followUp} nested />)}
            {canFollowUp && (
              <QuestionForm
                compact
                busy={busy}
                placeholder="还有不清楚的地方？可以追问一次"
                onSubmit={(question) => ask(question, answer.id)}
              />
            )}
            <button type="button" className="askbot-share" onClick={() => void copyLink()}>
              <Link2 size={14} /> {copied ? '已复制链接' : '复制这个回答的链接'}
            </button>
          </div>
        )}
      </div>

      <section className="askbot-feed" aria-labelledby="askbot-feed-title">
        <div className="askbot-feed-head">
          <h2 id="askbot-feed-title">
            <MessageCircleQuestion size={18} /> 别人在问什么
          </h2>
          <div className="askbot-tabs" role="tablist">
            {(['recent', 'popular'] as const).map((order) => (
              <button
                key={order}
                type="button"
                role="tab"
                aria-selected={sort === order}
                className={sort === order ? 'active' : ''}
                onClick={() => setSort(order)}
              >
                {order === 'recent' ? '最近问' : '最常问'}
              </button>
            ))}
          </div>
        </div>
        {feed === null && <p className="askbot-hint">载入中…</p>}
        {feed?.length === 0 && <p className="askbot-hint">还没有人提问，来问第一个问题吧。</p>}
        <ul className="askbot-feed-list">
          {feed?.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => void open(item.id)}>
                <span className="askbot-feed-meta">
                  {timeAgo(item.lastAskedAt)}
                  {item.askCount > 1 && ` · ${item.askCount} 次类似提问`}
                </span>
                <span className="askbot-feed-question">{item.question}</span>
                {item.tldr && <span className="askbot-feed-tldr">{item.tldr}</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
