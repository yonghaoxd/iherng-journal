import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Calculator, Play, TrendingUp } from 'lucide-react';
import { AskSeanChat } from '@/components/ask-sean-chat';
import { AIherngName } from '@/components/aiherng-name';
import { imageFor, pageArticles, seriesCount, stateFor } from '@/lib/articles';

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
    .slice(0, 3);

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

      <section className="container home-section home-reviews" aria-labelledby="home-reviews-title">
        <div className="home-section-head">
          <div>
            <h2 id="home-reviews-title" className="home-section-title">
              Property Reviews
            </h2>
            <p className="home-section-intro">
              Sean walks through a project and says what he likes and what he would question.
            </p>
          </div>
          <Link href="/property-reviews" className="home-more">
            See all {seriesCount('property-reviews')} reviews <ArrowRight size={15} />
          </Link>
        </div>
        <div className="home-review-grid">
          {latestReviews.map((review) => {
            const { name, line } = splitTitle(review.title);
            const kind = 'propertyType' in review && typeof review.propertyType === 'string' ? review.propertyType : '';
            return (
              <Link key={review.slug} href={`/articles/${review.slug}`} className="home-review-card">
                <span className="home-review-thumb">
                  <img src={imageFor(review)} alt="" width={1280} height={720} loading="lazy" />
                  <span className="home-review-play" aria-hidden="true">
                    <Play size={14} fill="currentColor" />
                  </span>
                  <span className="home-review-duration">{review.duration}</span>
                </span>
                <span className="home-review-body">
                  <span className="home-review-meta">
                    {[review.location ?? stateFor(review), kind].filter(Boolean).join(' · ')}
                  </span>
                  <span className="home-review-name">{name}</span>
                  {line && <span className="home-review-line">{line}</span>}
                  <span className="home-review-date">{monthOf(review.date)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container home-section home-calcs" aria-labelledby="home-calc-title">
        <div>
          <h2 id="home-calc-title" className="home-section-title small">
            Run the numbers
          </h2>
          <p className="home-section-intro">Two quick calculators, built on the figures Sean uses.</p>
        </div>
        <div className="home-calc-grid">
          <Link href="/calculator" className="home-calc-card">
            <span className="home-calc-top">
              <span className="home-calc-icon">
                <Calculator size={22} aria-hidden="true" />
              </span>
              <span className="home-calc-arrow" aria-hidden="true">
                <ArrowUpRight size={18} />
              </span>
            </span>
            <span className="home-calc-text">
              <small>Buying</small>
              <strong>Property cost calculator</strong>
              <span>Down payment, legal fees and stamp duty: the cash you really need before the keys.</span>
            </span>
          </Link>
          <Link href="/calculator?mode=rent" className="home-calc-card">
            <span className="home-calc-top">
              <span className="home-calc-icon">
                <TrendingUp size={22} aria-hidden="true" />
              </span>
              <span className="home-calc-arrow" aria-hidden="true">
                <ArrowUpRight size={18} />
              </span>
            </span>
            <span className="home-calc-text">
              <small>Renting out</small>
              <strong>Rental yield calculator</strong>
              <span>Does the rent cover the instalment, and what does the unit really return?</span>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
