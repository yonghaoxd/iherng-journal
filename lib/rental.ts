/**
 * Rental cash flow model for a financed Malaysian property.
 *
 * Cash flow here is the landlord's monthly position: rent actually collected,
 * less the loan instalment and the costs of holding the unit. It deliberately
 * excludes one-off purchase costs — `lib/calculator.ts` covers those — and
 * excludes tax, since rental income is assessed at the owner's own band.
 */

import { monthlyInstalment } from '@/lib/calculator';

export interface RentalInput {
  price: number;
  /** Margin of finance: the share of the price covered by the loan. */
  loanPercent: number;
  interestRate: number;
  tenureYears: number;
  monthlyRent: number;
  /** Service charge plus sinking fund, as billed monthly. */
  maintenance: number;
  /** Quit rent, assessment and fire insurance, as billed yearly. */
  annualCosts: number;
  /** Months the unit is expected to sit empty each year. */
  vacantMonthsPerYear: number;
}

export interface RentalResult {
  loanAmount: number;
  downPayment: number;
  instalment: number;
  /** Rent averaged over the year once vacancy is taken out. */
  effectiveRent: number;
  monthlyHolding: number;
  netCashFlow: number;
  annualCashFlow: number;
  isPositive: boolean;
  /** Rent at which the position breaks even, at the same vacancy rate. */
  breakEvenRent: number;
  grossYield: number;
  netYield: number;
  /** Share of collected rent consumed by the instalment and holding costs. */
  expenseRatio: number;
}

export function computeRental(input: RentalInput): RentalResult {
  const price = Math.max(0, input.price);
  const loanPercent = Math.min(100, Math.max(0, input.loanPercent));
  const loanAmount = price * (loanPercent / 100);
  const downPayment = price - loanAmount;

  const instalment = monthlyInstalment(loanAmount, input.interestRate, input.tenureYears);

  const vacantMonths = Math.min(12, Math.max(0, input.vacantMonthsPerYear));
  const occupancy = (12 - vacantMonths) / 12;
  const rent = Math.max(0, input.monthlyRent);
  const effectiveRent = rent * occupancy;

  const monthlyHolding = Math.max(0, input.maintenance) + Math.max(0, input.annualCosts) / 12;
  const netCashFlow = effectiveRent - instalment - monthlyHolding;

  // At full vacancy no rent can clear the costs, so break-even is undefined.
  const breakEvenRent =
    occupancy > 0 ? (instalment + monthlyHolding) / occupancy : Number.POSITIVE_INFINITY;

  const grossYield = price > 0 ? ((rent * 12) / price) * 100 : 0;
  const netYield =
    price > 0 ? (((effectiveRent - monthlyHolding) * 12) / price) * 100 : 0;

  return {
    loanAmount,
    downPayment,
    instalment,
    effectiveRent,
    monthlyHolding,
    netCashFlow,
    annualCashFlow: netCashFlow * 12,
    isPositive: netCashFlow >= 0,
    breakEvenRent,
    grossYield,
    netYield,
    expenseRatio:
      effectiveRent > 0 ? ((instalment + monthlyHolding) / effectiveRent) * 100 : 0,
  };
}
