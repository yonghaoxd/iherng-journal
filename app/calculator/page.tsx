import { Calculators } from '@/components/calculators';
import { JsonLd } from '@/components/json-ld';
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
} from '@/lib/seo';

const TITLE = 'Property Cost and Rental Calculator';
const DESCRIPTION =
  'Work out the cash you need upfront and the monthly instalment on a Malaysian property, including MOT stamp duty and legal fees, or check whether the rent covers the loan.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/calculator' },
  openGraph: {
    type: 'website' as const,
    url: '/calculator',
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

export default function CalculatorPage() {
  return (
    <main id="main" className="calculator-page calcx-page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          '@id': `${absoluteUrl('/calculator')}#app`,
          name: TITLE,
          description: DESCRIPTION,
          url: absoluteUrl('/calculator'),
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
          { name: TITLE, path: '/calculator' },
        ])}
      />
      <Calculators />
    </main>
  );
}
