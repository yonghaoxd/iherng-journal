'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Info,
  RotateCcw,
  Target,
  Percent,
} from 'lucide-react';
import { formatMYR } from '@/lib/calculator';
import { computeRental, type RentalInput } from '@/lib/rental';
import { CalcNumberField } from '@/components/calc-field';

const DEFAULTS: RentalInput = {
  price: 500_000,
  loanPercent: 90,
  interestRate: 4.2,
  tenureYears: 35,
  monthlyRent: 2_000,
  maintenance: 250,
  annualCosts: 500,
  vacantMonthsPerYear: 1,
};

export function RentalCalculator() {
  const [input, setInput] = useState<RentalInput>(DEFAULTS);
  const result = useMemo(() => computeRental(input), [input]);
  const set = <K extends keyof RentalInput>(key: K, value: RentalInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const isDefault = (Object.keys(DEFAULTS) as Array<keyof RentalInput>).every(
    (key) => input[key] === DEFAULTS[key]
  );

  const positive = result.isPositive;
  const tone = positive ? 'positive' : 'negative';
  const gap = Math.abs(result.breakEvenRent - input.monthlyRent);
  const breakEvenKnown = Number.isFinite(result.breakEvenRent);

  return (
    <div className="calc-shell">
      <div className="calc-grid">
        <section className="calc-panel inputs" aria-label="Rental assumptions">
          <div className="calc-panel-head">
            <span className="eyebrow">YOUR NUMBERS</span>
            <h2>The unit</h2>
          </div>

          <CalcNumberField
            label="Property price"
            value={input.price}
            onChange={(v) => set('price', v)}
            min={50_000}
            max={5_000_000}
            step={10_000}
            prefix="RM"
          />
          <CalcNumberField
            label="Loan margin"
            hint={`Borrowing ${formatMYR(result.loanAmount)}`}
            value={input.loanPercent}
            onChange={(v) => set('loanPercent', v)}
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
          <CalcNumberField
            label="Interest rate"
            value={input.interestRate}
            onChange={(v) => set('interestRate', v)}
            min={0}
            max={12}
            step={0.05}
            suffix="% p.a."
          />
          <CalcNumberField
            label="Loan tenure"
            hint={`Instalment ${formatMYR(result.instalment, 2)}`}
            value={input.tenureYears}
            onChange={(v) => set('tenureYears', v)}
            min={5}
            max={40}
            step={1}
            suffix="years"
          />

          <div className="calc-subhead">Rental side</div>

          <CalcNumberField
            label="Expected monthly rent"
            value={input.monthlyRent}
            onChange={(v) => set('monthlyRent', v)}
            min={0}
            max={30_000}
            step={50}
            prefix="RM"
          />
          <CalcNumberField
            label="Maintenance and sinking fund"
            hint="Billed monthly"
            value={input.maintenance}
            onChange={(v) => set('maintenance', v)}
            min={0}
            max={5_000}
            step={10}
            prefix="RM"
            slider={false}
          />
          <CalcNumberField
            label="Quit rent, assessment, insurance"
            hint="Billed yearly"
            value={input.annualCosts}
            onChange={(v) => set('annualCosts', v)}
            min={0}
            max={20_000}
            step={50}
            prefix="RM"
            slider={false}
          />
          <CalcNumberField
            label="Vacancy allowance"
            hint={`Collecting ${formatMYR(result.effectiveRent)} a month on average`}
            value={input.vacantMonthsPerYear}
            onChange={(v) => set('vacantMonthsPerYear', v)}
            min={0}
            max={6}
            step={0.5}
            suffix="months a year"
          />

          <button
            type="button"
            className="calc-reset"
            onClick={() => setInput(DEFAULTS)}
            disabled={isDefault}
          >
            <RotateCcw size={13} />
            <span>Reset to defaults</span>
          </button>
        </section>

        <section className="calc-panel results" aria-label="Cash flow result">
          <output className={`cashflow-verdict ${tone}`} aria-live="polite">
            <div className="cashflow-verdict-icon" aria-hidden="true">
              {positive ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
            <div className="cashflow-verdict-text">
              <span className="cashflow-label">
                {positive ? 'POSITIVE CASH FLOW' : 'NEGATIVE CASH FLOW'}
              </span>
              <strong className="cashflow-amount">
                {positive ? '+' : '−'}
                {formatMYR(Math.abs(result.netCashFlow), 2)}
                <span className="cashflow-period">/ month</span>
              </strong>
              <span className="cashflow-sub">
                {positive
                  ? `The rent covers the instalment and holding costs, leaving ${formatMYR(
                      result.annualCashFlow
                    )} a year.`
                  : `You would top up ${formatMYR(
                      Math.abs(result.annualCashFlow)
                    )} a year to hold this unit.`}
              </span>
            </div>
          </output>

          <div className="calc-breakdown">
            <h3>Monthly position</h3>
            <ul className="calc-rows">
              <li>
                <span>
                  Rent collected
                  {input.vacantMonthsPerYear > 0 && (
                    <em className="calc-row-note">
                      after {input.vacantMonthsPerYear} month
                      {input.vacantMonthsPerYear === 1 ? '' : 's'} vacancy
                    </em>
                  )}
                </span>
                <span className="calc-row-value in">
                  +{formatMYR(result.effectiveRent, 2)}
                </span>
              </li>
              <li>
                <span>Loan instalment</span>
                <span className="calc-row-value out">
                  −{formatMYR(result.instalment, 2)}
                </span>
              </li>
              <li>
                <span>Maintenance and sinking fund</span>
                <span className="calc-row-value out">
                  −{formatMYR(input.maintenance, 2)}
                </span>
              </li>
              <li>
                <span>
                  Quit rent, assessment, insurance
                  <em className="calc-row-note">spread monthly</em>
                </span>
                <span className="calc-row-value out">
                  −{formatMYR(input.annualCosts / 12, 2)}
                </span>
              </li>
              <li className={`calc-total ${tone}`}>
                <span>Net monthly cash flow</span>
                <span className="calc-row-value">
                  {positive ? '+' : '−'}
                  {formatMYR(Math.abs(result.netCashFlow), 2)}
                </span>
              </li>
            </ul>
          </div>

          <div className="calc-secondary">
            <div className="calc-stat">
              <span className="calc-stat-label">
                <Target size={12} /> Break-even rent
              </span>
              <strong>
                {breakEvenKnown ? formatMYR(result.breakEvenRent, 2) : 'Not reachable'}
              </strong>
              <span className="calc-stat-sub">
                {breakEvenKnown
                  ? positive
                    ? `Rent could fall ${formatMYR(gap)} before this turns negative.`
                    : `Rent needs to rise ${formatMYR(gap)} to break even.`
                  : 'A unit empty all year cannot break even at any rent.'}
              </span>
            </div>
            <div className="calc-stat">
              <span className="calc-stat-label">
                <Percent size={12} /> Rental yield
              </span>
              <strong>{result.grossYield.toFixed(2)}% gross</strong>
              <span className="calc-stat-sub">
                {result.netYield.toFixed(2)}% net of vacancy and holding costs, before
                financing
              </span>
            </div>
          </div>
        </section>
      </div>

      <aside className="calc-disclaimer">
        <Info size={16} className="note-icon" />
        <div>
          <p>
            <strong>Cash flow is not the whole return.</strong> A negative figure is not
            automatically a bad buy, and a positive one is not automatically a good one
            — capital growth, the loan principal you repay each month, and what else
            your deposit could have earned all sit outside this calculation.
          </p>
          <ul>
            <li>
              Income tax on rent is excluded, since it depends on your own tax band and
              deductible expenses.
            </li>
            <li>
              One-off purchase costs are excluded. Use the{' '}
              <Link href="/calculator">purchase cost calculator</Link> for those.
            </li>
            <li>
              Agent commission, repairs and furnishing replacement are not modelled;
              add them to the yearly costs field if you want them counted.
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
