import { FourSteps } from '@/components/four-steps';
import { JsonLd } from '@/components/json-ld';
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
} from '@/lib/seo';

const TITLE = "Sean's 4 Basic Steps Before Buying a Property";
const DESCRIPTION =
  "Work through Sean Tan's four steps before buying a Malaysian property: know why you are buying, estimate your loan eligibility, track 20 viewings, then pick the one and check it against the median price, the rent and the worst case.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/four-steps' },
  openGraph: {
    type: 'website' as const,
    url: '/four-steps',
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

export default function FourStepsPage() {
  return (
    <main id="main" className="fs-page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          '@id': `${absoluteUrl('/four-steps')}#app`,
          name: TITLE,
          description: DESCRIPTION,
          url: absoluteUrl('/four-steps'),
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Any',
          browserRequirements: 'Requires JavaScript',
          inLanguage: 'en',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'MYR' },
          isPartOf: { '@id': `${SITE_URL}/#website` },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: TITLE, path: '/four-steps' },
        ])}
      />
      <FourSteps />
    </main>
  );
}
