import { SeriesPage } from '@/components/journal';
import { seriesMetadata } from '@/lib/seo';

export const metadata = seriesMetadata(
  'buyer-guides',
  'Nine practical playbooks on property research, financing, renovation, investment risk and homeownership decisions in Malaysia.'
);

export default function Page() {
  return <SeriesPage id="buyer-guides" />;
}
