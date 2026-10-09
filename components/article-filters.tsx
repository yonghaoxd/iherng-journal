'use client';

import { useState, useMemo } from 'react';
import {
  keyPointsFor,
  viewsFor,
  viewsAsOf,
  type Article,
} from '@/lib/articles';
import { ArticleCard } from '@/components/journal';
import { SortMenu, type SortOrder } from '@/components/sort-menu';
import { Search, Sparkles, SlidersHorizontal } from 'lucide-react';

interface ArticleFilterGridProps {
  articles: Article[];
  availableTags?: string[];
  filterMode?: 'tag' | 'propertyType';
  /** Label for the series' own order (e.g. "Guide order"); when set, it is the default sort. */
  seriesOrderLabel?: string;
}

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

export function ArticleFilterGrid({
  articles,
  availableTags,
  filterMode = 'tag',
  seriesOrderLabel,
}: ArticleFilterGridProps) {
  const defaultOrder: SortOrder = seriesOrderLabel ? 'series' : 'latest';
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultOrder);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const tags = useMemo(() => {
    if (availableTags && availableTags.length > 0) {
      return ['All', ...availableTags];
    }
    const set = new Set<string>();
    articles.forEach((a) => {
      const value = filterMode === 'propertyType' ? propertyTypeFor(a) : a.tag;
      if (value) set.add(value);
    });
    return ['All', ...Array.from(set)];
  }, [articles, availableTags, filterMode]);

  const filtered = useMemo(() => {
    const matches = articles.filter((article) => {
      const filterValue =
        filterMode === 'propertyType' ? propertyTypeFor(article) : article.tag;
      const matchesTag = selectedTag === 'All' || filterValue === selectedTag;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesTag;

      const matchesQuery =
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.tag.toLowerCase().includes(query) ||
        (propertyTypeFor(article)?.toLowerCase().includes(query) ?? false) ||
        (article.location && article.location.toLowerCase().includes(query)) ||
        keyPointsFor(article).some((t) => t.toLowerCase().includes(query));

      return matchesTag && matchesQuery;
    });
    return sortArticles(matches, sortOrder);
  }, [articles, filterMode, selectedTag, searchQuery, sortOrder]);

  const byViews = sortOrder === 'most-viewed' || sortOrder === 'least-viewed';

  return (
    <div className="filter-system">
      <div className="filter-controls">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            placeholder="Search topics, properties, advice..."
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

        <div className="filter-actions">
          <div
            className="tag-pills"
            role="tablist"
            aria-label={
              filterMode === 'propertyType'
                ? 'Property type filters'
                : 'Topic filters'
            }
          >
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                role="tab"
                aria-selected={selectedTag === tag}
                onClick={() => setSelectedTag(tag)}
                className={`tag-pill ${selectedTag === tag ? 'active' : ''}`}
              >
                {tag === 'All' && <Sparkles size={12} className="pill-icon" />}
                {tag}
              </button>
            ))}
          </div>

          <SortMenu
            value={sortOrder}
            onChange={setSortOrder}
            seriesOrderLabel={seriesOrderLabel}
          />
        </div>
      </div>

      <div className="filter-status">
        <span>
          Showing <strong>{filtered.length}</strong> of {articles.length}{' '}
          stories
          {selectedTag !== 'All' && (
            <span>
              {' '}
              in <em>{selectedTag}</em>
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
        {(selectedTag !== 'All' ||
          searchQuery ||
          sortOrder !== defaultOrder) && (
          <button
            type="button"
            onClick={() => {
              setSelectedTag('All');
              setSearchQuery('');
              setSortOrder(defaultOrder);
            }}
            className="reset-filters"
          >
            Reset filters
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="article-grid">
          {filtered.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <SlidersHorizontal size={36} />
          <p>No stories found matching your criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedTag('All');
              setSearchQuery('');
              setSortOrder(defaultOrder);
            }}
            className="btn-outline"
          >
            View all stories
          </button>
        </div>
      )}
    </div>
  );
}
