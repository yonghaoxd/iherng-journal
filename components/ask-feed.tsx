'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Triangle } from 'lucide-react';
import { fetchFeed, FEED_MORE, FEED_PAGE, voteQuestion, type AskFeedItem } from '@/lib/ask-api';
import { ASKED_EVENT, OPEN_QUESTION_EVENT } from '@/components/ask-sean-chat';

type Sort = 'recent' | 'popular';

/** How often the feed checks for questions asked since it loaded. */
const POLL_MS = 60_000;
/** Question ids this browser marked as helpful, so the arrow stays lit on return. */
const VOTES_KEY = 'aiherng-votes';

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kuala_Lumpur' });
}

function readVotes(): Set<string> {
  try {
    const saved = JSON.parse(window.localStorage.getItem(VOTES_KEY) ?? '[]');
    return new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveVotes(votes: Set<string>) {
  try {
    window.localStorage.setItem(VOTES_KEY, JSON.stringify([...votes].slice(-500)));
  } catch {
    // Storage can be blocked; the vote still counts on the server.
  }
}

const openQuestion = (id: string) => window.dispatchEvent(new CustomEvent(OPEN_QUESTION_EVENT, { detail: id }));

/**
 * The public feed, after ask.lizheng.ai: recent or most asked, similar questions grouped,
 * and a helpful vote on each. Opening a question shows it in the chat above.
 */
export function AskFeed() {
  const [sort, setSort] = useState<Sort>('recent');
  const [items, setItems] = useState<AskFeedItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fresh, setFresh] = useState(0);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  // Items only load after mount, so reading storage here cannot change the server render.
  const [voted, setVoted] = useState<Set<string>>(() => (typeof window === 'undefined' ? new Set() : readVotes()));
  const newest = useRef('');

  const load = useCallback((order: Sort) => {
    fetchFeed(order)
      .then((page) => {
        setItems(page.items);
        setTotal(page.total);
        setHasMore(page.items.length === FEED_PAGE);
        setFresh(0);
        if (order === 'recent') newest.current = page.items[0]?.lastAskedAt ?? '';
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load(sort);
  }, [sort, load]);

  // A new public answer from the chat: show it straight away.
  useEffect(() => {
    const onAsked = () => load(sort);
    window.addEventListener(ASKED_EVENT, onAsked);
    return () => window.removeEventListener(ASKED_EVENT, onAsked);
  }, [sort, load]);

  // Check now and then for questions asked by others since the list loaded.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      fetchFeed('recent')
        .then((page) => {
          if (!newest.current) {
            newest.current = page.items[0]?.lastAskedAt ?? '';
            return;
          }
          setFresh(page.items.filter((item) => item.lastAskedAt > newest.current).length);
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const loadMore = () => {
    if (!items) return;
    setLoadingMore(true);
    fetchFeed(sort, items.length, FEED_MORE)
      .then((page) => {
        setItems([...items, ...page.items.filter((item) => !items.some((shown) => shown.id === item.id))]);
        setHasMore(page.items.length === FEED_MORE);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  };

  const toggleVote = (item: AskFeedItem) => {
    const on = !voted.has(item.id);
    const apply = (votes: number, mark: boolean) => {
      setItems((current) => current?.map((row) => (row.id === item.id ? { ...row, votes } : row)) ?? current);
      setVoted((current) => {
        const next = new Set(current);
        if (mark) next.add(item.id);
        else next.delete(item.id);
        saveVotes(next);
        return next;
      });
    };
    apply(Math.max(0, item.votes + (on ? 1 : -1)), on);
    voteQuestion(item.id, on)
      .then((result) => apply(result.votes, result.voted))
      .catch(() => apply(item.votes, !on));
  };

  const toggleOpen = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="feed" className="askfeed" aria-labelledby="askfeed-title">
      <div className="askfeed-side">
        <h2 id="askfeed-title">What others are asking</h2>
        <p>Real questions and answers. What you want to ask may already be here.</p>
        <div className="askfeed-tabs" role="tablist" aria-label="Sort questions">
          {(['recent', 'popular'] as const).map((order) => (
            <button
              key={order}
              type="button"
              role="tab"
              aria-selected={sort === order}
              className={sort === order ? 'on' : ''}
              onClick={() => setSort(order)}
            >
              {order === 'recent' ? 'Recent' : 'Most asked'}
            </button>
          ))}
        </div>
        <button type="button" className={`askfeed-refresh ${fresh ? 'fresh' : ''}`} onClick={() => load(sort)}>
          {fresh ? (
            <>
              <span className="askfeed-dot" aria-hidden="true" />
              {fresh} new question{fresh === 1 ? '' : 's'}, tap to refresh
            </>
          ) : (
            'Refresh the list'
          )}
        </button>
        {total > 0 && <span className="askfeed-total">{total.toLocaleString('en-MY')} public questions so far</span>}
      </div>

      <div className="askfeed-list">
        {items === null && <p className="askfeed-empty">Loading…</p>}
        {items?.length === 0 && <p className="askfeed-empty">No questions yet. Ask the first one.</p>}
        {items?.map((item) => {
          const isOpen = open.has(item.id);
          const mine = voted.has(item.id);
          const similar = item.similar ?? [];
          return (
            <article key={item.id} className="askfeed-item">
              <div className="askfeed-main">
                <span className={`askfeed-meta ${sort === 'recent' ? 'recent' : ''}`}>
                  {sort === 'recent'
                    ? timeAgo(item.lastAskedAt)
                    : `Asked ${item.askCount} time${item.askCount === 1 ? '' : 's'}${item.similarCount ? ', counting similar questions' : ''}`}
                </span>
                <button type="button" className="askfeed-question" onClick={() => openQuestion(item.id)}>
                  {item.question}
                </button>
                {item.tldr && <p className="askfeed-tldr">{item.tldr}</p>}
                {similar.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="askfeed-expand"
                      aria-expanded={isOpen}
                      onClick={() => toggleOpen(item.id)}
                    >
                      {item.similarCount} similar question{item.similarCount === 1 ? '' : 's'}
                      <ChevronDown size={14} aria-hidden="true" className={isOpen ? 'flipped' : ''} />
                    </button>
                    {isOpen && (
                      <ul className="askfeed-others">
                        {similar.map((other) => (
                          <li key={`${other.id}-${other.askedAt}`}>
                            <span>{shortDate(other.askedAt)}</span>
                            <button type="button" onClick={() => openQuestion(other.id)}>
                              {other.question}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
              <button
                type="button"
                className={`askfeed-vote ${mine ? 'on' : ''}`}
                aria-pressed={mine}
                aria-label={mine ? 'Remove your helpful vote' : 'Mark this question as helpful'}
                title={mine ? 'Remove your vote' : 'This question helped me'}
                onClick={() => toggleVote(item)}
              >
                <Triangle size={11} fill="currentColor" aria-hidden="true" />
                <span>{item.votes}</span>
              </button>
            </article>
          );
        })}
        {hasMore && (
          <div className="askfeed-more-row">
            <button type="button" className="askfeed-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'See more questions'}
              <ChevronDown size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
