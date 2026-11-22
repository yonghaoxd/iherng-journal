import Link from 'next/link';
import { RedirectHome } from '@/components/redirect-home';
import { AIherngName } from '@/components/aiherng-name';
import { DEFAULT_OG_IMAGE, SITE_NAME } from '@/lib/seo';

const TITLE = 'AIherng — ask a Malaysian property question';
const DESCRIPTION =
  'Ask any Malaysian property question in English, Chinese or Malay. AIherng answers the way Sean Tan (@iherng) does on his channel, and links to the episode each answer comes from.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  robots: { index: false, follow: true },
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

/** AIherng now lives on the home page; this page only forwards old links there. */
export default function AskPage() {
  return (
    <main id="main" className="container askbot-page">
      <RedirectHome />
      <p className="askbot-hint">
        <AIherngName /> has moved to the <Link href="/">home page</Link>.
      </p>
    </main>
  );
}
