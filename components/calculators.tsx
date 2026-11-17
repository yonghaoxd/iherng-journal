'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { computePurchase, formatMYR, RATES_REVIEWED } from '@/lib/calculator';
import { computeRental } from '@/lib/rental';

type Mode = 'buy' | 'rent';

/** Conveyancing searches, registration and other disbursements, as a fixed estimate. */
const DISBURSEMENTS = 1_500;

const noSubscription = () => () => {};

/** `?mode=rent` opens the rental view, so the old /rental-calculator URL can redirect here. */
function useModeParam(): Mode {
  return useSyncExternalStore(
    noSubscription,
    () => (new URLSearchParams(window.location.search).get('mode') === 'rent' ? 'rent' : 'buy'),
    () => 'buy',
  );
}

const rm = (value: number, decimals = 0) => {
  const text = formatMYR(Math.abs(value), decimals).replace(/^RM\s?/, 'RM ');
  return value < 0 ? `−${text}` : text;
};

function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
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
  step: number;
  prefix?: string;
  suffix?: string;
  slider?: boolean;
}) {
  const id = `calc-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div className="calcx-field">
      <div className="calcx-field-head">
        <label htmlFor={id}>{label}</label>
        {hint && <span>{hint}</span>}
      </div>
      <div className={`calcx-input ${prefix ? 'has-prefix' : ''} ${suffix ? 'has-suffix' : ''}`}>
        {prefix && <span className="calcx-affix prefix">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number.parseFloat(event.target.value);
            onChange(Number.isNaN(next) ? min : clamp(next));
          }}
        />
        {suffix && <span className="calcx-affix suffix">{suffix}</span>}
      </div>
      {slider && (
        <input
          type="range"
          className="calcx-range"
          aria-label={`${label} slider`}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(clamp(Number.parseFloat(event.target.value)))}
        />
      )}
    </div>
  );
}

/**
 * The purchase cost and rental cash flow calculators on one page. Price, financing,
 * rate and tenure are shared, so switching views keeps what the reader typed.
 */
export function Calculators() {
  const modeParam = useModeParam();
  const [chosenMode, setChosenMode] = useState<Mode | null>(null);
  const mode = chosenMode ?? modeParam;
  const isBuy = mode === 'buy';

  const [price, setPrice] = useState(500_000);
  const [downPercent, setDownPercent] = useState(10);
  const [rate, setRate] = useState(4.2);
  const [tenure, setTenure] = useState(35);
  const [absorbLegal, setAbsorbLegal] = useState(false);
  const [absorbMot, setAbsorbMot] = useState(false);
  const [rent, setRent] = useState(2_000);
  const [maintenance, setMaintenance] = useState(250);

  const purchase = useMemo(
    () =>
      computePurchase({
        price,
        downPaymentPercent: downPercent,
        interestRate: rate,
        tenureYears: tenure,
        developerAbsorbsLegalFees: absorbLegal,
        developerAbsorbsStampDuty: absorbMot,
        disbursements: DISBURSEMENTS,
      }),
    [price, downPercent, rate, tenure, absorbLegal, absorbMot],
  );
  const rental = useMemo(
    () =>
      computeRental({
        price,
        loanPercent: 100 - downPercent,
        interestRate: rate,
        tenureYears: tenure,
        monthlyRent: rent,
        maintenance,
        annualCosts: 0,
        vacantMonthsPerYear: 0,
      }),
    [price, downPercent, rate, tenure, rent, maintenance],
  );

  const switchTo = (next: Mode) => {
    setChosenMode(next);
    window.history.replaceState(null, '', next === 'rent' ? '/calculator?mode=rent' : '/calculator');
  };

  const instalment = purchase.monthly;
  const positive = rental.netCashFlow >= 0;
  const costs = instalment + maintenance;
  const scale = Math.max(rent, costs, 1);
  const share = (value: number) => `${(Math.max(0, value) / scale) * 100}%`;
  const ofRent = (value: number) => `${Math.round((value / Math.max(rent, 1)) * 100)}% of the rent`;

  const buyRows: { label: string; value: string; tone?: string }[] = [
    { label: 'Down payment', value: rm(purchase.upfront.downPayment) },
    { label: 'MOT stamp duty', value: absorbMot ? 'Paid by developer' : rm(purchase.upfront.motStampDuty) },
    { label: 'SPA legal fee', value: absorbLegal ? 'Paid by developer' : rm(purchase.upfront.spaLegalFee) },
    {
      label: 'Loan agreement legal fee',
      value: absorbLegal ? 'Paid by developer' : rm(purchase.upfront.loanAgreementLegalFee),
    },
    { label: 'Loan agreement stamp duty', value: rm(purchase.upfront.loanStampDuty) },
    { label: 'Searches and registration', value: rm(purchase.upfront.disbursements) },
  ];
  const rentRows: { label: string; value: string; tone?: string }[] = [
    { label: 'Rent collected', value: `+${rm(rent, 2)}`, tone: 'positive' },
    { label: 'Loan instalment', value: rm(-instalment, 2) },
    { label: 'Maintenance and sinking fund', value: rm(-maintenance, 2) },
  ];

  return (
    <div className="calcx">
      <div className="calcx-head">
        <div>
          <h1 className="calcx-title">Run the numbers.</h1>
          <p className="calcx-intro">
            {isBuy
              ? 'The cash you need on day one, and the instalment you will live with for decades.'
              : 'Whether the rent covers the loan, or the unit needs you to top it up every month.'}
          </p>
        </div>
        <div className="calcx-seg" role="tablist" aria-label="Calculator">
          <button type="button" role="tab" aria-selected={isBuy} className={isBuy ? 'on' : ''} onClick={() => switchTo('buy')}>
            Buying
          </button>
          <button type="button" role="tab" aria-selected={!isBuy} className={!isBuy ? 'on' : ''} onClick={() => switchTo('rent')}>
            Renting out
          </button>
        </div>
      </div>

      {isBuy ? (
        <section className="calcx-result calcx-result-buy" aria-label="Result" aria-live="polite">
          <div>
            <span className="calcx-eyebrow">Cash you need upfront</span>
            <span className="calcx-big">{rm(purchase.upfront.total)}</span>
            <span className="calcx-sub">Before renovation, furnishing or moving</span>
          </div>
          <div>
            <span className="calcx-eyebrow">Monthly instalment</span>
            <span className="calcx-big accent">{rm(instalment, 2)}</span>
            <span className="calcx-sub">
              On a {rm(purchase.loanAmount)} loan over {tenure} years
            </span>
          </div>
        </section>
      ) : (
        <>
          <section className={`calcx-result calcx-result-rent ${positive ? 'positive' : 'negative'}`} aria-label="Result" aria-live="polite">
            <div>
              <span className="calcx-eyebrow tone">{positive ? 'Positive cash flow' : 'Negative cash flow'}</span>
              <span className="calcx-big">
                {rm(rental.netCashFlow, 2)}
                <small> / month</small>
              </span>
              <span className="calcx-sub strong">
                {positive
                  ? `The unit pays you about ${rm(rental.annualCashFlow)} a year after its costs.`
                  : `You would top up about ${rm(-rental.annualCashFlow)} a year to hold this unit.`}
              </span>
            </div>
            <div className="calcx-mini-stats">
              <div>
                <span className="calcx-eyebrow">Break-even rent</span>
                <strong>{rm(rental.breakEvenRent, 2)}</strong>
              </div>
              <div>
                <span className="calcx-eyebrow">Gross yield</span>
                <strong>{rental.grossYield.toFixed(2)}%</strong>
                <small>{rental.netYield.toFixed(2)}% net</small>
              </div>
            </div>
          </section>

          <section className="calcx-card calcx-flow" aria-labelledby="calcx-flow-title">
            <div className="calcx-flow-head">
              <h2 id="calcx-flow-title">Where the rent goes</h2>
              <span>of {rm(rent)} rent each month</span>
            </div>
            <div className={`calcx-bar-wrap ${positive ? '' : 'over'}`}>
              {!positive && (
                <>
                  <span className="calcx-rent-label" style={{ left: share(rent) }}>
                    Rent
                  </span>
                  <span className="calcx-rent-line" style={{ left: share(rent) }} aria-hidden="true" />
                </>
              )}
              <div className="calcx-bar" role="img" aria-label={`Instalment ${rm(instalment)}, maintenance ${rm(maintenance)}, rent ${rm(rent)}`}>
                <span className="seg instalment" style={{ width: share(instalment) }} />
                <span className="seg maintenance" style={{ width: share(maintenance) }} />
                {positive && <span className="seg left" style={{ width: share(rental.netCashFlow) }} />}
                {!positive && <span className="calcx-topup" style={{ left: share(rent) }} aria-hidden="true" />}
              </div>
            </div>
            <div className="calcx-legend">
              <div className="instalment">
                <span>Instalment</span>
                <strong>{rm(instalment, 2)}</strong>
                <small>{ofRent(instalment)}</small>
              </div>
              <div className="maintenance">
                <span>Maintenance</span>
                <strong>{rm(maintenance, 2)}</strong>
                <small>{ofRent(maintenance)}</small>
              </div>
              {positive ? (
                <div className="left">
                  <span>Left for you</span>
                  <strong>{rm(rental.netCashFlow, 2)}</strong>
                  <small>{ofRent(rental.netCashFlow)}</small>
                </div>
              ) : (
                <div className="topup">
                  <span>You top up</span>
                  <strong>{rm(-rental.netCashFlow, 2)}</strong>
                  <small>Beyond the rent line</small>
                </div>
              )}
            </div>
            <p className="calcx-flow-note">
              {positive
                ? `The rent covers every cost with ${rm(rental.netCashFlow, 2)} to spare each month.`
                : `The instalment alone takes ${ofRent(instalment)}. Rent would need to reach ${rm(rental.breakEvenRent)} to break even.`}
            </p>
          </section>
        </>
      )}

      <div className="calcx-columns">
        <section className="calcx-card" aria-labelledby="calcx-inputs-title">
          <h2 id="calcx-inputs-title">Your numbers</h2>
          <div className="calcx-fields">
            <NumberField label="Property price" value={price} onChange={setPrice} min={100_000} max={2_000_000} step={1_000} prefix="RM" />
            {isBuy ? (
              <NumberField
                label="Down payment"
                hint={rm(purchase.downPayment)}
                value={downPercent}
                onChange={setDownPercent}
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
            ) : (
              <NumberField
                label="Loan margin"
                hint={`${rm(purchase.loanAmount)} loan`}
                value={100 - downPercent}
                onChange={(next) => setDownPercent(100 - next)}
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
            )}
            <NumberField label="Interest rate" hint="Usually about 4%" value={rate} onChange={setRate} min={2} max={7} step={0.05} suffix="% p.a." />
            <NumberField label="Loan tenure" value={tenure} onChange={setTenure} min={5} max={35} step={5} suffix="years" />
            {!isBuy && (
              <>
                <NumberField label="Expected monthly rent" value={rent} onChange={setRent} min={0} max={20_000} step={50} prefix="RM" />
                <NumberField label="Maintenance" hint="monthly" value={maintenance} onChange={setMaintenance} min={0} max={5_000} step={10} prefix="RM" slider={false} />
              </>
            )}
          </div>
          {isBuy && (
            <div className="calcx-pills">
              <button type="button" aria-pressed={absorbLegal} className={absorbLegal ? 'on' : ''} onClick={() => setAbsorbLegal(!absorbLegal)}>
                Developer pays legal fees
              </button>
              <button type="button" aria-pressed={absorbMot} className={absorbMot ? 'on' : ''} onClick={() => setAbsorbMot(!absorbMot)}>
                Developer pays MOT stamp duty
              </button>
            </div>
          )}
        </section>

        <section className="calcx-card" aria-labelledby="calcx-breakdown-title">
          <h2 id="calcx-breakdown-title">{isBuy ? 'Upfront breakdown' : 'Every month'}</h2>
          <ul className="calcx-rows">
            {(isBuy ? buyRows : rentRows).map((row) => (
              <li key={row.label}>
                <span>{row.label}</span>
                <strong className={row.tone ?? (row.value.startsWith('Paid') ? 'waived' : undefined)}>{row.value}</strong>
              </li>
            ))}
          </ul>
          <div className="calcx-total">
            <span>{isBuy ? 'Total upfront' : 'Net cash flow'}</span>
            <strong>{isBuy ? rm(purchase.upfront.total) : rm(rental.netCashFlow, 2)}</strong>
          </div>
          <div className="calcx-stats">
            <div>
              <span className="calcx-eyebrow">{isBuy ? 'Total interest' : 'Break-even rent'}</span>
              <strong>{isBuy ? rm(purchase.totalInterest) : rm(rental.breakEvenRent, 2)}</strong>
            </div>
            <div>
              <span className="calcx-eyebrow">{isBuy ? 'Income to aim for' : 'Gross yield'}</span>
              <strong>{isBuy ? `${rm(purchase.incomeGuideline)} / mo` : `${rental.grossYield.toFixed(2)}%`}</strong>
            </div>
          </div>
        </section>
      </div>

      <p className="calcx-disclaimer">
        An estimate, not a quotation. Stamp duty and legal fee scales were last checked on{' '}
        {new Date(`${RATES_REVIEWED}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}; confirm with your
        lawyer and bank, who also apply their own valuation and debt service ratio rules. The rental view leaves out
        vacancy, quit rent, assessment and insurance, so keep a buffer for them.
      </p>
    </div>
  );
}
