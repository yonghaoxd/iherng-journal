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
import dorsettWaterfront from '@/content/articles/dorsett-waterfront-subang-subang-jaya.json';
import residensiAva from '@/content/articles/residensi-ava-kiara-bay.json';
import centrumIris from '@/content/articles/centrum-iris-brinchang.json';
import newBaby from '@/content/articles/new-baby-investment-strategy.json';
import cancelledBooking from '@/content/articles/cancelled-booking-fomo.json';
import parentsPayingHalf from '@/content/articles/parents-paying-half-for-house.json';
import stalledProject from '@/content/articles/stalled-project-projek-sakit.json';
import discountTrap from '@/content/articles/discount-price-still-losing-money.json';
import investingAt60 from '@/content/articles/investing-in-property-at-60.json';
import secondPropertyVsEquities from '@/content/articles/second-property-vs-equities.json';
import guruUnitsExit from '@/content/articles/property-guru-units-exit-plan.json';
import unsoldUnits from '@/content/articles/unsold-units-near-completion.json';
import leaseholdResale from '@/content/articles/leasehold-condo-resale-risk.json';
import sixPropertiesHoldOrSell from '@/content/articles/six-properties-hold-or-sell.json';
import singaporePrUnit from '@/content/articles/singapore-pr-malaysia-property.json';
import tenPaidCondos from '@/content/articles/selling-fully-paid-properties-retirement.json';
import tenantNotPaying from '@/content/articles/tenant-not-paying-rent.json';
import willAndInheritance from '@/content/articles/will-and-property-inheritance.json';
import loanInterestBasics from '@/content/articles/housing-loan-interest-flexi-explained.json';
import loanEligibility from '@/content/articles/housing-loan-eligibility-dsr.json';
import loanRejections from '@/content/articles/housing-loan-rejection-reasons.json';
import loanMistakesByIncome from '@/content/articles/loan-application-mistakes-by-income.json';
import lppsaLoan from '@/content/articles/lppsa-civil-servant-housing-loan.json';
import singaporeIncomeLoan from '@/content/articles/singapore-income-malaysia-housing-loan.json';
import timurbay from '@/content/articles/timurbay-seafront-residence-kuantan.json';
import teja from '@/content/articles/teja-subang-jaya.json';
import selayangMulia from '@/content/articles/selayang-mulia-selayang.json';
import metaResidences from '@/content/articles/meta-residences-seri-kembangan.json';
import paidOffHome from '@/content/articles/paid-off-home-next-generation.json';
import sohoBookingFee from '@/content/articles/soho-booking-fee-third-property.json';
import staffLoanBeforeBaby from '@/content/articles/staff-loan-condo-before-baby.json';
import dianII from '@/content/articles/dian-ii-residency-shah-alam.json';
import oskOmbak from '@/content/articles/osk-ombak-kuantan.json';
import residensiPitta from '@/content/articles/residensi-pitta-taman-miharja.json';
import oskAreca from '@/content/articles/osk-areca-nilai.json';
import sferaResidence from '@/content/articles/sfera-residence-wangsa-maju.json';
import oneSeputeh from '@/content/articles/one-seputeh-kuala-lumpur.json';
import sennaHeights from '@/content/articles/senna-heights-damansara-damai.json';
import nestree from '@/content/articles/nestree-residence-pantai-sentral-park.json';
import seriesData from '@/content/series.json';
import viewCounts from '@/content/view-counts.json';
import categoryList from '@/content/categories.json';
import stateList from '@/content/states.json';

export const articles = [
  // Property reviews, newest first; the homepage and series page keep this order.
  timurbay,
  teja,
  selayangMulia,
  dorsettWaterfront,
  residensiAva,
  dedaunRimba,
  centrumIris,
  oskAreca,
  dianII,
  oskOmbak,
  sferaResidence,
  residensiPitta,
  oneSeputeh,
  sennaHeights,
  nestree,
  sunwayDhill,
  allevia,
  avisa,
  metaResidences,
  manor,
  cempaka,
  // iherng Podcast, newest episode first; series pages keep this order.
  secondPropertyVsEquities,
  newBaby,
  cancelledBooking,
  sixPropertiesHoldOrSell,
  parentsPayingHalf,
  singaporePrUnit,
  stalledProject,
  tenPaidCondos,
  paidOffHome,
  sohoBookingFee,
  staffLoanBeforeBaby,
  discountTrap,
  investingAt60,
  firstHome,
  apartment,
  location,
  defects,
  channels,
  hiddenCosts,
  propertyResearch,
  ownStay,
  oldVsNew,
  earlyRepayment,
  guaranteedReturns,
  marketTiming,
  guruUnitsExit,
  unsoldUnits,
  leaseholdResale,
  tenantNotPaying,
  willAndInheritance,
  loanInterestBasics,
  loanEligibility,
  loanRejections,
  loanMistakesByIncome,
  lppsaLoan,
  singaporeIncomeLoan,
];

export type Article = (typeof articles)[number];

/**
 * Series definitions live in JSON so the build-time SEO generator in
 * `scripts/generate-seo-assets.mjs` can read them without a TypeScript step.
 */
export const series = seriesData;

export type SeriesKey = keyof typeof series;

/** Number of published articles in a series; counts on the page update as articles are added. */
export function seriesCount(seriesKey: SeriesKey): number {
  return articles.filter((article) => article.series === seriesKey).length;
}

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

/** "August 2026": when the episode was published. */
export function monthYearFor(article: Article) {
  return new Date(article.date + 'T12:00:00Z').toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * The fixed topic categories that podcast and buyer guide articles filter by.
 * Keeping the list short and fixed stops the filter growing with every article;
 * the finer `tag` stays on the card. scripts/check-content.mjs enforces it.
 */
export const categories = categoryList;

export type Category = (typeof categories)[number];

export function categoryFor(article: Article): Category | undefined {
  const id = 'category' in article ? article.category : undefined;
  return categories.find((category) => category.id === id);
}

/** Property reviews filter by these two types; check-content.mjs enforces them. */
export const propertyTypes = ['Landed', 'High-Rise'] as const;

/**
 * What Sean saw when he filmed a review: a show unit while the project was
 * still being built, or the finished project. It is the stage at filming, not
 * today; check-content.mjs enforces the two ids.
 */
export const stages = [
  {
    id: 'show-unit',
    label: 'Show unit',
    note: 'Reviewed at the show unit, while the project was being built',
  },
  {
    id: 'completed',
    label: 'Completed',
    note: 'Reviewed after the project was completed',
  },
] as const;

export type Stage = (typeof stages)[number];

/**
 * A review's optional standout: the one idea in the project Sean admired most,
 * as he describes it in the episode. Reviews without one simply omit it.
 */
export function standoutFor(
  article: Article,
): { title: string; body: string } | undefined {
  return 'standout' in article ? article.standout : undefined;
}

/**
 * Malaysia's states and federal territories, in the order the State filter
 * lists them. A review's `state` must be one of these and end its `location`;
 * check-content.mjs enforces both.
 */
export const states = stateList;

export function stateFor(article: Article): string | undefined {
  return 'state' in article && typeof article.state === 'string'
    ? article.state
    : undefined;
}

export function stageFor(article: Article): Stage | undefined {
  const id = 'stage' in article ? article.stage : undefined;
  return stages.find((stage) => stage.id === id);
}

/**
 * YouTube views of the article's video, as of `viewsAsOf()`. Refreshed with
 * `npm run views` (scripts/fetch-view-counts.mjs); undefined until fetched.
 */
export function viewsFor(article: Article): number | undefined {
  return (viewCounts.views as Record<string, number>)[article.videoId];
}

export function viewsAsOf() {
  return new Date(viewCounts.fetchedAt + 'T12:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "950", "12K", "1.2M": formatted by hand so server and browser render the same text. */
export function formatViews(count: number) {
  const compact = (n: number, unit: string) =>
    `${n >= 100 ? Math.round(n) : Math.round(n * 10) / 10}${unit}`;
  if (count >= 999_500) return compact(count / 1_000_000, 'M'); // not "1000K"
  if (count >= 1_000) return compact(count / 1_000, 'K');
  return String(count);
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
  /**
   * Set when a guest on Sean's channel (a lawyer, say) gives the answer, so the page
   * credits them instead of Sean. Absent means Sean answers.
   */
  answeredBy?: { name: string; role: string };
  /** The answerer's verdict, verbatim and short. Everything else is paraphrase. */
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
