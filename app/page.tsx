import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Building2,
  Headphones,
  BookOpen,
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
