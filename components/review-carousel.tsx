'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

export interface ReviewCard {
  slug: string;
  image: string;
  duration?: string;
  meta: string;
  name: string;
  line: string;
  month: string;
}

const PER_VIEW = 3;

/**
 * The latest property reviews, three at a time. The arrows move one card and wrap
 * round, so they never run out.
 */
export function ReviewCarousel({ reviews }: { reviews: ReviewCard[] }) {
  const [start, setStart] = useState(0);
  const count = reviews.length;
  const looping = count > PER_VIEW;
  const shown = looping
    ? Array.from({ length: PER_VIEW }, (_, index) => reviews[(start + index) % count])
    : reviews;

  return (
    <div className="home-review-slider" role="group" aria-roledescription="carousel" aria-label="Latest reviews">
      {looping && (
        <>
          <button
            type="button"
            className="home-review-arrow prev"
            aria-label="Previous review"
            onClick={() => setStart((start - 1 + count) % count)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="home-review-arrow next"
            aria-label="Next review"
            onClick={() => setStart((start + 1) % count)}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
      <div className="home-review-grid" aria-live="polite">
        {shown.map((review) => (
          <Link key={review.slug} href={`/articles/${review.slug}`} className="home-review-card">
            <span className="home-review-thumb">
              <img src={review.image} alt="" width={1280} height={720} loading="lazy" />
              <span className="home-review-play" aria-hidden="true">
                <Play size={14} fill="currentColor" />
              </span>
              {review.duration && <span className="home-review-duration">{review.duration}</span>}
            </span>
            <span className="home-review-body">
              <span className="home-review-meta">{review.meta}</span>
              <span className="home-review-name">{review.name}</span>
              {review.line && <span className="home-review-line">{review.line}</span>}
              <span className="home-review-date">{review.month}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
