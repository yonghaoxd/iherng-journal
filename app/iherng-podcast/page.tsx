import { SeriesPage } from '@/components/journal';
import { seriesMetadata } from '@/lib/seo';

export const metadata = seriesMetadata(
  'iherng-podcast',
  'Read Asking Sean episode summaries about apartments versus landed homes, first purchases, and the relationship between location and price.'
);

export default function Page() {
  return <SeriesPage id="iherng-podcast" />;
}
