'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  CornerDownRight,
  Loader2,
  Lock,
  Play,
  Plus,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import {
  askSeanStream,
  fetchQuestion,
  MAX_QUESTION_CHARS,
  MAX_SITUATION_CHARS,
  splitDraft,
  type AskAnswer,
  type AskSituation,
  type AskSource,
} from '@/lib/ask-api';

const EXAMPLES = [
  'Own stay or investment for my first property?',
  'Landed or condo: which holds its value better?',
  'Should I settle my housing loan early?',
  'New launch or subsale?',
];

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

/** One card per cited episode: what it is and a way to watch it. */
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
                {source.answeredBy && (
                  <span className="askbot-source-guest">Answered by {source.answeredBy}, a guest on the show</span>
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

const SITUATION_LABELS: [keyof AskSituation, string][] = [
  ['current', 'Your situation'],
  ['goal', 'Your goal'],
  ['tried', 'Already tried'],
];

/** What the answer was given, so figures in it never look invented. */
function AskedWith({ situation }: { situation: AskSituation }) {
  const lines = SITUATION_LABELS.filter(([key]) => situation[key]?.trim());
  if (!lines.length) return null;
  return (
    <div className="askbot-asked-with">
      <span className="ask-label">Answered using what you told AIherng</span>
      {lines.map(([key, label]) => (
        <p key={key}>
          {lines.length > 1 && <strong>{label}: </strong>}
          {situation[key]}
        </p>
      ))}
    </div>
  );
}

/**
 * The question as a quiet quote card. A long one folds to three lines, so the answer
 * below it is never pushed out of sight.
 */
function QuestionCard({ answer, nested }: { answer: AskAnswer; nested: boolean }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const text = textRef.current;
    if (!text || expanded) return;
    const measure = () => setOverflows(text.scrollHeight > text.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    return () => observer.disconnect();
  }, [answer.question, expanded]);

  const folded = overflows && !expanded;
  return (
    <section className="askbot-question-card" aria-label={nested ? 'Your follow-up' : 'Your question'}>
      <span className="askbot-question-mark" aria-hidden="true">
        {nested ? <CornerDownRight size={18} /> : '\u201C'}
      </span>
      <div className="askbot-question-inner">
        <div className="askbot-question-head">
          <span className="askbot-question-label">{nested ? 'You followed up' : 'You asked'}</span>
          {answer.private && !nested ? (
            <span className="askbot-question-pill" title="Answered for your situation. Only you can see this; it is not saved.">
              <Lock size={11} aria-hidden="true" /> Private · not saved
            </span>
          ) : answer.askCount > 1 ? (
            <span className="askbot-question-pill">
              <Users size={11} aria-hidden="true" /> Asked {answer.askCount} times
            </span>
          ) : null}
        </div>
        <p ref={textRef} className={`askbot-question ${expanded ? '' : 'folded'} ${folded ? 'faded' : ''}`}>
          {answer.question}
        </p>
        {(overflows || expanded) && (
          <button
            type="button"
            className="askbot-question-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : 'Read the full question'}
            <ChevronDown size={13} aria-hidden="true" className={expanded ? 'flipped' : ''} />
          </button>
        )}
      </div>
    </section>
  );
}

/** Marks where the answer starts; a new answer scrolls here. */
function AnswerStart() {
  return (
    <div className="askbot-answer-start">
      <span className="askbot-ai-badge" aria-hidden="true">
        AI
      </span>
      <span className="askbot-answer-start-title">
        <em>AI</em>herng&apos;s answer
      </span>
    </div>
  );
}

function AnswerView({ answer, nested = false }: { answer: AskAnswer; nested?: boolean }) {
  return (
    <article className={`askbot-answer ${nested ? 'nested' : ''}`} aria-live="polite" aria-busy={answer.streaming}>
      <div className="askbot-answer-main">
        <QuestionCard key={answer.question} answer={answer} nested={nested} />
        {answer.private && !nested && answer.askedWith && <AskedWith situation={answer.askedWith} />}

        {answer.status === 'answered' && (answer.body || answer.streaming) ? (
          <>
            <AnswerStart />
            {answer.tldr && (
              <div className="askbot-tldr">
                <p>{answer.tldr}</p>
              </div>
            )}
            {answer.body && <AnswerBody body={answer.body} answerId={answer.id} />}
            {answer.streaming ? (
              <p className="askbot-loading askbot-writing">
                <Loader2 size={16} className="askbot-spin" /> AIherng is writing…
              </p>
            ) : (
              <p className="askbot-persona">Written by AI in Sean&apos;s voice, not by Sean himself. For reference only.</p>
            )}
            {!nested && !answer.streaming && <RelatedVideos related={answer.related} title="Related episodes" />}
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

/** A quiet count that appears only near the limit, so long text is never cut off unseen. */
function CharsLeft({ length, max }: { length: number; max: number }) {
  if (length < max * 0.8) return null;
  return (
    <span className={`askbot-chars ${length >= max ? 'full' : ''}`} aria-live="polite">
      {length.toLocaleString('en-MY')} / {max.toLocaleString('en-MY')}
    </span>
  );
}

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
        <CharsLeft length={current.length} max={MAX_SITUATION_CHARS} />
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
      <CharsLeft length={text.length} max={MAX_QUESTION_CHARS} />
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

/** Fired by the feed (components/ask-feed.tsx) to open a question here. */
export const OPEN_QUESTION_EVENT = 'aiherng:open';
/** Fired here when a new public answer is stored, so the feed can show it. */
export const ASKED_EVENT = 'aiherng:asked';

export function AskSeanChat() {
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const answerRef = useRef<HTMLDivElement>(null);
  // An old article link redirects here as ?ask=<its question>: fill it in, never send it.
  const prefill = useAskParam().slice(0, MAX_QUESTION_CHARS);

  const [situationOn, setSituationOn] = useState(false);
  const [situation, setSituation] = useState<AskSituation>({});
  // The situation a private answer was given with, re-sent for its follow-up.
  const privateSituation = useRef<AskSituation | undefined>(undefined);

  // Scrolls once the answer is on the page: to where it starts, or to the slot when
  // there is no answer heading (a question outside what AIherng covers).
  const [scrollRequest, setScrollRequest] = useState(0);
  const scrollToAnswer = useCallback(() => setScrollRequest((count) => count + 1), []);
  useEffect(() => {
    if (!scrollRequest) return;
    const slot = answerRef.current;
    const target = slot?.querySelector('.askbot-answer-start') ?? slot;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scrollRequest]);

  const show = useCallback(
    (next: AskAnswer, scroll = true) => {
      setAnswer(next);
      // The address bar stays the plain page, so sharing the site never shares an answer.
      window.history.replaceState(null, '', window.location.pathname);
      if (scroll) scrollToAnswer();
    },
    [scrollToAnswer],
  );

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
      .then((found) => show(found))
      .catch((problem: Error) => setError(problem.message));
  }, [show]);

  // The feed below the chat asks for a question to be opened here.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (typeof id === 'string') void open(id);
    };
    window.addEventListener(OPEN_QUESTION_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_QUESTION_EVENT, onOpen);
  }, [open]);

  /**
   * A new question, or a follow-up to `parent`. The answer streams in: a draft shows the
   * sources as soon as they are chosen and the text as it is written, then the finished
   * answer from the server replaces it.
   */
  const ask = async (question: string, parent?: AskAnswer): Promise<boolean> => {
    setBusy(true);
    setError('');
    const before = answer;
    const own = parent ? undefined : situationOn ? filledSituation(situation) : undefined;
    const isPrivate = parent ? Boolean(parent.private) : Boolean(own);
    const now = new Date().toISOString();
    let draft: AskAnswer | null = null;
    const render = (patch: Partial<AskAnswer>) => {
      const first = !draft;
      draft = {
        ...(draft ?? {
          id: 'draft',
          question,
          parentId: parent?.id ?? null,
          status: 'answered',
          tldr: '',
          body: '',
          message: null,
          sources: [],
          related: [],
          askCount: 1,
          createdAt: now,
          lastAskedAt: now,
          private: isPrivate,
          askedWith: own,
          streaming: true,
          followUps: [],
        }),
        ...patch,
      };
      const next = draft;
      if (parent) {
        setAnswer({ ...parent, followUps: [...(parent.followUps ?? []), next] });
      } else {
        setAnswer(next);
        if (first) scrollToAnswer();
      }
    };

    try {
      const options = parent?.private
        ? {
            situation: privateSituation.current,
            previous: { question: parent.question, tldr: parent.tldr ?? '' },
          }
        : parent
          ? { parentId: parent.id }
          : own
            ? { situation: own }
            : {};
      const result = await askSeanStream(question, options, {
        onSources: (sources, related) => render({ sources, related }),
        onText: (text) => render(splitDraft(text)),
      });
      if (parent) {
        setAnswer({ ...parent, followUps: [...(parent.followUps ?? []), result] });
      } else {
        privateSituation.current = own;
        // The draft already scrolled into view; a reused answer arrives without one.
        show({ ...result, askedWith: result.private ? own : undefined, followUps: [] }, !draft);
      }
      if (!result.private) window.dispatchEvent(new Event(ASKED_EVENT));
      return true;
    } catch (problem) {
      // Take back a half-written draft rather than leave it looking finished.
      if (draft) setAnswer(before);
      setError((problem as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
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

    </div>
  );
}
