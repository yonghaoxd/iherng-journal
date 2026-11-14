import Link from 'next/link';
import { MessageCircleQuestion } from 'lucide-react';
import { AskSeanChat } from '@/components/ask-sean-chat';
import { AIherngName } from '@/components/aiherng-name';
import { JsonLd } from '@/components/json-ld';
import { DEFAULT_OG_IMAGE, SITE_NAME, breadcrumbJsonLd } from '@/lib/seo';

const TITLE = 'AIherng — ask a Malaysian property question';
const DESCRIPTION =
  'Ask any Malaysian property question in English, Chinese or Malay. AIherng answers the way Sean Tan (@iherng) does on his channel, and links to the episode each answer comes from.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/ask' },
  openGraph: {
    type: 'website' as const,
    url: '/ask',
    siteName: SITE_NAME,
    locale: 'en_US',
    title: `${TITLE} — ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: `${TITLE} — ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

/**
 * The same chat as the home page, plus the public feed of questions. Shared answer
 * links (/ask?q=<id>) from before the home page redesign keep working here.
 */
export default function AskPage() {
  return (
    <main id="main" className="container askbot-page">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'AIherng', path: '/ask' },
        ])}
      />

      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="slash">/</span>
        <span className="active">
          <AIherngName />
        </span>
      </div>

      <section className="series-hero-banner">
        <div className="hero-badge">
          <MessageCircleQuestion size={13} />
          <span>AI Q&amp;A · from Sean&apos;s episodes</span>
        </div>
        <h1 className="series-heading">
          <AIherngName variant="serif" />
          <span className="orange-dot">.</span>
        </h1>
        <div className="series-intro-row">
          <p className="series-intro-text">
            Ask any property question and get a straight answer worked out the way Sean does it,
            with the episode it comes from. Below: what others have asked.
          </p>
        </div>
      </section>

      <AskSeanChat />
    </main>
  );
}
