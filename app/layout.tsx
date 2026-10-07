import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Building2, Mic, BookOpen, Heart } from 'lucide-react';
import './globals.css';
import { JournalNav } from '@/components/journal-nav';
import { seriesCount } from '@/lib/articles';
import { ReadingProgress } from '@/components/reading-progress';
import { JsonLd } from '@/components/json-ld';
import { DEFAULT_OG_IMAGE, SITE_URL, websiteJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'iherng Journal — Property Reviews & Podcast Editorial',
    template: '%s | iherng Journal',
  },
  description:
    'An editorial companion to Sean Tan\'s (@iherng) YouTube channel. Concise, source-linked summaries of Malaysian property reviews and Asking Sean podcast episodes.',
  keywords: [
    'iherng',
    'Sean Tan',
    'Malaysia property review',
    'Asking Sean podcast',
    'Manor Born Ipoh',
    'Cempaka Seri',
    'Tropicana Alam',
    'real estate blog',
  ],
  authors: [{ name: 'iherng Journal Editorial' }],
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/feed.xml' },
  },
  openGraph: {
    title: 'iherng Journal — Property Reviews & Podcast Editorial',
    description:
      'Malaysian property walkthroughs and honest conversations distilled into high-value editorial reads.',
    siteName: 'iherng Journal',
    locale: 'en_US',
    type: 'website',
    url: '/',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'iherng Journal — an editorial companion to Sean Tan\'s property channel',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iherng Journal — Property Reviews & Podcast Editorial',
    description:
      'Malaysian property walkthroughs and honest conversations distilled into high-value editorial reads.',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-video-preview': -1 },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="theme-color" content="#0E100F" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <JsonLd data={websiteJsonLd()} />
        <ReadingProgress />
        <a className="skip-link" href="#main">
          Skip to content
        </a>

        {/* Global Announcement / Edition Line */}
        <div className="top-edition-banner">
          <div className="container banner-inner">
            <span className="banner-left">
              <strong>THE IHERNG JOURNAL</strong> · CURATED VIDEO ESSAYS &amp; NOTES
            </span>
            <span className="banner-right">
              FEATURING PROPERTY REVIEWS &amp; ASKING SEAN PODCAST
            </span>
          </div>
        </div>

        {/* Sticky Site Header */}
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" aria-label="iherng Journal home" className="wordmark">
              <span className="wordmark-name">iherng</span>
              <span className="wordmark-dot">.</span>
              <small className="wordmark-tag">JOURNAL</small>
            </Link>

            <JournalNav />

            <div className="header-actions">
              <a
                className="channel-link"
                href="https://www.youtube.com/@iherng"
                target="_blank"
                rel="noreferrer"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#FF0000">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>YouTube Channel</span>
                <ArrowUpRight size={14} className="opacity-70" />
              </a>
            </div>
          </div>
        </header>

        {children}

        {/* Rich Editorial Footer */}
        <footer className="site-footer">
          <div className="container footer-content">
            <div className="footer-col-main">
              <Link className="wordmark" href="/">
                <span className="wordmark-name">iherng</span>
                <span className="wordmark-dot">.</span>
                <small className="wordmark-tag">JOURNAL</small>
              </Link>
              <p className="footer-tagline">
                An independent editorial reading companion to Sean Tan&apos;s YouTube channel.
                Translating in-depth video analyses into readable, actionable insights.
              </p>
              <div className="footer-badges">
                <span className="badge-pill">
                  <Building2 size={12} /> {seriesCount('property-reviews')} Property Reviews
                </span>
                <span className="badge-pill">
                  <Mic size={12} /> {seriesCount('iherng-podcast')} Podcast Summaries
                </span>
                <span className="badge-pill">
                  <BookOpen size={12} /> {seriesCount('buyer-guides')} Buyer Guides
                </span>
              </div>
            </div>

            <div className="footer-col-links">
              <h4>Series Navigation</h4>
              <ul>
                <li>
                  <Link href="/">Home Overview</Link>
                </li>
                <li>
                  <Link href="/property-reviews">Series 01: Property Reviews</Link>
                </li>
                <li>
                  <Link href="/iherng-podcast">Series 02: iherng Podcast</Link>
                </li>
                <li>
                  <Link href="/buyer-guides">Series 03: Buyer Guides</Link>
                </li>
                <li>
                  <Link href="/calculator">Property Cost Calculator</Link>
                </li>
                <li>
                  <Link href="/rental-calculator">Rental Cash Flow Calculator</Link>
                </li>
                <li>
                  <Link href="/ask">Ask Sean (AI Q&amp;A)</Link>
                </li>
                <li>
                  {/* A generated static file, not a route: next/link would
                      try to client-navigate to it. */}
                  {/* oxlint-disable-next-line no-html-link-for-pages */}
                  <a href="/feed.xml">RSS Feed</a>
                </li>
                <li>
                  <a
                    href="https://www.youtube.com/@iherng"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch @iherng on YouTube ↗
                  </a>
                </li>
              </ul>
            </div>

            <div className="footer-col-about">
              <h4>Editorial Transparency</h4>
              <p>
                All video content, audio, and trademarks belong to Sean Tan / iherng.
                Articles are published under fair commentary &amp; education principles.
              </p>
              <p className="footer-copyright">
                Independent Editorial Prototype · 2026
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
