import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import './globals.css';
import { JournalNav } from '@/components/journal-nav';
import { knowledgeUpdated, pageArticles } from '@/lib/articles';
import { ReadingProgress } from '@/components/reading-progress';
import { JsonLd } from '@/components/json-ld';
import { ThemeToggle } from '@/components/theme-toggle';
import { DEFAULT_OG_IMAGE, SITE_URL, websiteJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AIherng — Malaysian property questions, answered from Sean Tan\'s episodes',
    template: '%s | iherng Journal',
  },
  description:
    'Ask any Malaysian property question and get a straight answer worked out the way Sean Tan (@iherng) does it, with the episode it comes from. Plus source-linked reviews of Malaysian property projects.',
  keywords: [
    'iherng',
    'Sean Tan',
    'Malaysia property review',
    'Asking Sean podcast',
    'AIherng',
    'Malaysia property Q&A',
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
    title: 'AIherng — Malaysian property questions, answered',
    description:
      'Ask any property question and get a straight answer, with the Sean Tan episode it comes from.',
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
    title: 'AIherng — Malaysian property questions, answered',
    description:
      'Ask any property question and get a straight answer, with the Sean Tan episode it comes from.',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-video-preview': -1 },
  },
};

/**
 * Runs before the page paints, so a light-theme reader never sees a dark flash: their
 * saved choice ('theme' in localStorage, set by ThemeToggle), else the system setting.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t;if(t==='light'){document.querySelector('meta[name="theme-color"]').setAttribute('content','#F6F3EC')}}catch(e){}})()`;

// The banner points to the newest published review.
const latest = [...pageArticles].sort((a, b) => b.date.localeCompare(a.date))[0];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The theme script sets data-theme before React loads, so the server markup differs.
    <html lang="en" className="scroll-smooth" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0E100F" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
              <strong>THE IHERNG JOURNAL</strong> · NOTES ON SEAN TAN&apos;S YOUTUBE CHANNEL
            </span>
            <Link className="banner-right" href={`/articles/${latest.slug}`}>
              NEW REVIEW: <strong>{latest.shortTitle}</strong> →
            </Link>
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

            <div className="header-end">
              <ThemeToggle />
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
          </div>
        </header>

        {children}

        {/* Rich Editorial Footer */}
        <footer className="site-footer">
          <div className="container site-footer-row">
            <p>
              Answers are written by AI from Sean Tan&apos;s public videos, not by Sean himself. Updated{' '}
              {knowledgeUpdated}.
            </p>
            <nav aria-label="Footer">
              {/* A generated static file, not a route: next/link would try to client-navigate to it. */}
              {/* oxlint-disable-next-line no-html-link-for-pages */}
              <a href="/feed.xml">RSS</a>
              <a href="https://www.youtube.com/@iherng" target="_blank" rel="noreferrer">
                @iherng on YouTube <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
