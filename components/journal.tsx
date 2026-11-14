import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  Headphones,
  Clock,
  MapPin,
  Sparkles,
  Building2,
  BookOpen,
  Eye,
  HardHat,
  CircleCheck,
} from 'lucide-react';
import {
  articles,
  imageFor,
  dateFor,
  readingTime,
  series,
  viewsFor,
  formatViews,
  stageFor,
  type Article,
  type SeriesKey,
} from '@/lib/articles';
import { ArticleFilterGrid } from '@/components/article-filters';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbJsonLd, seriesJsonLd } from '@/lib/seo';

export function ArticleCard({
  article,
  showSeries = false,
}: {
  article: Article;
  showSeries?: boolean;
}) {
  const isReview = article.series === 'property-reviews';
  const isPodcast = article.series === 'iherng-podcast';
  const isGuide = article.series === 'buyer-guides';
  const views = viewsFor(article);
  const stage = stageFor(article);

  return (
    <article className="article-card group">
      <Link
        href={`/articles/${article.slug}`}
        className="card-image-wrap"
        aria-label={`Read article: ${article.title}`}
      >
        <div className="card-image-container">
          <img
            src={imageFor(article)}
            alt={`Video thumbnail: ${article.videoTitle}`}
            width={1280}
            height={720}
            loading="lazy"
            className="card-image"
          />
          <div className="card-overlay" />
          <span className="video-duration-pill">
            <Play size={10} fill="currentColor" />
            <span>{article.duration}</span>
          </span>
          {stage && (
            <span className={`stage-badge ${stage.id}`} title={stage.note}>
              {stage.id === 'show-unit' ? (
                <HardHat size={11} aria-hidden="true" />
              ) : (
                <CircleCheck size={11} aria-hidden="true" />
              )}
              {stage.label}
            </span>
          )}
          {showSeries && (
            <span
              className={`series-badge ${
                isReview ? 'review' : isPodcast ? 'podcast' : 'guide'
              }`}
            >
              {isReview && <Building2 size={11} />}
              {isPodcast && <Headphones size={11} />}
              {isGuide && <BookOpen size={11} />}
              {isReview
                ? 'Property Review'
                : isPodcast
                ? 'iherng Podcast'
                : 'Buyer Guide'}
            </span>
          )}
        </div>
      </Link>

      <div className="card-copy">
        <div className="card-meta-top">
          {isReview &&
            'propertyType' in article &&
            typeof article.propertyType === 'string' && (
            <span className="property-type-chip">{article.propertyType}</span>
          )}
          <span className="tag-chip">{article.tag}</span>
          <span className="episode-chip">
            {isReview
              ? `Review #${article.episode}`
              : isPodcast
              ? `Asking Sean #${article.episode}`
              : `Guide #${article.episode}`}
          </span>
          {'location' in article && article.location && (
            <span className="location-chip">
              <MapPin size={11} />
              {article.location}
            </span>
          )}
        </div>

        <h3 className="card-title">
          <Link href={`/articles/${article.slug}`}>{article.title}</Link>
        </h3>

        <p className="card-excerpt">{article.excerpt}</p>

        <div className="card-bottom">
          <div className="card-stats">
            <span className="read-time">
              <Clock size={12} />
              {readingTime(article)} min read
            </span>
            <span className="dot-sep">·</span>
            <span className="pub-date">{dateFor(article)}</span>
            {views !== undefined && (
              <>
                <span className="dot-sep">·</span>
                <span className="view-count" title={`${views.toLocaleString('en-US')} YouTube views`}>
                  <Eye size={12} />
                  {formatViews(views)}
                </span>
              </>
            )}
          </div>
          <Link
            href={`/articles/${article.slug}`}
            className="card-arrow-link"
            aria-label={`Read article: ${article.title}`}
          >
            <span>Read summary</span>
            <ArrowUpRight size={16} className="arrow-icon" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function SeriesPage({ id }: { id: SeriesKey }) {
  const info = series[id];
  const entries = articles.filter((a) => a.series === id);
  const isProperty = id === 'property-reviews';
  const isPodcast = id === 'iherng-podcast';
  const isGuide = id === 'buyer-guides';
  const landedCount = entries.filter(
    (article) => 'propertyType' in article && article.propertyType === 'Landed'
  ).length;
  const highRiseCount = entries.filter(
    (article) => 'propertyType' in article && article.propertyType === 'High-Rise'
  ).length;

  const otherSeriesKeys = (Object.keys(series) as SeriesKey[]).filter(
    (k) => k !== id
  );

  return (
    <main id="main" className="container series-page">
      <JsonLd data={seriesJsonLd(id)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: info.title, path: `/${id}` },
        ])}
      />

      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="slash">/</span>
        <span className="active">{info.title}</span>
      </div>

      <section className="series-hero-banner">
        <div className="hero-badge">
          {isProperty && <Building2 size={13} />}
          {isPodcast && <Headphones size={13} />}
          {isGuide && <BookOpen size={13} />}
          <span>
            SERIES {info.number} · {info.label}
          </span>
        </div>
        <h1 className="series-heading">
          {info.title}
          <span className="orange-dot">.</span>
        </h1>
        <div className="series-intro-row">
          <p className="series-intro-text">{info.intro}</p>
          <div className="series-metric-chips">
            <span className="metric-chip">
              <strong>{String(entries.length).padStart(2, '0')}</strong> Published Reads
            </span>
            {isProperty && (
              <>
                <span className="metric-chip">
                  <strong>{String(landedCount).padStart(2, '0')}</strong> Landed
                </span>
                <span className="metric-chip">
                  <strong>{String(highRiseCount).padStart(2, '0')}</strong> High-Rise
                </span>
              </>
            )}
            <span className="metric-chip">
              <strong>100%</strong> Verified Sources
            </span>
          </div>
        </div>
      </section>

      <section
        className="series-content-hub"
        aria-label={`${info.title} directory`}
      >
        <ArticleFilterGrid
          articles={entries}
          filterMode={isProperty ? 'propertyType' : 'category'}
          seriesOrderLabel={isGuide ? 'Guide order' : undefined}
        />
      </section>

      <aside className="other-series-banner">
        <div className="other-series-content">
          <span className="eyebrow">
            <Sparkles size={12} className="inline mr-1" />
            EXPLORE OTHER SERIES
          </span>
          <h3>Keep discovering stories across the journal</h3>
          <p>
            Browse verified property reviews, candid podcast debates, and practical buyer playbooks.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {otherSeriesKeys.map((key) => (
            <Link
              key={key}
              href={`/${key}`}
              className="other-series-link"
            >
              <span>{series[key].title}</span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </aside>
    </main>
  );
}
