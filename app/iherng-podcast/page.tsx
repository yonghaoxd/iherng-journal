import { SeriesPage } from '@/components/journal';
import { seriesMetadata } from '@/lib/seo';

export const metadata = seriesMetadata(
  'iherng-podcast',
  'Asking Sean answers to real Malaysian property questions: first homes, stalled projects, family money, affordability, discounts and investing later in life.'
);

export default function Page() {
  return <SeriesPage id="iherng-podcast" />;
}
