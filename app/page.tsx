import Link from 'next/link';
import { ArrowRight, Calculator, TrendingUp } from 'lucide-react';
import { AskSeanChat } from '@/components/ask-sean-chat';
import { AIherngName } from '@/components/aiherng-name';
import { pageArticles, seriesCount, stateFor } from '@/lib/articles';

/** "Teja: low-density living on Subang Jaya's busiest stretch." → name and line. */
function splitTitle(title: string): { name: string; line: string } {
  const at = title.indexOf(': ');
  if (at === -1) return { name: title, line: '' };
  const line = title.slice(at + 2);
  return { name: title.slice(0, at), line: line.charAt(0).toUpperCase() + line.slice(1) };
}

function monthOf(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function Home() {
  const latestReviews = [...pageArticles]
    .filter((article) => article.series === 'property-reviews')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  return (
    <main id="main" className="home-page home-ask">
      {/* AIherng is the page: the question box comes first. */}
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-inner">
          <h1 id="home-title" className="home-title">
            Any property question?
            <br />
            Ask <AIherngName variant="serif" />.
          </h1>
          <p className="home-lead">
            Buying, loans, hidden costs, renting out. Ask in your own words and get a straight
            answer, with the video it comes from.
          </p>
          <AskSeanChat showFeed={false} />
        </div>
      </section>

      <section className="container home-section" aria-labelledby="home-reviews-title">
        <div className="home-section-head">
          <div>
            <span className="home-eyebrow">{seriesCount('property-reviews')} projects</span>
            <h2 id="home-reviews-title" className="home-section-title">
              Property Reviews
            </h2>
            <p className="home-section-intro">
              Sean walks through a project and says what he likes and what he would question.
              Asking about a specific project? Start here.
            </p>
          </div>
          <Link href="/property-reviews" className="home-more">
            See all reviews <ArrowRight size={15} />
          </Link>
        </div>
        <div className="home-review-grid">
          {latestReviews.map((review) => {
            const { name, line } = splitTitle(review.title);
            return (
              <Link key={review.slug} href={`/articles/${review.slug}`} className="home-review-card">
                <span className="home-review-meta">
                  <span>{stateFor(review) ?? ''}</span>
                  <span>{monthOf(review.date)}</span>
                </span>
                <span className="home-review-name">{name}</span>
                {line && <span className="home-review-line">{line}</span>}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container home-section" aria-labelledby="home-calc-title">
        <h2 id="home-calc-title" className="home-eyebrow">
          Run the numbers
        </h2>
        <div className="home-calc-grid">
          <Link href="/calculator" className="home-calc-card">
            <span className="home-calc-icon">
              <Calculator size={22} aria-hidden="true" />
            </span>
            <span>
              <strong>Property cost calculator</strong>
              <small>Down payment, legal fees and stamp duty: the cash you really need</small>
            </span>
          </Link>
          <Link href="/rental-calculator" className="home-calc-card">
            <span className="home-calc-icon">
              <TrendingUp size={22} aria-hidden="true" />
            </span>
            <span>
              <strong>Rental yield calculator</strong>
              <small>Does the rent cover the instalment, and what is the yield?</small>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
