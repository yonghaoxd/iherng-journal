import Link from 'next/link';
import { Calculator, ArrowRight } from 'lucide-react';
import { PropertyCalculator } from '@/components/property-calculator';
import { CalculatorTabs } from '@/components/calculator-tabs';
import { JsonLd } from '@/components/json-ld';
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
} from '@/lib/seo';

const TITLE = 'Property Cost Calculator';
const DESCRIPTION =
  'Estimate the cash you need upfront and the monthly instalment on a Malaysian property purchase, including MOT stamp duty, legal fees and loan agreement costs.';

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
    <main id="main" className="container calculator-page">
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

      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="slash">/</span>
        <span className="active">Calculator</span>
      </div>

      <section className="series-hero-banner">
        <div className="hero-badge">
          <Calculator size={13} />
          <span>TOOLS · RUN THE NUMBERS</span>
        </div>
        <h1 className="series-heading">
          What it really costs
          <span className="orange-dot">.</span>
        </h1>
        <div className="series-intro-row">
          <p className="series-intro-text">
            The sticker price is never the whole bill. Work out the cash you need on
            day one and the instalment you will live with for decades — before you
            fall in love with a show unit.
          </p>
        </div>
      </section>

      <CalculatorTabs active="/calculator" />

      <PropertyCalculator />

      <section className="calc-related">
        <div className="related-header">
          <div>
            <span className="eyebrow">READ NEXT</span>
            <h2 className="related-title">The costs behind the numbers</h2>
          </div>
        </div>
        <div className="calc-related-links">
          <Link href="/articles/hidden-costs-property-malaysia" className="calc-related-card">
            <h3>The hidden costs of buying property</h3>
            <p>What the brochure leaves out, from stamp duty to sinking funds.</p>
            <span className="calc-related-cta">
              Read the guide <ArrowRight size={14} />
            </span>
          </Link>
          <Link href="/articles/settle-housing-loan-early" className="calc-related-card">
            <h3>Should you settle your housing loan early?</h3>
            <p>Where early repayment pays off, and where the money works harder elsewhere.</p>
            <span className="calc-related-cta">
              Read the guide <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
