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
import propertyResearch from '@/content/articles/property-research-before-buying.json';
import ownStay from '@/content/articles/choosing-own-stay-home.json';
import oldVsNew from '@/content/articles/old-house-vs-new-property.json';
import earlyRepayment from '@/content/articles/settle-housing-loan-early.json';
import guaranteedReturns from '@/content/articles/guaranteed-rental-return-risks.json';
import marketTiming from '@/content/articles/when-to-buy-property-data-guide.json';
import seriesData from '@/content/series.json';

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
  propertyResearch,
  ownStay,
  oldVsNew,
  earlyRepayment,
  guaranteedReturns,
  marketTiming,
];

export type Article = (typeof articles)[number];

/**
 * Series definitions live in JSON so the build-time SEO generator in
 * `scripts/generate-seo-assets.mjs` can read them without a TypeScript step.
 */
export const series = seriesData;

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

/**
 * The podcast and buyer guide articles use a problem-and-answer structure
 * instead of chaptered prose. Property reviews keep their chapters.
 */
export interface AskSean {
  /** "question" when a viewer wrote in; "problem" for a topic Sean raises himself. */
  kind: 'question' | 'problem';
  asker?: string;
  context: string;
  question: string;
  /** Sean's verdict, verbatim and short. Everything else is paraphrase. */
  quote: string;
  answer: string;
  reasons: Array<{ title: string; body: string }>;
  actions: string[];
  caveat: string;
}

export function askSeanFor(article: Article): AskSean | null {
  return 'qa' in article ? (article.qa as AskSean) : null;
}

/** Headline points, used for search, the RSS description and structured data. */
export function keyPointsFor(article: Article): string[] {
  const qa = askSeanFor(article);
  if (qa) return [qa.answer, ...qa.reasons.map((r) => `${r.title}: ${r.body}`)];
  return 'takeaways' in article ? article.takeaways : [];
}

/** Every piece of body copy, in reading order, whichever structure the article uses. */
export function bodyTextFor(article: Article): string[] {
  const qa = askSeanFor(article);
  if (qa) {
    return [
      qa.context,
      qa.question,
      qa.quote,
      qa.answer,
      ...qa.reasons.flatMap((r) => [r.title, r.body]),
      ...qa.actions,
      qa.caveat,
    ];
  }
  return [
    ...('takeaways' in article ? article.takeaways : []),
    ...('sections' in article
      ? article.sections.flatMap((s) => [s.heading, ...s.paragraphs])
      : []),
    ...('closing' in article ? [article.closing] : []),
  ];
}

export function readingTime(article: Article) {
  const text = [article.excerpt, ...bodyTextFor(article), article.sourceNote].join(' ');
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}
