import Link from 'next/link';
import { LineChart, ArrowRight } from 'lucide-react';
import { RentalCalculator } from '@/components/rental-calculator';
import { CalculatorTabs } from '@/components/calculator-tabs';
import { JsonLd } from '@/components/json-ld';
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
} from '@/lib/seo';

const TITLE = 'Rental Cash Flow Calculator';
const DESCRIPTION =
  'Check whether a Malaysian rental property pays for itself. Enter the price, loan margin, interest rate and expected rent to see positive or negative monthly cash flow, break-even rent and gross yield.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/rental-calculator' },
  openGraph: {
    type: 'website' as const,
    url: '/rental-calculator',
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

export default function RentalCalculatorPage() {
  return (
    <main id="main" className="container calculator-page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          '@id': `${absoluteUrl('/rental-calculator')}#app`,
          name: TITLE,
          description: DESCRIPTION,
          url: absoluteUrl('/rental-calculator'),
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
          { name: TITLE, path: '/rental-calculator' },
        ])}
      />

      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="slash">/</span>
        <span className="active">Rental Cash Flow</span>
      </div>

      <section className="series-hero-banner">
        <div className="hero-badge">
          <LineChart size={13} />
          <span>TOOLS · RUN THE NUMBERS</span>
        </div>
        <h1 className="series-heading">
          Does the rent cover it
          <span className="orange-dot">?</span>
        </h1>
        <div className="series-intro-row">
          <p className="series-intro-text">
            A tenant does not always pay your loan. Put in the price, your margin of
            finance and the rent you realistically expect, and see whether the unit
            feeds you or you feed it.
          </p>
        </div>
      </section>

      <CalculatorTabs active="/rental-calculator" />

      <RentalCalculator />

      <section className="calc-related">
        <div className="related-header">
          <div>
            <span className="eyebrow">READ NEXT</span>
            <h2 className="related-title">Before you count on the rent</h2>
          </div>
        </div>
        <div className="calc-related-links">
          <Link
            href="/articles/guaranteed-rental-return-risks"
            className="calc-related-card"
          >
            <h3>The risks behind guaranteed rental returns</h3>
            <p>Why a promised yield on paper is not the same as rent in your account.</p>
            <span className="calc-related-cta">
              Read the guide <ArrowRight size={14} />
            </span>
          </Link>
          <Link href="/articles/hidden-costs-property-malaysia" className="calc-related-card">
            <h3>The hidden costs of buying property</h3>
            <p>The recurring bills that quietly decide whether a rental works.</p>
            <span className="calc-related-cta">
              Read the guide <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
