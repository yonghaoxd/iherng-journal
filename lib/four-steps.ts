import { computePurchase } from '@/lib/calculator';

/**
 * Sean's four basic steps, as numbers. The loan eligibility method is the one from
 * his 2022 episode "How to calculate your loan eligibility": take 80% of gross
 * income as net, apply the bank's DSR limit, subtract existing repayments, then
 * multiply by about 250 for a 35-year loan (less as the borrower gets older).
 * Every bank does this its own way, so the page calls it a rough estimate.
 */

export type Intent = 'own' | 'invest';
export type Channel = 'New launch' | 'Subsale' | 'Bulk purchase' | 'Auction';

export const CHANNELS: Channel[] = ['New launch', 'Subsale', 'Bulk purchase', 'Auction'];
export const VIEWING_GOAL = 20;

/** Instalments are shown at a typical rate and the longest tenure. */
export const RATE = 4.2;
export const TENURE = 35;

/** Sean's furnishing budget for a rental unit that stands out in the top 20% of the market. */
export const FURNISHING = 50_000;

/**
 * Step 4's one-line best case. Sean: even in the weakest years, prices grew about
 * 3-4% a year on average, so 3% is the cautious end.
 */
export const PRICE_GROWTH = 3;

/** A price within 2% of the median nearby counts as in line with it. */
export const MEDIAN_TOLERANCE = 0.02;

/** Own stay: rent for similar units should cover about 85% of the instalment. */
export const OWN_STAY_RENT_SHARE = 0.85;

/** Banks allow a larger share of net income as repayments as income rises (2022 figures). */
export function dsrLimit(grossIncome: number): number {
  if (grossIncome < 3_000) return 0.6;
  if (grossIncome < 5_000) return 0.7;
  if (grossIncome < 10_000) return 0.75;
  return 0.8;
}

/** Loans end at about 70, so the multiplier falls with age. */
export function loanMultiplier(age: number): number {
  if (age <= 35) return 250;
  if (age <= 40) return 230;
  if (age <= 45) return 220;
  if (age <= 50) return 210;
  return Math.max(0, Math.round((210 * (70 - age)) / 20));
}

/** The first two housing loans can be up to 90%; from the third, usually 70%. */
export function loanMargin(existingHousingLoans: number): number {
  return existingHousingLoans >= 2 ? 0.7 : 0.9;
}

export interface Eligibility {
  net: number;
  dsr: number;
  allowedInstalment: number;
  multiplier: number;
  loan: number;
  margin: number;
  maxPrice: number;
}

export function loanEligibility(input: {
  income: number;
  debts: number;
  age: number;
  housingLoans: number;
}): Eligibility {
  const net = Math.max(0, input.income) * 0.8;
  const dsr = dsrLimit(input.income);
  const allowedInstalment = Math.max(0, net * dsr - Math.max(0, input.debts));
  const multiplier = loanMultiplier(input.age);
  const loan = allowedInstalment * multiplier;
  const margin = loanMargin(input.housingLoans);
  return { net, dsr, allowedInstalment, multiplier, loan, margin, maxPrice: loan / margin };
}

/** Upfront cash (down payment, stamp duties, legal fees) and the instalment for one property. */
export function costsFor(price: number, margin: number): { upfront: number; instalment: number } {
  const purchase = computePurchase({
    price,
    downPaymentPercent: (1 - margin) * 100,
    interestRate: RATE,
    tenureYears: TENURE,
    developerAbsorbsLegalFees: false,
    developerAbsorbsStampDuty: false,
  });
  return { upfront: purchase.upfront.total, instalment: purchase.monthly };
}

/**
 * The rent test for a viewing: for own stay, rent for similar units should cover
 * about 85% of the instalment (so it could be rented out if life changes); for an
 * investment, the whole instalment.
 */
export function rentTest(intent: Intent, rent: number, instalment: number) {
  const ratio = instalment > 0 ? rent / instalment : 0;
  const needed = intent === 'invest' ? 1 : OWN_STAY_RENT_SHARE;
  return { ratio, pass: ratio >= needed };
}
