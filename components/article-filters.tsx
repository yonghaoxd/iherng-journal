'use client';

import { useState } from 'react';
import {
  categories,
  categoryFor,
  keyPointsFor,
  propertyTypes,
  stages,
  stageFor,
  states,
  stateFor,
  viewsFor,
  viewsAsOf,
  type Article,
} from '@/lib/articles';
import { ArticleCard } from '@/components/journal';
import { SortMenu, type SortOrder } from '@/components/sort-menu';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface ArticleFilterGridProps {
  articles: Article[];
  /** Property reviews filter by type and stage; the other series by topic category. */
  filterMode?: 'category' | 'propertyType';
  /** Label for the series' own order (e.g. "Guide order"); when set, it is the default sort. */
  seriesOrderLabel?: string;
}

/** One row of filter options, each from a fixed, short list. */
interface Facet {
  key: string;
  label: string;
  ariaLabel: string;
  options: { value: string; label: string }[];
  valueOf: (article: Article) => string | undefined;
}

/** Cards shown at first, and added by each "Show more". */
const PAGE_SIZE = 12;
const ALL = 'all';

function propertyTypeFor(article: Article) {
  return 'propertyType' in article && typeof article.propertyType === 'string'
    ? article.propertyType
    : undefined;
}

const FACETS: Record<
  NonNullable<ArticleFilterGridProps['filterMode']>,
  Facet[]
> = {
  propertyType: [
    {
      key: 'type',
      label: 'Type',
      ariaLabel: 'Property type filters',
      options: propertyTypes.map((type) => ({ value: type, label: type })),
      valueOf: propertyTypeFor,
    },
    {
      key: 'stage',
      label: 'Stage',
      ariaLabel: 'Project stage filters',
      options: stages.map(({ id, label }) => ({ value: id, label })),
      valueOf: (article) => stageFor(article)?.id,
    },
    {
      key: 'state',
      label: 'State',
      ariaLabel: 'State filters',
      options: states.map((state) => ({ value: state, label: state })),
      valueOf: stateFor,
    },
  ],
  category: [
    {
      key: 'topic',
      label: 'Topics',
      ariaLabel: 'Topic filters',
      options: categories.map(({ id, label }) => ({ value: id, label })),
      valueOf: (article) => categoryFor(article)?.id,
    },
  ],
};

/** Ties, and videos without a view count yet, keep the series' own order. */
function sortArticles(list: Article[], order: SortOrder) {
  if (order === 'series') return list;
  const indexed = list.map((article, index) => ({ article, index }));
  indexed.sort((a, b) => {
    let diff = 0;
    if (order === 'latest') diff = b.article.date.localeCompare(a.article.date);
    else if (order === 'oldest')
      diff = a.article.date.localeCompare(b.article.date);
    else {
      const va = viewsFor(a.article);
      const vb = viewsFor(b.article);
      if (va === undefined || vb === undefined)
        diff = (va === undefined ? 1 : 0) - (vb === undefined ? 1 : 0);
      else diff = order === 'most-viewed' ? vb - va : va - vb;
    }
    return diff || a.index - b.index;
  });
  return indexed.map(({ article }) => article);
}

function matchesSearch(article: Article, query: string) {
  if (!query) return true;
  return [
    article.title,
    article.excerpt,
    article.tag,
    categoryFor(article)?.label,
    propertyTypeFor(article),
    stageFor(article)?.label,
    article.location,
    ...keyPointsFor(article),
  ].some((text) => text?.toLowerCase().includes(query));
}

export function ArticleFilterGrid({
  articles,
  filterMode = 'category',
  seriesOrderLabel,
}: ArticleFilterGridProps) {
  const facets = FACETS[filterMode];
  const defaultOrder: SortOrder = seriesOrderLabel ? 'series' : 'latest';
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultOrder);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const chosen = (facet: Facet) => selected[facet.key] ?? ALL;
  const matchesFacets = (article: Article, except?: Facet) =>
    facets.every(
      (facet) =>
        facet === except ||
        chosen(facet) === ALL ||
        facet.valueOf(article) === chosen(facet),
    );

  // Each row counts the stories that match the other rows, so the numbers
  // always say what a click will show. Options no story uses are hidden.
  const rows = facets.map((facet) => {
    const base = articles.filter((article) => matchesFacets(article, facet));
    const options = facet.options
      .filter((option) =>
        articles.some((a) => facet.valueOf(a) === option.value),
      )
      .map((option) => ({
        ...option,
        count: base.filter((a) => facet.valueOf(a) === option.value).length,
      }));
    return {
      facet,
      options: [{ value: ALL, label: 'All', count: base.length }, ...options],
    };
  });

  const selectedLabels = rows
    .map(({ facet, options }) =>
      chosen(facet) === ALL
        ? undefined
        : options.find((o) => o.value === chosen(facet))?.label,
    )
    .filter(Boolean)
    .join(' · ');

  const query = searchQuery.trim().toLowerCase();
  const filtered = sortArticles(
    articles.filter(
      (article) => matchesFacets(article) && matchesSearch(article, query),
    ),
    sortOrder,
  );

  // "Show more" starts over whenever the filter, search or order changes.
  const viewKey = `${JSON.stringify(selected)}|${searchQuery}|${sortOrder}`;
  const [paging, setPaging] = useState({ key: viewKey, count: PAGE_SIZE });
  if (paging.key !== viewKey) {
    // Adjusting state while rendering, so returning to an earlier view doesn't
    // bring back how far it had been expanded.
    setPaging({ key: viewKey, count: PAGE_SIZE });
  }
  const visibleCount = paging.key === viewKey ? paging.count : PAGE_SIZE;
  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  const byViews = sortOrder === 'most-viewed' || sortOrder === 'least-viewed';
  const isFiltered =
    selectedLabels !== '' || searchQuery !== '' || sortOrder !== defaultOrder;
  const resetAll = () => {
    setSelected({});
    setSearchQuery('');
    setSortOrder(defaultOrder);
  };

  return (
    <div className="filter-system">
      <div className="filter-controls">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            placeholder="Search stories…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search articles"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="clear-search"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <SortMenu
          value={sortOrder}
          onChange={setSortOrder}
          seriesOrderLabel={seriesOrderLabel}
        />
      </div>

      <div className="topic-bars">
        {rows.map(({ facet, options }) => (
          <div className="topic-bar" key={facet.key}>
            <span className="topic-bar-label" aria-hidden="true">
              {facet.label}
            </span>
            <div
              className="tag-pills"
              role="tablist"
              aria-label={facet.ariaLabel}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={chosen(facet) === option.value}
                  // Nothing to show with the other filters as they are.
                  disabled={
                    option.count === 0 && chosen(facet) !== option.value
                  }
                  onClick={() =>
                    setSelected((current) => ({
                      ...current,
                      [facet.key]: option.value,
                    }))
                  }
                  className={`tag-pill ${chosen(facet) === option.value ? 'active' : ''}`}
                >
                  {option.label}
                  <span className="tag-pill-count">{option.count}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="filter-status">
        <span>
          Showing <strong>{visible.length}</strong> of {filtered.length}{' '}
          {filtered.length === 1 ? 'story' : 'stories'}
          {selectedLabels && (
            <span>
              {' '}
              in <em>{selectedLabels}</em>
            </span>
          )}
          {searchQuery && <span> matching &ldquo;{searchQuery}&rdquo;</span>}
          {byViews && (
            <span className="views-note">
              {' '}
              · YouTube views as of {viewsAsOf()}
            </span>
          )}
        </span>
        {isFiltered && (
          <button type="button" onClick={resetAll} className="reset-filters">
            Reset filters
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <>
          <div className="article-grid">
            {visible.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
          {remaining > 0 && (
            <div className="show-more-row">
              <button
                type="button"
                className="show-more"
                onClick={() =>
                  setPaging({ key: viewKey, count: visibleCount + PAGE_SIZE })
                }
              >
                Show more stories
                <span className="show-more-count">{remaining} more</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="no-results">
          <SlidersHorizontal size={36} />
          <p>No stories found matching your criteria.</p>
          <button type="button" onClick={resetAll} className="btn-outline">
            View all stories
          </button>
        </div>
      )}
    </div>
  );
}
