/**
 * Malaysian property purchase cost model.
 *
 * The statutory scales below are the inputs most likely to go stale. They are
 * kept in one place, dated, and surfaced in the UI so a reader can check them
 * against the current source before relying on a number. Budget announcements
 * regularly add temporary first-home exemptions that are deliberately NOT
 * modelled here — see `RATE_NOTES`.
 */

export const RATES_REVIEWED = '2026-09-09';

/**
 * Memorandum of Transfer ad valorem stamp duty.
 * Source: Stamp Act 1949, First Schedule, Item 32(a).
 */
export const MOT_STAMP_DUTY_BANDS = [
  { upTo: 100_000, rate: 0.01 },
  { upTo: 500_000, rate: 0.02 },
  { upTo: 1_000_000, rate: 0.03 },
  { upTo: Infinity, rate: 0.04 },
];

/**
 * Solicitors' remuneration scale, applied separately to the sale and purchase
 * agreement (on price) and the loan agreement (on the loan sum).
 * Source: Solicitors' Remuneration Order 2023.
 */
export const LEGAL_FEE_BANDS = [
  { upTo: 500_000, rate: 0.0125 },
  { upTo: 1_000_000, rate: 0.01 },
  { upTo: 3_000_000, rate: 0.007 },
  { upTo: 5_000_000, rate: 0.006 },
  { upTo: 7_500_000, rate: 0.005 },
  { upTo: Infinity, rate: 0.005 },
];

/** Minimum payable under the remuneration order. */
export const LEGAL_FEE_MINIMUM = 500;

/** Loan agreement stamp duty is a flat ad valorem charge on the loan sum. */
export const LOAN_STAMP_DUTY_RATE = 0.005;

export const RATE_NOTES = [
  'Stamp duty above RM7.5 million and legal fees on that excess are negotiable, so large purchases are estimates only.',
  'Temporary first-home stamp duty exemptions announced in the annual Budget are not applied. If you qualify for one, your actual MOT duty will be lower.',
  'Real Property Gains Tax applies when selling, not buying, and is excluded.',
];

/** Apply a progressive band table to an amount. */
function applyBands(amount: number, bands: Array<{ upTo: number; rate: number }>) {
  if (amount <= 0) return 0;
  let total = 0;
  let previousCeiling = 0;
  for (const band of bands) {
    if (amount <= previousCeiling) break;
    const slice = Math.min(amount, band.upTo) - previousCeiling;
    total += slice * band.rate;
    previousCeiling = band.upTo;
  }
  return total;
}

export function motStampDuty(price: number) {
  return applyBands(price, MOT_STAMP_DUTY_BANDS);
}

export function legalFee(amount: number) {
  if (amount <= 0) return 0;
  return Math.max(LEGAL_FEE_MINIMUM, applyBands(amount, LEGAL_FEE_BANDS));
}

export function loanStampDuty(loan: number) {
  return Math.max(0, loan) * LOAN_STAMP_DUTY_RATE;
}

/**
 * Standard amortising instalment. Falls back to straight-line division when the
 * rate is zero, which the closed form cannot express.
 */
export function monthlyInstalment(principal: number, annualRatePercent: number, years: number) {
  const months = Math.round(years * 12);
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const growth = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * growth) / (growth - 1);
}

export interface PurchaseInput {
  price: number;
  downPaymentPercent: number;
  interestRate: number;
  tenureYears: number;
  /** Developer packages often absorb these on new launches. */
  developerAbsorbsLegalFees: boolean;
  developerAbsorbsStampDuty: boolean;
  /** Search fees, registration and other conveyancing disbursements. */
  disbursements: number;
}

export interface PurchaseResult {
  loanAmount: number;
  downPayment: number;
  upfront: {
    downPayment: number;
    motStampDuty: number;
    spaLegalFee: number;
    loanAgreementLegalFee: number;
    loanStampDuty: number;
    disbursements: number;
    total: number;
  };
  waived: number;
  monthly: number;
  totalRepaid: number;
  totalInterest: number;
  /** Income at which the instalment is a third of gross monthly pay. */
  incomeGuideline: number;
}

export function computePurchase(input: PurchaseInput): PurchaseResult {
  const price = Math.max(0, input.price);
  const downPayment = price * (Math.min(100, Math.max(0, input.downPaymentPercent)) / 100);
  const loanAmount = Math.max(0, price - downPayment);

  const fullMot = motStampDuty(price);
  const fullSpaLegal = legalFee(price);
  const fullLoanLegal = legalFee(loanAmount);

  const spaLegalFee = input.developerAbsorbsLegalFees ? 0 : fullSpaLegal;
  const loanAgreementLegalFee = input.developerAbsorbsLegalFees ? 0 : fullLoanLegal;
  const mot = input.developerAbsorbsStampDuty ? 0 : fullMot;
  const disbursements = Math.max(0, input.disbursements);

  // Loan agreement stamp duty is charged by the bank and is not part of a
  // developer's legal-fee package, so it is never waived here.
  const loanDuty = loanStampDuty(loanAmount);

  const upfrontTotal =
    downPayment + mot + spaLegalFee + loanAgreementLegalFee + loanDuty + disbursements;

  const monthly = monthlyInstalment(loanAmount, input.interestRate, input.tenureYears);
  const totalRepaid = monthly * Math.round(input.tenureYears * 12);

  return {
    loanAmount,
    downPayment,
    upfront: {
      downPayment,
      motStampDuty: mot,
      spaLegalFee,
      loanAgreementLegalFee,
      loanStampDuty: loanDuty,
      disbursements,
      total: upfrontTotal,
    },
    waived: fullMot - mot + (fullSpaLegal - spaLegalFee) + (fullLoanLegal - loanAgreementLegalFee),
    monthly,
    totalRepaid,
    totalInterest: Math.max(0, totalRepaid - loanAmount),
    incomeGuideline: monthly * 3,
  };
}

export function formatMYR(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.round(value * 100) / 100);
}
