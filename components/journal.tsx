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
} from 'lucide-react';
import {
  articles,
  imageFor,
  dateFor,
  readingTime,
  series,
  type Article,
  type SeriesKey,
} from '@/lib/articles';
import { ArticleFilterGrid } from '@/components/article-filters';

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

export function PropertySection() {
  const propertyArticles = articles.filter(
    (a) => a.series === 'property-reviews'
  );

  return (
    <section className="article-section" id="property-reviews-preview">
      <div className="section-top">
        <div>
          <div className="section-eyebrow-wrap">
            <Building2 size={14} className="text-accent" />
            <span className="eyebrow">SERIES 01 / ON LOCATION</span>
          </div>
          <h2 className="section-title">
            Property Reviews <span className="count-pill">{String(propertyArticles.length).padStart(2, '0')}</span>
          </h2>
          <p className="section-subtitle">
            Walkthroughs of Malaysian homes with Sean. Step inside the spaces and look beyond the sales brochure.
          </p>
        </div>
        <Link className="editorial-btn" href="/property-reviews">
          <span>Explore all reviews</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="article-grid">
        {propertyArticles.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  );
}

export function PodcastSection() {
  const podcastArticles = articles.filter(
    (a) => a.series === 'iherng-podcast'
  );

  return (
    <section className="podcast-section" id="podcast-preview">
      <div className="podcast-intro">
        <div className="podcast-eyebrow-wrap">
          <Headphones size={15} />
          <span>SERIES 02 / IN CONVERSATION</span>
        </div>
        <h2>
          Good questions.<br />
          <em>Better perspectives.</em>
        </h2>
        <p>
          Deep dives from the Asking Sean podcast on lifestyle choices, property expectations, and navigating the Malaysian housing market.
        </p>
        <Link href="/iherng-podcast" className="podcast-cta-btn">
          <span>Browse all podcast reads</span>
          <ArrowUpRight size={18} />
        </Link>
      </div>

      <div className="podcast-list">
        {podcastArticles.map((a) => (
          <article key={a.slug} className="podcast-card-item">
            <Link
              href={`/articles/${a.slug}`}
              className="podcast-thumb-wrap"
              aria-label={`Read ${a.title}`}
            >
              <img
                src={imageFor(a)}
                alt={`Thumbnail: ${a.videoTitle}`}
                width={1280}
                height={720}
                loading="lazy"
              />
              <span className="podcast-thumb-play">
                <Play size={12} fill="currentColor" />
              </span>
            </Link>

            <div className="podcast-info">
              <div className="podcast-meta">
                <span className="podcast-ep-badge">ASKING SEAN #{a.episode}</span>
                <span className="podcast-tag">{a.tag}</span>
                <span className="podcast-time">
                  <Clock size={11} /> {readingTime(a)} min read
                </span>
              </div>
              <h3 className="podcast-title">
                <Link href={`/articles/${a.slug}`}>{a.title}</Link>
              </h3>
              <p className="podcast-excerpt">{a.excerpt}</p>
            </div>

            <Link
              className="podcast-arrow-btn"
              href={`/articles/${a.slug}`}
              aria-label={`Read ${a.title}`}
            >
              <ArrowUpRight size={20} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BuyerGuidesSection() {
  const guideArticles = articles.filter((a) => a.series === 'buyer-guides');

  return (
    <section className="article-section" id="buyer-guides-preview">
      <div className="section-top">
        <div>
          <div className="section-eyebrow-wrap">
            <BookOpen size={14} className="text-accent" />
            <span className="eyebrow">SERIES 03 / THE PLAYBOOK</span>
          </div>
          <h2 className="section-title">
            Buyer Guides &amp; Playbooks <span className="count-pill">03</span>
          </h2>
          <p className="section-subtitle">
            Practical frameworks on defect inspections, purchasing channels, and avoiding costly homebuyer mistakes.
          </p>
        </div>
        <Link className="editorial-btn" href="/buyer-guides">
          <span>Explore all guides</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="article-grid">
        {guideArticles.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  );
}

export function SeriesPage({ id }: { id: SeriesKey }) {
  const info = series[id];
  const entries = articles.filter((a) => a.series === id);
  const isProperty = id === 'property-reviews';
  const isPodcast = id === 'iherng-podcast';
  const isGuide = id === 'buyer-guides';

  const otherSeriesKeys = (Object.keys(series) as SeriesKey[]).filter(
    (k) => k !== id
  );

  return (
    <main id="main" className="container series-page">
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
        <ArticleFilterGrid articles={entries} />
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
