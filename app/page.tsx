import Link from 'next/link';
import {
  ArrowRight,
  NotebookPen,
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
import { articles, seriesCount, type SeriesKey } from '@/lib/articles';
import { AIherngName } from '@/components/aiherng-name';

const countLabel = (seriesKey: SeriesKey, noun: string) =>
  `${String(seriesCount(seriesKey)).padStart(2, '0')} ${noun}`;

export default function Home() {
  return (
    <main id="main" className="container home-page">
      {/* Intro Headline */}
      <section className="intro-hero" aria-label="Editorial introduction">
        <div className="hero-stage">
          {/* iherng's YouTube channel art, with its baked-in tagline removed so it
              does not compete with the headline. */}
          <img
            className="hero-bg"
            src="/hero/iherng-rooftop-2000.jpg"
            srcSet="/hero/iherng-rooftop-1100.jpg 1100w, /hero/iherng-rooftop-2000.jpg 2000w"
            sizes="(max-width: 1280px) 100vw, 1280px"
            alt=""
            width={2000}
            height={1132}
            fetchPriority="high"
          />
          <div className="hero-scrim" aria-hidden="true" />

          <div className="hero-copy">
            <div className="edition-badge">
              <NotebookPen size={13} className="text-accent" />
              <span>Notes on Sean Tan&apos;s YouTube channel</span>
            </div>
            <h1 className="intro-title">
              Malaysian property,<br />
              <span className="serif-accent">as Sean Tan sees it.</span>
            </h1>
            <p className="intro-lead">
              Sean visits projects around Malaysia, answers viewers who write in about their
              money and homes, and explains loans and costs. Each video is written up here as a
              few minutes&apos; read, with his own figures and a link back to the episode.
            </p>

            <div className="hero-actions">
              <Link href="/ask" className="hero-btn primary">
                <span>
                  Ask <AIherngName /> a question
                </span>
                <ArrowRight size={16} />
              </Link>
              <a
                href="https://www.youtube.com/@iherng"
                target="_blank"
                rel="noreferrer"
                className="hero-btn ghost"
              >
                <span>Watch on YouTube</span>
                <ExternalLink size={15} />
              </a>
            </div>

            <p className="hero-proof">
              <strong>130K</strong> subscribers <span aria-hidden="true">·</span>{' '}
              <strong>1,200+</strong> videos on YouTube
            </p>
          </div>

          <span className="hero-credit">Photo: iherng on YouTube</span>
        </div>

        {/* Quick Series Directory Quick-Cards */}
        <div className="series-quick-nav">
          <Link href="/property-reviews" className="quick-series-card property">
            <div className="quick-header">
              <div className="icon-badge">
                <Building2 size={16} />
              </div>
              <span className="series-episodes">{countLabel('property-reviews', 'REVIEWS')}</span>
            </div>
            <h3>Property Reviews</h3>
            <p>Sean walks through a project and says what he likes and what he would question.</p>
            <div className="quick-footer">
              <span>See all reviews</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link href="/iherng-podcast" className="quick-series-card podcast">
            <div className="quick-header">
              <div className="icon-badge">
                <Headphones size={16} />
              </div>
              <span className="series-episodes">{countLabel('iherng-podcast', 'EPISODES')}</span>
            </div>
            <h3>iherng Podcast</h3>
            <p>Viewers share their income, savings and dilemma. Sean tells them what he would do.</p>
            <div className="quick-footer">
              <span>See all episodes</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link href="/buyer-guides" className="quick-series-card guide">
            <div className="quick-header">
              <div className="icon-badge">
                <BookOpen size={16} />
              </div>
              <span className="series-episodes">{countLabel('buyer-guides', 'GUIDES')}</span>
            </div>
            <h3>Buyer Guides</h3>
            <p>Sean&apos;s answers to what every buyer asks: loans, hidden costs, subsale or new launch.</p>
            <div className="quick-footer">
              <span>See all guides</span>
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
              Sean runs iherng, a YouTube channel about buying property in Malaysia. He tours new
              launches and finished projects, points out what works and what doesn&apos;t, and on
              Asking Sean works through viewers&apos; own numbers. The iherng Journal is an
              independent site, not made by Sean: it writes up his videos and links back to each one.
            </p>
            <div className="creator-badges">
              <div className="stat-box">
                <strong>1,200+</strong>
                <span>Videos on YouTube</span>
              </div>
              <div className="stat-box">
                <strong>130K+</strong>
                <span>YouTube Subscribers</span>
              </div>
              <div className="stat-box">
                <strong>{articles.length}</strong>
                <span>Videos written up here</span>
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
