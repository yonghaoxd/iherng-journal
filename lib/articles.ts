import manor from '@/content/articles/manor-born-ipoh.json';
import cempaka from '@/content/articles/cempaka-seri-kota-seriemas.json';
import avisa from '@/content/articles/avisa-residences-tropicana-alam.json';
import apartment from '@/content/articles/apartment-vs-landed.json';
import firstHome from '@/content/articles/first-property-must-be-a-home.json';
import location from '@/content/articles/location-location-location.json';
import defects from '@/content/articles/defect-inspection-checklist.json';
import channels from '@/content/articles/new-launch-vs-subsale.json';
import hiddenCosts from '@/content/articles/hidden-costs-property-malaysia.json';
import dedaunRimba from '@/content/articles/dedaun-rimba-kwasa-damansara.json';
import sunwayDhill from '@/content/articles/sunway-dhill-kota-damansara.json';
import allevia from '@/content/articles/allevia-mont-kiara.json';

export const articles = [
  manor,
  cempaka,
  avisa,
  apartment,
  firstHome,
  location,
  defects,
  channels,
  hiddenCosts,
  dedaunRimba,
  sunwayDhill,
  allevia,
];

export type Article = (typeof articles)[number];

export const series = {
  'property-reviews': {
    title: 'Property Reviews',
    number: '01',
    label: 'ON LOCATION',
    description: 'Step inside the homes. Look beyond the brochure.',
    intro:
      'Walk through Malaysian homes with Sean, from the spaces that work to the details worth questioning.',
  },
  'iherng-podcast': {
    title: 'iherng Podcast',
    number: '02',
    label: 'IN CONVERSATION',
    description: 'Real questions. A little more perspective.',
    intro:
      'A reading companion to Asking Sean. Conversations about choosing a home, family expectations, and the thinking behind a purchase.',
  },
  'buyer-guides': {
    title: 'Buyer Guides',
    number: '03',
    label: 'THE PLAYBOOK',
    description:
      'Practical checklists and clear-eyed guidance for Malaysian real estate.',
    intro:
      'Step-by-step buyer playbooks on defect inspections, purchasing channels, and avoiding costly real estate traps.',
  },
};

export type SeriesKey = keyof typeof series;

export function seriesFor(article: Article) {
  return series[article.series as SeriesKey];
}

export function imageFor(article: Article) {
  return `https://i.ytimg.com/vi/${article.videoId}/maxresdefault.jpg`;
}

export function dateFor(article: Article) {
  return new Date(article.date + 'T12:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function readingTime(article: Article) {
  const text = [
    article.excerpt,
    ...article.takeaways,
    ...article.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    article.closing,
    article.sourceNote,
  ].join(' ');
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}
