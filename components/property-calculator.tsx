'use client';

import { useMemo, useState } from 'react';
import {
  Calculator,
  Wallet,
  CalendarClock,
  Info,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import {
  computePurchase,
  formatMYR,
  RATES_REVIEWED,
  RATE_NOTES,
  type PurchaseInput,
} from '@/lib/calculator';

const DEFAULTS: PurchaseInput = {
  price: 500_000,
  downPaymentPercent: 10,
  interestRate: 4.2,
  tenureYears: 35,
  developerAbsorbsLegalFees: false,
  developerAbsorbsStampDuty: false,
  disbursements: 1_500,
};

function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  slider = true,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  slider?: boolean;
}) {
  const id = `calc-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className="calc-field">
      <div className="calc-field-head">
        <label htmlFor={id}>{label}</label>
        {hint && <span className="calc-hint">{hint}</span>}
      </div>
      <div className="calc-input-row">
        {prefix && <span className="calc-affix">{prefix}</span>}
        <input
          id={id}
          type="number"
          className="calc-input"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const next = Number.parseFloat(e.target.value);
            onChange(Number.isNaN(next) ? min : clamp(next));
          }}
        />
        {suffix && <span className="calc-affix suffix">{suffix}</span>}
      </div>
      {slider && (
        <input
          type="range"
          className="calc-range"
          aria-label={`${label} slider`}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(clamp(Number.parseFloat(e.target.value)))}
        />
      )}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={`calc-toggle ${checked ? 'on' : ''}`}>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="calc-toggle-box" aria-hidden="true" />
      <span className="calc-toggle-text">
        <strong>{label}</strong>
        <span>{hint}</span>
      </span>
    </label>
  );
}

export function PropertyCalculator() {
  const [input, setInput] = useState<PurchaseInput>(DEFAULTS);
  const result = useMemo(() => computePurchase(input), [input]);
  const set = <K extends keyof PurchaseInput>(key: K, value: PurchaseInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const isDefault = (Object.keys(DEFAULTS) as Array<keyof PurchaseInput>).every(
    (key) => input[key] === DEFAULTS[key]
  );

  const rows = [
    { label: 'Down payment', value: result.upfront.downPayment, always: true },
    { label: 'MOT stamp duty', value: result.upfront.motStampDuty },
    { label: 'SPA legal fee', value: result.upfront.spaLegalFee },
    { label: 'Loan agreement legal fee', value: result.upfront.loanAgreementLegalFee },
    { label: 'Loan agreement stamp duty', value: result.upfront.loanStampDuty },
    { label: 'Legal disbursements', value: result.upfront.disbursements },
  ];

  return (
    <div className="calc-shell">
      <div className="calc-grid">
        {/* Inputs */}
        <section className="calc-panel inputs" aria-label="Purchase assumptions">
          <div className="calc-panel-head">
            <span className="eyebrow">YOUR NUMBERS</span>
            <h2>Assumptions</h2>
          </div>

          <NumberField
            label="Property price"
            value={input.price}
            onChange={(v) => set('price', v)}
            min={50_000}
            max={5_000_000}
            step={10_000}
            prefix="RM"
          />
          <NumberField
            label="Down payment"
            hint={formatMYR(result.downPayment)}
            value={input.downPaymentPercent}
            onChange={(v) => set('downPaymentPercent', v)}
            min={0}
            max={100}
            step={1}
            suffix="%"
          />
          <NumberField
            label="Interest rate"
            hint="Typical Malaysian home loans sit near 4%"
            value={input.interestRate}
            onChange={(v) => set('interestRate', v)}
            min={0}
            max={12}
            step={0.05}
            suffix="% p.a."
          />
          <NumberField
            label="Loan tenure"
            hint={`Ends after ${Math.round(input.tenureYears * 12)} instalments`}
            value={input.tenureYears}
            onChange={(v) => set('tenureYears', v)}
            min={5}
            max={40}
            step={1}
            suffix="years"
          />
          <NumberField
            label="Legal disbursements"
            hint="Searches, registration and stamping"
            value={input.disbursements}
            onChange={(v) => set('disbursements', v)}
            min={0}
            max={10_000}
            step={100}
            prefix="RM"
            slider={false}
          />

          <div className="calc-toggles">
            <Toggle
              label="Developer absorbs legal fees"
              hint="Common on new launches"
              checked={input.developerAbsorbsLegalFees}
              onChange={(v) => set('developerAbsorbsLegalFees', v)}
            />
            <Toggle
              label="Developer absorbs MOT stamp duty"
              hint="Often bundled into the same package"
              checked={input.developerAbsorbsStampDuty}
              onChange={(v) => set('developerAbsorbsStampDuty', v)}
            />
          </div>

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

        {/* Results */}
        <section className="calc-panel results" aria-label="Estimated costs">
          <div className="calc-headline-row">
            <div className="calc-headline">
              <span className="calc-headline-label">
                <Wallet size={13} /> CASH NEEDED UPFRONT
              </span>
              <strong className="calc-headline-value">
                {formatMYR(result.upfront.total)}
              </strong>
              <span className="calc-headline-sub">
                Before renovation, furnishing or moving costs
              </span>
            </div>
            <div className="calc-headline">
              <span className="calc-headline-label">
                <CalendarClock size={13} /> MONTHLY INSTALMENT
              </span>
              <strong className="calc-headline-value accent">
                {formatMYR(result.monthly, 2)}
              </strong>
              <span className="calc-headline-sub">
                On a {formatMYR(result.loanAmount)} loan over {input.tenureYears} years
              </span>
            </div>
          </div>

          <div className="calc-breakdown">
            <h3>Upfront breakdown</h3>
            <ul className="calc-rows">
              {rows.map((row) =>
                row.value > 0 || row.always ? (
                  <li key={row.label}>
                    <span>{row.label}</span>
                    <span className="calc-row-value">{formatMYR(row.value)}</span>
                  </li>
                ) : (
                  <li key={row.label} className="waived">
                    <span>{row.label}</span>
                    <span className="calc-row-value">Waived</span>
                  </li>
                )
              )}
              <li className="calc-total">
                <span>Total upfront</span>
                <span className="calc-row-value">{formatMYR(result.upfront.total)}</span>
              </li>
            </ul>
            {result.waived > 0 && (
              <p className="calc-waived-note">
                The selected package removes {formatMYR(result.waived)} from your
                upfront cash. That cost is usually reflected in the asking price.
              </p>
            )}
          </div>

          <div className="calc-secondary">
            <div className="calc-stat">
              <span className="calc-stat-label">
                <TrendingUp size={12} /> Total interest
              </span>
              <strong>{formatMYR(result.totalInterest)}</strong>
              <span className="calc-stat-sub">
                {formatMYR(result.totalRepaid)} repaid over the full tenure
              </span>
            </div>
            <div className="calc-stat">
              <span className="calc-stat-label">
                <Calculator size={12} /> Income guideline
              </span>
              <strong>{formatMYR(result.incomeGuideline)}</strong>
              <span className="calc-stat-sub">
                Gross monthly pay that keeps this instalment near a third of income
              </span>
            </div>
          </div>
        </section>
      </div>

      <aside className="calc-disclaimer">
        <Info size={16} className="note-icon" />
        <div>
          <p>
            <strong>An estimate, not a quotation.</strong> Statutory scales were last
            reviewed on{' '}
            {new Date(RATES_REVIEWED).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            })}
            . Confirm current figures with your solicitor, bank and LHDN before
            committing to a purchase — banks also apply their own valuation, margin
            of finance and debt service ratio rules that this tool does not model.
          </p>
          <ul>
            {RATE_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
