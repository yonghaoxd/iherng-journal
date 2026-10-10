'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CornerDownRight,
  Link2,
  Loader2,
  Lock,
  MessageCircleQuestion,
  Send,
  Users,
} from 'lucide-react';
import {
  askSean,
  fetchFeed,
  fetchQuestion,
  MAX_QUESTION_CHARS,
  MAX_SITUATION_CHARS,
  type AskAnswer,
  type AskFeedItem,
  type AskSituation,
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
      {answer.private && !nested && (
        <p className="askbot-private">
          <Lock size={13} aria-hidden="true" /> 结合你的处境回答 · 只有你看得到，不公开、不保存
        </p>
      )}
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

/**
 * What viewers who write in to Asking Sean usually tell him, and what his answers
 * turn on. Tapping one starts a line for it in the situation box.
 */
const SITUATION_PROMPTS = [
  '年龄',
  '税后月入',
  '存款',
  '每月贷款和开销',
  '已有房产',
  '家庭状况',
  '自住还是投资',
] as const;

/** Only the fields with something in them, or nothing when all are empty. */
function filledSituation(situation: AskSituation): AskSituation | undefined {
  const filled = Object.fromEntries(
    Object.entries(situation).filter(([, value]) => value?.trim()),
  ) as AskSituation;
  return Object.keys(filled).length ? filled : undefined;
}

interface SituationControl {
  enabled: boolean;
  value: AskSituation;
  onToggle: (enabled: boolean) => void;
  onChange: (value: AskSituation) => void;
}

/** "结合我的处境": optional details that shape one private answer. */
function SituationFields({ value, onChange }: Pick<SituationControl, 'value' | 'onChange'>) {
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const current = value.current ?? '';
  const addPrompt = (prompt: string) => {
    const line = `${prompt}：`;
    let next = current;
    if (!current.includes(line)) {
      const separator = current && !current.endsWith('\n') ? '\n' : '';
      next = `${current}${separator}${line}`.slice(0, MAX_SITUATION_CHARS);
      onChange({ current: next });
    }
    requestAnimationFrame(() => {
      const box = boxRef.current;
      if (!box) return;
      box.focus();
      const end = next.indexOf(line) + line.length;
      const lineEnd = next.indexOf('\n', end);
      const cursor = lineEnd === -1 ? next.length : lineEnd;
      box.setSelectionRange(cursor, cursor);
    });
  };
  return (
    <div className="askbot-situation">
      <p className="askbot-situation-intro">
        说说你的情况，回答会套用到你身上，也会指出还缺什么资料。只写你愿意分享的。
      </p>
      <p className="askbot-situation-privacy">
        <Lock size={13} aria-hidden="true" />
        这里的内容只用来生成这次回答：回答只有你看得到，不会公开，我们也不保存。请不要写姓名、电话或地址。
      </p>
      <label className="askbot-situation-field">
        <span>你的现况</span>
        <textarea
          ref={boxRef}
          rows={4}
          maxLength={MAX_SITUATION_CHARS}
          placeholder="例如：32 岁，已婚，一个孩子；税后月入 RM8,000，存款 RM60,000；车贷每月 RM900；名下还没有房，想买自住。"
          value={current}
          onChange={(event) => onChange({ current: event.target.value })}
        />
      </label>
      <div className="askbot-situation-prompts" aria-label="点一下加入这一项">
        <span>点一下加入：</span>
        {SITUATION_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className={current.includes(`${prompt}：`) ? 'used' : ''}
            onClick={() => addPrompt(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuestionForm({
  onSubmit,
  busy,
  placeholder,
  compact = false,
  situation,
}: {
  onSubmit: (question: string) => Promise<boolean>;
  busy: boolean;
  placeholder: string;
  compact?: boolean;
  situation?: SituationControl;
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
      {situation?.enabled && <SituationFields value={situation.value} onChange={situation.onChange} />}
      <div className="askbot-form-row">
        {situation && (
          <label className={`askbot-situation-toggle ${situation.enabled ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={situation.enabled}
              onChange={(event) => situation.onToggle(event.target.checked)}
            />
            结合我的处境
          </label>
        )}
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

  const [situationOn, setSituationOn] = useState(false);
  const [situation, setSituation] = useState<AskSituation>({});
  // The situation a private answer was given with, re-sent for its follow-up.
  const privateSituation = useRef<AskSituation | undefined>(undefined);

  const show = useCallback((next: AskAnswer) => {
    setAnswer(next);
    // A private answer is not stored, so it has no link to share.
    window.history.replaceState(null, '', next.private ? '/ask' : `/ask?q=${next.parentId ?? next.id}`);
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

  /** A new question, or a follow-up to `parent`. */
  const ask = async (question: string, parent?: AskAnswer): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      let result: AskAnswer;
      if (parent?.private) {
        result = await askSean(question, {
          situation: privateSituation.current,
          previous: { question: parent.question, tldr: parent.tldr ?? '' },
        });
      } else if (parent) {
        result = await askSean(question, { parentId: parent.id });
      } else {
        const own = situationOn ? filledSituation(situation) : undefined;
        result = await askSean(question, own ? { situation: own } : {});
        privateSituation.current = own;
      }
      if (parent && answer) {
        setAnswer({ ...answer, followUps: [...(answer.followUps ?? []), result] });
      } else {
        show({ ...result, followUps: [] });
      }
      if (!result.private) loadFeed(sort);
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
        <QuestionForm
          onSubmit={(question) => ask(question)}
          busy={busy}
          placeholder="你在买房上卡在哪里？例如：第一间房该买自住还是投资？"
          situation={{
            enabled: situationOn,
            value: situation,
            onToggle: setSituationOn,
            onChange: setSituation,
          }}
        />
        <div className="askbot-examples">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" disabled={busy} onClick={() => void ask(example)}>
              {example}
            </button>
          ))}
        </div>
        <p className="askbot-disclaimer">
          一般问答会公开显示，但不记名，请不要写电话、地址等个人资料；勾选「结合我的处境」的回答只有你看得到。回答由 AI 根据 iherng Journal 的文章整理，不是 Sean
          本人回复，也不构成理财建议；数字以节目录制时为准。
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
                onSubmit={(question) => ask(question, answer)}
              />
            )}
            {!answer.private && (
              <button type="button" className="askbot-share" onClick={() => void copyLink()}>
                <Link2 size={14} /> {copied ? '已复制链接' : '复制这个回答的链接'}
              </button>
            )}
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
