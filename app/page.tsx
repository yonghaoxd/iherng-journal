import Link from 'next/link';
import {
  ArrowRight,
  Play,
  MapPin,
  Sparkles,
  Building2,
  Headphones,
  BookOpen,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  PropertySection,
  PodcastSection,
  BuyerGuidesSection,
} from '@/components/journal';
import { seriesCount, type SeriesKey } from '@/lib/articles';

const storyCount = (seriesKey: SeriesKey) => `${String(seriesCount(seriesKey)).padStart(2, '0')} STORIES`;

export default function Home() {
  return (
    <main id="main" className="container home-page">
      {/* Intro Headline */}
      <section className="intro-hero" aria-label="Editorial introduction">
        <div className="intro-content">
          <div className="edition-badge">
            <Sparkles size={13} className="text-accent" />
            <span>EDITORIAL COMPANION · INDEPENDENT CURATION</span>
          </div>
          <h1 className="intro-title">
            A little perspective.<br />
            <span className="serif-accent">A better place to call home.</span>
          </h1>
          <p className="intro-lead">
            Malaysian property walkthroughs, honest conversations, and practical buyer playbooks
            from Sean Tan (@iherng), distilled into focused, source-linked articles.
          </p>
        </div>

        {/* Quick Series Directory Quick-Cards */}
        <div className="series-quick-nav">
          <Link href="/property-reviews" className="quick-series-card property">
            <div className="quick-header">
              <div className="icon-badge">
                <Building2 size={16} />
              </div>
              <span className="series-episodes">{storyCount('property-reviews')}</span>
            </div>
            <h3>Property Reviews</h3>
            <p>Room-by-room architectural inspections &amp; neighbourhood trade-offs.</p>
            <div className="quick-footer">
              <span>View collection</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link href="/iherng-podcast" className="quick-series-card podcast">
            <div className="quick-header">
              <div className="icon-badge">
                <Headphones size={16} />
              </div>
              <span className="series-episodes">{storyCount('iherng-podcast')}</span>
            </div>
            <h3>iherng Podcast</h3>
            <p>Asking Sean: Candid discussions on mortgages, family, and homeownership.</p>
            <div className="quick-footer">
              <span>View collection</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link href="/buyer-guides" className="quick-series-card guide">
            <div className="quick-header">
              <div className="icon-badge">
                <BookOpen size={16} />
              </div>
              <span className="series-episodes">{storyCount('buyer-guides')}</span>
            </div>
            <h3>Buyer Guides</h3>
            <p>Practical playbooks for research, financing, risk checks, renovation and ownership decisions.</p>
            <div className="quick-footer">
              <span>View collection</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Story / Editor's Pick */}
      <section className="feature-grid" aria-label="Editor's Pick Story">
        <Link
          href="/articles/manor-born-ipoh"
          className="feature-photo-wrap group"
          aria-label="Read Manor Born feature story"
        >
          <img
            src="https://i.ytimg.com/vi/Em5Ls6ECFJ8/maxresdefault.jpg"
            alt="iherng's Manor Born property review in Ipoh"
            width={1280}
            height={720}
            className="feature-photo"
          />
          <div className="feature-photo-overlay" />
          <span className="image-chip">
            <Play size={12} fill="currentColor" />
            <span>ORIGINAL VIDEO · 14:34</span>
          </span>
        </Link>

        <div className="feature-story">
          <div className="feature-story-top">
            <div className="feature-eyebrow">
              <span className="badge-pick">THE EDITOR&apos;S PICK</span>
              <span className="feature-ep">EPISODE #159</span>
            </div>

            <div className="feature-meta-info">
              <p className="feature-category">
                PROPERTY REVIEWS <span className="sep">·</span>{' '}
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> IPOH, PERAK
                </span>
              </p>
              <Link href="/articles/manor-born-ipoh">
                <h2 className="feature-heading">
                  Manor Born:<br />
                  big spaces,<br />
                  <em>small community.</em>
                </h2>
              </Link>
              <p className="story-deck">
                An intimate bungalow development with mountain views and a thoughtful central
                courtyard—balanced by real-world trade-offs in accessibility and shared grounds.
              </p>
            </div>
          </div>

          <div className="feature-story-bottom">
            <div className="feature-highlights">
              <div className="highlight-item">
                <CheckCircle2 size={14} className="text-accent" />
                <span>Central courtyard ventilation</span>
              </div>
              <div className="highlight-item">
                <CheckCircle2 size={14} className="text-accent" />
                <span>Distinct basement workspace</span>
              </div>
            </div>

            <Link className="feature-cta-btn" href="/articles/manor-born-ipoh">
              <span>Read the full review</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Series 01: Property Reviews */}
      <PropertySection />

      {/* Series 02: iherng Podcast */}
      <PodcastSection />

      {/* Series 03: Buyer Guides */}
      <BuyerGuidesSection />

      {/* Creator Spotlight Banner */}
      <section className="creator-spotlight" aria-label="About the creator">
        <div className="creator-card">
          <div className="creator-info">
            <span className="eyebrow">MEET THE CREATOR</span>
            <h2>Sean Tan (@iherng)</h2>
            <p>
              Sean Tan has become one of Malaysia&apos;s most respected real estate commentators,
              known for touring properties without sales hype. He breaks down floor plans, construction
              quality, and financial realities with unvarnished honesty.
            </p>
            <div className="creator-badges">
              <div className="stat-box">
                <strong>350+</strong>
                <span>Episodes &amp; Reviews</span>
              </div>
              <div className="stat-box">
                <strong>100K+</strong>
                <span>Community Followers</span>
              </div>
              <div className="stat-box">
                <strong>100%</strong>
                <span>Independent Editorial</span>
              </div>
            </div>
          </div>
          <div className="creator-action">
            <a
              href="https://www.youtube.com/@iherng"
              target="_blank"
              rel="noreferrer"
              className="creator-yt-btn"
            >
              <span>Subscribe on YouTube</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
