import Link from 'next/link';
import { Compass, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <main id="main" className="container not-found-page">
      <div className="not-found-card">
        <div className="not-found-icon">
          <Compass size={40} />
        </div>
        <p className="eyebrow">404 · PAGE NOT FOUND</p>
        <h1>This story isn&apos;t here.</h1>
        <p className="not-found-desc">
          The video summary or page you are looking for may have moved or doesn&apos;t exist yet.
          Explore our verified collections below:
        </p>
        <div className="not-found-links">
          <Link className="editorial-btn" href="/property-reviews">
            <span>Property Reviews</span>
            <ArrowRight size={14} />
          </Link>
          <Link className="editorial-btn outline" href="/iherng-podcast">
            <span>iherng Podcast</span>
            <ArrowRight size={14} />
          </Link>
          <Link className="text-link" href="/">
            Return to Homepage →
          </Link>
        </div>
      </div>
    </main>
  );
}
