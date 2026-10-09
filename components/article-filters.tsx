'use client';

import { useState, useMemo } from 'react';
import {
  categories,
  categoryFor,
  keyPointsFor,
  propertyTypes,
  viewsFor,
  viewsAsOf,
  type Article,
} from '@/lib/articles';
import { ArticleCard } from '@/components/journal';
import { SortMenu, type SortOrder } from '@/components/sort-menu';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface ArticleFilterGridProps {
  articles: Article[];
  /** Property reviews filter by type; the other series by fixed topic category. */
  filterMode?: 'category' | 'propertyType';
  /** Label for the series' own order (e.g. "Guide order"); when set, it is the default sort. */
  seriesOrderLabel?: string;
}

/** Cards shown at first, and added by each "Show more". */
const PAGE_SIZE = 12;
const ALL = 'all';

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

function propertyTypeFor(article: Article) {
  return 'propertyType' in article && typeof article.propertyType === 'string'
    ? article.propertyType
    : undefined;
}

function filterValueFor(
  article: Article,
  mode: ArticleFilterGridProps['filterMode'],
) {
  return mode === 'propertyType'
    ? propertyTypeFor(article)
    : categoryFor(article)?.id;
}

export function ArticleFilterGrid({
  articles,
  filterMode = 'category',
  seriesOrderLabel,
}: ArticleFilterGridProps) {
  const defaultOrder: SortOrder = seriesOrderLabel ? 'series' : 'latest';
  const [selected, setSelected] = useState<string>(ALL);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultOrder);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // A fixed, short list in a fixed order; options with no stories are hidden.
  const options = useMemo(() => {
    const fixed =
      filterMode === 'propertyType'
        ? propertyTypes.map((type) => ({ value: type, label: type }))
        : categories.map(({ id, label }) => ({ value: id, label }));
    return fixed
      .map((option) => ({
        ...option,
        count: articles.filter(
          (a) => filterValueFor(a, filterMode) === option.value,
        ).length,
      }))
      .filter((option) => option.count > 0);
  }, [articles, filterMode]);

  const selectedLabel = options.find((o) => o.value === selected)?.label;

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = articles.filter((article) => {
      if (selected !== ALL && filterValueFor(article, filterMode) !== selected)
        return false;
      if (!query) return true;
      return [
        article.title,
        article.excerpt,
        article.tag,
        categoryFor(article)?.label,
        propertyTypeFor(article),
        article.location,
        ...keyPointsFor(article),
      ].some((text) => text?.toLowerCase().includes(query));
    });
    return sortArticles(matches, sortOrder);
  }, [articles, filterMode, selected, searchQuery, sortOrder]);

  // "Show more" starts over whenever the filter, search or order changes.
  const viewKey = `${selected}|${searchQuery}|${sortOrder}`;
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
    selected !== ALL || searchQuery !== '' || sortOrder !== defaultOrder;
  const resetAll = () => {
    setSelected(ALL);
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

      <div className="topic-bar">
        <span className="topic-bar-label" aria-hidden="true">
          {filterMode === 'propertyType' ? 'Type' : 'Topics'}
        </span>
        <div
          className="tag-pills"
          role="tablist"
          aria-label={
            filterMode === 'propertyType'
              ? 'Property type filters'
              : 'Topic filters'
          }
        >
          {[
            { value: ALL, label: 'All', count: articles.length },
            ...options,
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected === option.value}
              onClick={() => setSelected(option.value)}
              className={`tag-pill ${selected === option.value ? 'active' : ''}`}
            >
              {option.label}
              <span className="tag-pill-count">{option.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="filter-status">
        <span>
          Showing <strong>{visible.length}</strong> of {filtered.length}{' '}
          {filtered.length === 1 ? 'story' : 'stories'}
          {selectedLabel && (
            <span>
              {' '}
              in <em>{selectedLabel}</em>
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
