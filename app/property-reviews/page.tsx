import { SeriesPage } from '@/components/journal';
import { seriesMetadata } from '@/lib/seo';

export const metadata = seriesMetadata(
  'property-reviews',
  'Explore six source-linked iherng property reviews, each with Sean’s Take 3 on 3: three reasons to consider the home and three points to watch.'
);

export default function Page() {
  return <SeriesPage id="property-reviews" />;
}
