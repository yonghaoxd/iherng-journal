'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  ArrowUpRight,
  CornerDownRight,
  Link2,
  Loader2,
  Lock,
  MessageCircleQuestion,
  Play,
  Plus,
  RotateCcw,
  Users,
  X,
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
  'Own stay or investment for my first property?',
  'Landed or condo: which holds its value better?',
  'Should I settle my housing loan early?',
  'New launch or subsale?',
];

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** The video's id, from the API or, for older responses, from its watch URL. */
function videoIdOf(source: AskSource): string | null {
  if (source.videoId) return source.videoId;
  try {
    return new URL(source.videoUrl).searchParams.get('v');
  } catch {
    return null;
  }
}

/** Turn "[A1]" markers into links to the matching source card. */
function withCitations(text: string, answerId: string): ReactNode[] {
  return text.split(/(\[A\d+\])/).map((part, index) => {
    const marker = part.match(/^\[(A\d+)\]$/)?.[1];
    if (!marker) return part;
    return (
      <a key={index} className="askbot-cite" href={`#src-${answerId}-${marker}`} aria-label={`Source ${marker.slice(1)}`}>
        {marker.slice(1)}
      </a>
    );
  });
}

/** A "- Short title: explanation" reason, with its short title set in bold. */
function reasonLine(text: string, answerId: string): ReactNode {
  const titled = text.match(/^([^：:[]{2,24})[：:]\s*(.+)$/);
  if (!titled) return withCitations(text, answerId);
  return (
    <>
      <strong>{titled[1]}: </strong>
      {withCitations(titled[2], answerId)}
    </>
  );
}

/**
 * The answer body: 【section】 headings, paragraphs, "- " reasons, numbered steps and
 * a closing "注意：" / "Note:" line, in whichever language the answer is written.
 * Older answers have no headings or reasons and still render.
 */
function AnswerBody({ body, answerId }: { body: string; answerId: string }) {
  const blocks: ReactNode[] = [];
  let steps: string[] = [];
  let reasons: string[] = [];
  const flushLists = () => {
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
    if (reasons.length) {
      blocks.push(
        <ul key={`reasons-${blocks.length}`} className="askbot-reasons">
          {reasons.map((reason, index) => (
            <li key={index}>{reasonLine(reason, answerId)}</li>
          ))}
        </ul>,
      );
      reasons = [];
    }
  };

  for (const line of body.split(/\r?\n/)) {
    const step = line.match(/^\s*\d+[.、)]\s*(.+)$/);
    if (step) {
      steps.push(step[1]);
      continue;
    }
    const reason = line.match(/^\s*[-•·]\s*(.+)$/);
    if (reason) {
      reasons.push(reason[1]);
      continue;
    }
    flushLists();
    if (!line.trim()) continue;
    const heading = line.match(/^\s*【(.+?)】\s*(.*)$/);
    if (heading) {
      blocks.push(
        <h4 key={`h-${blocks.length}`} className="askbot-section">
          {heading[1]}
        </h4>,
      );
      if (heading[2].trim()) {
        blocks.push(<p key={`p-${blocks.length}`}>{withCitations(heading[2], answerId)}</p>);
      }
      continue;
    }
    const isNote = /^\s*(注意|Note|Nota)\s*[:：]/i.test(line);
    blocks.push(
      <p key={`p-${blocks.length}`} className={isNote ? 'askbot-note' : undefined}>
        {withCitations(line, answerId)}
      </p>,
    );
  }
  flushLists();
  return <div className="askbot-body">{blocks}</div>;
}

/** One card per cited episode: what it is, the line the answer rests on, and a way to watch it. */
function SourceList({ sources, answerId }: { sources: AskSource[]; answerId: string }) {
  if (!sources.length) return null;
  return (
    <div className="askbot-sources">
      <span className="askbot-sources-title">{sources.length > 1 ? 'Sources' : 'Source'}</span>
      <ol>
        {sources.map((source) => {
          const videoId = videoIdOf(source);
          return (
            <li key={source.marker ?? source.id} id={`src-${answerId}-${source.marker}`} className="askbot-source-card">
              <a className="askbot-source-thumb" href={source.videoUrl} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
                {videoId && <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" width={320} height={180} loading="lazy" />}
                {source.duration && <span className="askbot-source-duration">{source.duration}</span>}
                <span className="askbot-source-num">{source.marker?.slice(1)}</span>
              </a>
              <div className="askbot-source-info">
                <span className="askbot-source-title">{source.videoTitle}</span>
                <span className="askbot-source-date">iherng · {formatDate(source.date)}</span>
                {source.quote && (
                  <blockquote className="askbot-source-quote">
                    <p>&ldquo;{source.quote}&rdquo;</p>
                    <footer>{source.answeredBy ? `${source.answeredBy}, verbatim` : "Sean's words, verbatim"}</footer>
                  </blockquote>
                )}
                <a className="askbot-source-watch" href={source.videoUrl} target="_blank" rel="noreferrer">
                  <Play size={13} fill="currentColor" aria-hidden="true" /> Watch on YouTube
                </a>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RelatedVideos({ related, title }: { related: AskSource[]; title: string }) {
  if (!related.length) return null;
  return (
    <div className="askbot-related">
      <span className="ask-label">{title}</span>
      <div className="askbot-related-list">
        {related.map((source) => (
          <a key={source.id} href={source.videoUrl} target="_blank" rel="noreferrer" className="askbot-related-card">
            <span>{source.videoTitle}</span>
            <small>
              {source.date.slice(0, 4)}
              {source.duration ? ` · ${source.duration}` : ''} <ArrowUpRight size={11} aria-hidden="true" />
            </small>
          </a>
        ))}
      </div>
    </div>
  );
}

function AnswerView({ answer, nested = false }: { answer: AskAnswer; nested?: boolean }) {
  return (
    <article className={`askbot-answer ${nested ? 'nested' : ''}`} aria-live="polite">
      <div className="askbot-answer-main">
        <p className="askbot-question">
          {nested && <CornerDownRight size={15} />}
          {answer.question}
        </p>
        {answer.private && !nested && (
          <p className="askbot-private">
            <Lock size={13} aria-hidden="true" /> Answered for your situation · only you can see this, it is not saved
          </p>
        )}
        {answer.askCount > 1 && (
          <p className="askbot-count">
            <Users size={13} /> Asked {answer.askCount} times
          </p>
        )}

        {answer.status === 'answered' && answer.body ? (
          <>
            {answer.tldr && (
              <div className="askbot-tldr">
                <span className="ask-label accent">TL;DR</span>
                <p>{answer.tldr}</p>
              </div>
            )}
            <AnswerBody body={answer.body} answerId={answer.id} />
            <p className="askbot-persona">Written by AI in Sean&apos;s voice from his episodes, not by Sean himself.</p>
            {!nested && <RelatedVideos related={answer.related} title="Related episodes" />}
          </>
        ) : (
          <>
            <p className="askbot-out-of-scope">{answer.message}</p>
            <p className="askbot-hint">
              Asking about a specific project? See <Link href="/property-reviews">Property Reviews</Link>.
            </p>
            <RelatedVideos related={answer.related} title="These episodes may help" />
          </>
        )}
      </div>
      {answer.status === 'answered' && answer.sources.length > 0 && (
        <aside className="askbot-answer-aside" aria-label="Sources">
          <SourceList sources={answer.sources} answerId={answer.id} />
        </aside>
      )}
    </article>
  );
}

/**
 * What viewers who write in to Asking Sean usually tell him, and what his answers
 * turn on. Tapping one starts a line for it in the situation box.
 */
const SITUATION_PROMPTS = [
  'Age',
  'Monthly take-home pay',
  'Savings',
  'Monthly loans and expenses',
  'Properties you own',
  'Family',
  'Own stay or investment',
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

/** "My situation": optional details that shape one private answer. */
function SituationFields({ value, onChange }: Pick<SituationControl, 'value' | 'onChange'>) {
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const current = value.current ?? '';
  const addPrompt = (prompt: string) => {
    const line = `${prompt}: `;
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
      <label className="askbot-situation-field">
        <span className="askbot-situation-label">
          <Lock size={12} aria-hidden="true" /> Your situation · private, never saved or shown
        </span>
        <textarea
          ref={boxRef}
          rows={Math.min(8, Math.max(3, current.split('\n').length + 1))}
          maxLength={MAX_SITUATION_CHARS}
          placeholder="Age, income, savings, loans, and what you want to buy. No names or phone numbers."
          value={current}
          onChange={(event) => onChange({ current: event.target.value })}
        />
      </label>
      <div className="askbot-situation-prompts" aria-label="Tap to add">
        <span>Add:</span>
        {SITUATION_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className={current.includes(`${prompt}: `) ? 'used' : ''}
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
  dock = false,
  initialText = '',
}: {
  onSubmit: (question: string) => Promise<boolean>;
  busy: boolean;
  placeholder: string;
  compact?: boolean;
  situation?: SituationControl;
  /** The bar under an answer: the situation switch reuses what was entered above, without its fields. */
  dock?: boolean;
  /** Pre-filled question, e.g. from an old article link; never sent until the reader presses Ask. */
  initialText?: string;
}) {
  const [text, setText] = useState(initialText);
  // Set when someone presses Ask with only their situation filled in.
  const [needQuestion, setNeedQuestion] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const withSituation = Boolean(situation?.enabled);
  const hasSituation = withSituation && Boolean(situation?.value.current?.trim());

  const submit = async () => {
    if (busy) return;
    if (!text.trim()) {
      if (hasSituation) {
        setNeedQuestion(true);
        questionRef.current?.focus();
        questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    if (await onSubmit(text.trim())) setText('');
  };
  return (
    <form
      className={`askbot-form askbot-composer ${compact ? 'compact' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <textarea
        ref={questionRef}
        className={`askbot-question-input ${needQuestion ? 'needs-question' : ''}`}
        value={text}
        maxLength={MAX_QUESTION_CHARS}
        rows={compact ? 1 : 2}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-invalid={needQuestion || undefined}
        onChange={(event) => {
          setText(event.target.value);
          if (event.target.value.trim()) setNeedQuestion(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void submit();
          }
        }}
      />
      {needQuestion && withSituation && (
        <p className="askbot-need-question" role="alert">
          Write your question first, then press Ask.
        </p>
      )}
      {situation?.enabled && !dock && <SituationFields value={situation.value} onChange={situation.onChange} />}
      <div className="askbot-form-row">
        {situation ? (
          <button
            type="button"
            className={`askbot-situation-toggle ${situation.enabled ? 'on' : ''}`}
            aria-pressed={situation.enabled}
            title={
              situation.enabled
                ? 'Remove your situation'
                : 'Add your age, income and savings for an answer that fits you'
            }
            onClick={() => situation.onToggle(!situation.enabled)}
          >
            {situation.enabled ? <X size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
            My situation
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          className="askbot-submit"
          aria-label={compact && !dock ? 'Ask follow-up' : 'Ask'}
          disabled={busy || (!text.trim() && !hasSituation)}
        >
          {busy ? <Loader2 size={18} className="askbot-spin" /> : <ArrowUp size={18} strokeWidth={2.4} />}
        </button>
      </div>
    </form>
  );
}

const noSubscription = () => () => {};

/** The `?ask=` question from the URL; empty while rendering on the server. */
function useAskParam(): string {
  return useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get('ask') ?? '',
    () => '',
  );
}

export function AskSeanChat({ showFeed = true }: { showFeed?: boolean }) {
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [feed, setFeed] = useState<AskFeedItem[] | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  // An old article link redirects here as ?ask=<its question>: fill it in, never send it.
  const prefill = useAskParam().slice(0, MAX_QUESTION_CHARS);

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
    const page = window.location.pathname;
    window.history.replaceState(null, '', next.private ? page : `${page}?q=${next.parentId ?? next.id}`);
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

  // A shared link (?q=<id>) opens that answer; state is only set once the fetch settles.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('q');
    if (!id) return;
    fetchQuestion(id)
      .then(show)
      .catch((problem: Error) => setError(problem.message));
  }, [show]);

  useEffect(() => {
    if (showFeed) loadFeed(sort);
  }, [sort, loadFeed, showFeed]);

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
      if (!result.private && showFeed) loadFeed(sort);
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

  /** Back to the full form at the top, keeping whatever situation was entered. */
  const startOver = () => {
    setAnswer(null);
    setError('');
    window.history.replaceState(null, '', window.location.pathname);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const situationControl: SituationControl = {
    enabled: situationOn,
    value: situation,
    onToggle: setSituationOn,
    onChange: setSituation,
  };

  return (
    <div className="askbot">
      {/* Once an answer is showing, the question moves to the bar under it. */}
      <section className="askbot-ask" hidden={Boolean(answer)}>
        <QuestionForm
          key={prefill}
          onSubmit={(question) => ask(question)}
          busy={busy}
          placeholder="Ask any property question"
          situation={situationControl}
          initialText={prefill}
        />
        <div className="askbot-examples" aria-label="Try asking">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" disabled={busy} onClick={() => void ask(example)}>
              {example}
            </button>
          ))}
        </div>
        <p className="askbot-disclaimer">
          Answers are written by AI in Sean&apos;s voice, not by Sean himself. For reference only, not
          financial advice.
        </p>
      </section>

      <div ref={answerRef} className="askbot-answer-slot">
        {busy && !answer && (
          <p className="askbot-loading">
            <Loader2 size={16} className="askbot-spin" /> Going through Sean&apos;s episodes…
          </p>
        )}
        {error && <p className="askbot-error">{error}</p>}
        {answer && (
          <div className="askbot-thread">
            <AnswerView answer={answer} />
            {answer.followUps?.map((followUp) => <AnswerView key={followUp.id} answer={followUp} nested />)}
            <div className="askbot-thread-actions">
              {!answer.private && (
                <button type="button" className="askbot-share" onClick={() => void copyLink()}>
                  <Link2 size={14} /> {copied ? 'Link copied' : 'Copy link to this answer'}
                </button>
              )}
              <button type="button" className="askbot-share" onClick={startOver}>
                <RotateCcw size={14} /> Ask a new question
              </button>
            </div>
            <div className="askbot-dock">
              <QuestionForm
                compact
                dock
                busy={busy}
                placeholder={canFollowUp ? 'Ask a follow-up, or a new question' : 'Ask a new question'}
                onSubmit={(question) => (canFollowUp ? ask(question, answer) : ask(question))}
                situation={canFollowUp ? undefined : situationControl}
              />
            </div>
          </div>
        )}
      </div>

      {showFeed && (
        <section className="askbot-feed" aria-labelledby="askbot-feed-title">
          <div className="askbot-feed-head">
            <h2 id="askbot-feed-title">
              <MessageCircleQuestion size={18} /> What others are asking
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
                  {order === 'recent' ? 'Recent' : 'Most asked'}
                </button>
              ))}
            </div>
          </div>
          {feed === null && <p className="askbot-hint">Loading…</p>}
          {feed?.length === 0 && <p className="askbot-hint">No questions yet. Ask the first one.</p>}
          <ul className="askbot-feed-list">
            {feed?.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => void open(item.id)}>
                  <span className="askbot-feed-meta">
                    {timeAgo(item.lastAskedAt)}
                    {item.askCount > 1 && ` · asked ${item.askCount} times`}
                  </span>
                  <span className="askbot-feed-question">{item.question}</span>
                  {item.tldr && <span className="askbot-feed-tldr">{item.tldr}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
