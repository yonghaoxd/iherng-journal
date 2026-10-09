import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowUpRight,
  Play,
  Clock,
  ArrowLeft,
  ArrowRight,
  Building2,
  Headphones,
  MapPin,
  Calendar,
  Info,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  HardHat,
  CircleCheck,
} from 'lucide-react';
import {
  articles,
  askSeanFor,
  stageFor,
  monthYearFor,
  seriesFor,
  imageFor,
  dateFor,
  readingTime,
} from '@/lib/articles';
import { ArticleCard } from '@/components/journal';
import { AskSeanSummary } from '@/components/ask-sean-summary';
import { ShareButtons } from '@/components/share-buttons';
import { JsonLd } from '@/components/json-ld';
import {
  SITE_NAME,
  articleJsonLd,
  breadcrumbJsonLd,
  publishedAt,
  videoJsonLd,
} from '@/lib/seo';

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles.find((item) => item.slug === slug);
  if (!a) return { title: 'Story not found | iherng Journal' };

  // The root layout already applies the "%s | iherng Journal" template.
  return {
    title: a.title,
    description: a.excerpt,
    alternates: { canonical: `/articles/${a.slug}` },
    // A page-level `openGraph` replaces the layout's rather than merging into
    // it, so siteName and locale are repeated here on purpose.
    openGraph: {
      type: 'article',
      url: `/articles/${a.slug}`,
      siteName: SITE_NAME,
      locale: 'en_US',
      title: a.title,
      description: a.excerpt,
      publishedTime: publishedAt(a),
      section: seriesFor(a).title,
      tags: [a.tag],
      images: [{ url: imageFor(a), width: 1280, height: 720, alt: a.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: a.title,
      description: a.excerpt,
      images: [imageFor(a)],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  const info = seriesFor(article);
  const qa = askSeanFor(article);
  const isReview = article.series === 'property-reviews';
  const isPodcast = article.series === 'iherng-podcast';
  const isGuide = article.series === 'buyer-guides';
  const stage = stageFor(article);

  // Series articles for Next/Prev
  const seriesArticles = articles.filter((a) => a.series === article.series);
  const currentIndex = seriesArticles.findIndex((a) => a.slug === slug);
  const prevArticle = currentIndex > 0 ? seriesArticles[currentIndex - 1] : null;
  const nextArticle =
    currentIndex < seriesArticles.length - 1 ? seriesArticles[currentIndex + 1] : null;

  // Other related articles (same series, excluding current)
  const related = seriesArticles.filter((a) => a.slug !== slug);

  // Byline: date, reading time and video length.
  const metaBar = (
    <div className="article-meta-bar">
      <div className="byline-group">
        <div className="byline-avatar">i<span>.</span></div>
        <div className="byline-details">
          <strong>Editorial Summary from Sean Tan</strong>
          <div className="byline-sub">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {dateFor(article)}
            </span>
            <span className="sep">·</span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> {readingTime(article)} min read
            </span>
            <span className="sep">·</span>
            <span className="flex items-center gap-1">
              <Play size={12} /> {article.duration} video
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Editorial transparency note
  const editorialNote = (
    <div className="editorial-transparency-note">
      <Info size={16} className="note-icon" />
      {qa ? (
        <p>
          <strong>Editorial Note:</strong> Summarised from Sean Tan&apos;s full episode
          {qa.answeredBy ? (
            <>
              {' '}
              with {qa.answeredBy.name}. The answer is theirs, not Sean&apos;s; the quote is in
              their own words and the rest is our paraphrase. This is general information, not
              legal advice for your situation.
            </>
          ) : (
            <>. The quoted answer is in his own words; the rest is our paraphrase.</>
          )}{' '}
          Figures reflect the recording date, so check current rates and rules before acting on
          them.
        </p>
      ) : (
        <p>
          <strong>Editorial Note:</strong> This summary is distilled from Sean Tan&apos;s public
          video breakdown and verified episode documentation. All property specifications and
          opinions reflect the recording date and should be verified for present-day listings.
        </p>
      )}
    </div>
  );

  return (
    <main id="main" className="container article-page">
      <JsonLd data={articleJsonLd(article)} />
      <JsonLd data={videoJsonLd(article)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: info.title, path: `/${article.series}` },
          { name: article.shortTitle, path: `/articles/${article.slug}` },
        ])}
      />

      {/* Breadcrumb Bar */}
      <nav className="breadcrumb" aria-label="Breadcrumb navigation">
        <Link href="/">Home</Link>
        <span className="slash">/</span>
        <Link href={`/${article.series}`}>{info.title}</Link>
        <span className="slash">/</span>
        <span className="active">
          {isReview ? `Review #${article.episode}` : isPodcast ? `Episode #${article.episode}` : `Guide #${article.episode}`}
        </span>
      </nav>

      {/* Article Header */}
      <header className="article-heading">
        <div className="article-eyebrow-row">
          <span
            className={`article-series-tag ${
              isReview ? 'review' : isPodcast ? 'podcast' : 'guide'
            }`}
          >
            {isReview && <Building2 size={12} />}
            {isPodcast && <Headphones size={12} />}
            {isGuide && <BookOpen size={12} />}
            {info.title.toUpperCase()} ·{' '}
            {isReview ? 'REVIEW' : isPodcast ? 'EPISODE' : 'GUIDE'} #{article.episode}
          </span>
          {isReview &&
            'propertyType' in article &&
            typeof article.propertyType === 'string' && (
            <span className="article-property-type-pill">{article.propertyType}</span>
          )}
          {stage && (
            <span className={`article-stage-pill ${stage.id}`} title={stage.note}>
              {stage.id === 'show-unit' ? <HardHat size={12} /> : <CircleCheck size={12} />}
              {stage.label}
            </span>
          )}
          <span className="article-topic-pill">{article.tag}</span>
          {'location' in article && article.location && (
            <span className="article-location-pill">
              <MapPin size={12} /> {article.location}
            </span>
          )}
        </div>

        <h1 className="article-title">{article.title}</h1>
        {stage?.id === 'show-unit' && (
          <p className="article-stage-note">
            <HardHat size={14} aria-hidden="true" />
            <span>
              Filmed at the show unit in {monthYearFor(article)}, while the project was still
              being built. Finishes, prices and surroundings may have changed since.
            </span>
          </p>
        )}

      </header>

      {/* Featured Cover / Video Thumbnail — property reviews only. Q&A articles
          lead with the question and answer; their episode is embedded below. */}
      {!qa && (
      <figure className="article-cover">
        <div className="cover-wrap">
          <img
            src={imageFor(article)}
            alt={`Video thumbnail: ${article.videoTitle}`}
            width={1280}
            height={720}
            className="cover-image"
          />
          <a
            href="#original-video"
            className="play-overlay-pill"
            aria-label="Jump down to embedded video player"
          >
            <Play size={14} fill="currentColor" />
            <span>Play original episode ({article.duration})</span>
          </a>
        </div>
        <figcaption className="cover-caption">
          <span>Official video thumbnail from Sean Tan (@iherng) · Published on YouTube</span>
          <a
            href={`https://www.youtube.com/watch?v=${article.videoId}`}
            target="_blank"
            rel="noreferrer"
            className="caption-yt-link"
          >
            Open on YouTube <ArrowUpRight size={12} />
          </a>
        </figcaption>
      </figure>
      )}

      {/* Main Reading Layout */}
      <div className="reading-layout">
        {/* Article Body */}
        <article className="reading-body">
          {qa && <AskSeanSummary qa={qa} />}

          {/* Formatted Story Sections — property reviews */}
          {'sections' in article && (
          <div className="story-sections">
            {article.sections.map((section, idx) => (
              <section
                id={`section-${idx + 1}`}
                className="prose-section"
                key={section.heading}
              >
                <div className="section-chapter-marker">
                  <span className="chapter-label">CHAPTER 0{idx + 1}</span>
                  <h2 className="chapter-heading">{section.heading}</h2>
                </div>
                <div className="chapter-prose">
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
          )}

          {/* Sean's Take 3 on 3 — property reviews only */}
          {'seanTake' in article && isReview && (
            <section id="sean-take" className="sean-take-card">
              <div className="sean-take-header">
                <span className="sean-take-badge">SEAN&apos;S TAKE</span>
                <h2 className="sean-take-title">3 on 3</h2>
                <p className="sean-take-subtitle">The three things Sean likes and the three he doesn&apos;t, from his own list at the end of the episode.</p>
              </div>
              <div className="sean-take-grid">
                <div className="sean-take-col pros">
                  <div className="take-col-label">
                    <ThumbsUp size={16} />
                    <span>WHAT SEAN LIKES</span>
                  </div>
                  <ul className="take-list">
                    {(article as typeof article & { seanTake: { pros: string[]; cons: string[] } }).seanTake.pros.map((pro, i) => (
                      <li key={i} className="take-item pro">
                        <span className="take-num">{i + 1}</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="sean-take-col cons">
                  <div className="take-col-label">
                    <ThumbsDown size={16} />
                    <span>WHAT SEAN DOESN&apos;T</span>
                  </div>
                  <ul className="take-list">
                    {(article as typeof article & { seanTake: { pros: string[]; cons: string[] } }).seanTake.cons.map((con, i) => (
                      <li key={i} className="take-item con">
                        <span className="take-num">{i + 1}</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Editorial Verdict / Closing Quote — property reviews */}
          {'closing' in article && (
            <section id="reflection" className="editorial-reflection-box">
              <span className="quote-mark">&ldquo;</span>
              <p className="reflection-text">{article.closing}</p>
              <span className="reflection-author">— iherng Journal editorial note</span>
            </section>
          )}

          {/* The top of the page is kept for the content itself (the question and
              answer, or the cover and chapters); the byline and editorial note sit
              here, just above the episode. */}
          <div className="article-colophon">
            {metaBar}
            {editorialNote}
          </div>

          {/* Original YouTube Video Embed */}
          <section id="original-video" className="video-player-section">
            <div className="video-section-header">
              <div>
                <span className="eyebrow">ORIGINAL EPISODE</span>
                <h2 className="video-title">{article.videoTitle}</h2>
              </div>
              <span className="video-duration-pill">
                <Play size={12} fill="currentColor" /> {article.duration}
              </span>
            </div>

            <div className="video-iframe-wrap">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${article.videoId}`}
                title={article.videoTitle}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="video-iframe"
              />
            </div>

            <div className="video-footer-links">
              <span>Looking for high-resolution 4K playback or comments?</span>
              <a
                href={`https://www.youtube.com/watch?v=${article.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="yt-watch-btn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>Watch directly on YouTube</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </section>

          {/* Sources and Provenance */}
          <section id="sources" className="sources-section">
            <div className="sources-header">
              <Info size={16} />
              <h3>Sources & Verification Data</h3>
            </div>
            <p className="sources-note">{article.sourceNote}</p>
            <ul className="sources-list">
              {article.sources.map((src) => (
                <li key={src.url}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="source-link"
                  >
                    <span>{src.label}</span>
                    <ArrowUpRight size={13} />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <div className="article-end-tools">
            <ShareButtons title={article.title} />
            <Link href={`/${article.series}`} className="article-back-link">
              <ArrowLeft size={14} />
              <span>Back to all {info.title}</span>
            </Link>
          </div>

          {/* In-Series Next / Prev Navigation */}
          <nav className="in-series-nav" aria-label="In-series story navigation">
            <div className="in-series-col">
              {prevArticle ? (
                <Link href={`/articles/${prevArticle.slug}`} className="in-series-card prev">
                  <div className="card-direction">
                    <ArrowLeft size={14} />
                    <span>PREVIOUS IN {info.title.toUpperCase()}</span>
                  </div>
                  <h4 className="card-story-title">{prevArticle.title}</h4>
                  <span className="card-tag">Ep #{prevArticle.episode} · {prevArticle.tag}</span>
                </Link>
              ) : (
                <div className="in-series-card empty">
                  <span className="card-direction">START OF SERIES</span>
                  <p>You are reading the first article in this collection.</p>
                </div>
              )}
            </div>

            <div className="in-series-col">
              {nextArticle ? (
                <Link href={`/articles/${nextArticle.slug}`} className="in-series-card next">
                  <div className="card-direction">
                    <span>NEXT IN {info.title.toUpperCase()}</span>
                    <ArrowRight size={14} />
                  </div>
                  <h4 className="card-story-title">{nextArticle.title}</h4>
                  <span className="card-tag">Ep #{nextArticle.episode} · {nextArticle.tag}</span>
                </Link>
              ) : (
                <Link href={`/${article.series}`} className="in-series-card next">
                  <div className="card-direction">
                    <span>SERIES OVERVIEW</span>
                    <ArrowRight size={14} />
                  </div>
                  <h4 className="card-story-title">Explore All {info.title}</h4>
                  <span className="card-tag">{seriesArticles.length} Published Articles</span>
                </Link>
              )}
            </div>
          </nav>
        </article>
      </div>

      {/* Related Stories */}
      {related.length > 0 && (
        <section className="related-section">
          <div className="related-header">
            <div>
              <span className="eyebrow">CONTINUE READING</span>
              <h2 className="related-title">More from {info.title}</h2>
            </div>
            <Link href={`/${article.series}`} className="related-all-link">
              <span>View all {info.title}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="related-grid">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
