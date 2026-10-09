import { SeriesPage } from '@/components/journal';
import { seriesMetadata } from '@/lib/seo';

export const metadata = seriesMetadata(
  'property-reviews',
  'Explore nine source-linked iherng property reviews, each with Sean’s Take 3 on 3: the three things Sean likes about the project and the three he doesn’t.'
);

export default function Page() {
  return <SeriesPage id="property-reviews" />;
}
