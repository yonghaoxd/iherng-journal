'use client';

import { useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Info, Plus, Star, X } from 'lucide-react';
import { formatMYR } from '@/lib/calculator';
import {
  CHANNELS,
  FURNISHING,
  MEDIAN_TOLERANCE,
  OWN_STAY_RENT_SHARE,
  PRICE_GROWTH,
  VIEWING_GOAL,
  costsFor,
  loanEligibility,
  rentTest,
  type Channel,
  type Intent,
} from '@/lib/four-steps';
import {
  clearFourSteps,
  useFourSteps,
  type FourStepsState,
  type PitchChecks,
  type Readiness,
  type Viewing,
} from '@/lib/four-steps-store';

const rm = (value: number) =>
  (value < 0 ? '−' : '') + formatMYR(Math.abs(Math.round(value))).replace(/^RM\s?/, 'RM ');
const rmk = (value: number) => rm(Math.round(value / 1000) * 1000);

const INTENTS: { id: Intent; title: string; desc: string }[] = [
  { id: 'own', title: 'Own stay', desc: 'A home to live in for years, which you could rent out if life changes.' },
  { id: 'invest', title: 'Investment', desc: 'Rent it out from day one.' },
];

const READINESS: { id: keyof Readiness; label: string }[] = [
  { id: 'fund', label: 'About six months of expenses saved as an emergency fund' },
  { id: 'insurance', label: 'Medical insurance in place' },
  { id: 'career', label: 'A stable job or clear career path' },
  { id: 'partner', label: 'My partner or family knows and agrees with this purchase' },
];

/** Sean on FOMO: hot markets and sales pitches make buyers skip their own numbers. */
const PITCH: { id: keyof PitchChecks; label: string }[] = [
  { id: 'ownNumbers', label: "The rent and price I am relying on are my own numbers, not an agent's" },
  { id: 'grossOrNett', label: 'Any return I was quoted: I know if it is gross or nett, and how it was worked out' },
  { id: 'notGrr', label: 'It is not a guaranteed-rental-return (GRR) scheme' },
];

type CheckState = 'ok' | 'warn' | 'unknown';
type LevelState = 'ok' | 'warn' | 'info';

/**
 * Step 4 for the one property picked: Sean's two checks (price against the median
 * nearby, rent against the instalment), his rental plans, the worst-case ladder and
 * whether the reader's own cash can carry it.
 */
function decide(
  pick: Viewing & { upfront: number; instalment: number },
  state: FourStepsState,
  isInvest: boolean,
) {
  const cost = pick.instalment + pick.maint;
  // Investment: rent must cover the instalment and maintenance. Own stay: Sean's 85% rule.
  const rentNeeded = isInvest ? cost : pick.instalment * OWN_STAY_RENT_SHARE;

  const diff = pick.median ? (pick.price - pick.median) / pick.median : null;
  const priceState: CheckState = diff === null ? 'unknown' : diff <= MEDIAN_TOLERANCE ? 'ok' : 'warn';
  const rentOk = pick.rent > 0 && pick.rent >= rentNeeded;
  const checks: { title: string; state: CheckState; headline: string; compare: string; why: string }[] = [
    {
      title: 'Price vs median nearby',
      state: priceState,
      headline:
        diff === null
          ? 'Add the median price'
          : Math.abs(diff) <= MEDIAN_TOLERANCE
            ? 'In line with the median'
            : diff > 0
              ? `${Math.round(diff * 100)}% above the median`
              : `${Math.round(-diff * 100)}% below the median`,
      compare: pick.median
        ? `${rm(pick.price)} against a median of ${rm(pick.median)} for similar units nearby`
        : 'Enter the median transacted price for similar units nearby, above.',
      why: 'The median, not the average, so a few luxury units do not skew it.',
    },
    {
      title: isInvest ? 'Rent vs instalment' : 'Rent vs 85% of the instalment',
      state: rentOk ? 'ok' : 'warn',
      headline: rentOk ? 'Rent covers it' : `Short by ${rm(rentNeeded - pick.rent)} a month`,
      compare: isInvest
        ? `Rent ${rm(pick.rent)} against ${rm(pick.instalment)} instalment${pick.maint ? ` + ${rm(pick.maint)} maintenance` : ''}`
        : `Rent ${rm(pick.rent)} against 85% of the ${rm(pick.instalment)} instalment (${rm(rentNeeded)})`,
      why: isInvest
        ? 'Plan A: the whole unit to a long-term tenant, at what similar units rent for now.'
        : 'So you could rent it out if life changes, without bleeding every month.',
    },
  ];
  const passed = checks.filter((check) => check.state === 'ok').length;

  const longTerm = [pick.rent, pick.room].filter((rent) => rent > 0 && rent >= rentNeeded).length;
  const onlyStay = longTerm === 0 && pick.stay > 0 && pick.stay >= rentNeeded;
  const planVerdict = onlyStay
    ? 'Only short-term stay covers it: too risky on its own.'
    : longTerm === 0
      ? `No plan covers the ${rm(rentNeeded)} a month yet.`
      : `${longTerm} of 2 long-term plans cover the ${rm(rentNeeded)} a month.`;

  const left = state.savings - pick.upfront - (isInvest ? FURNISHING : 0);
  const carryNeed = state.emptyMonths * cost;
  const carries = left >= carryNeed;
  const isNew = pick.channel === 'New launch';

  const ladder: { title: string; cover: string; status: string; state: LevelState }[] = [];
  ladder.push({
    title: isInvest ? `No tenant for ${state.emptyMonths} months` : `No income for ${state.emptyMonths} months`,
    cover: `You pay ${rm(carryNeed)} from the cash left after the keys${isInvest ? ' and furnishing' : ''} (${rm(Math.max(0, left))}).`,
    status: carries ? 'Covered' : `Short ${rm(carryNeed - Math.max(0, left))}`,
    state: carries ? 'ok' : 'warn',
  });
  if (isInvest) {
    const lower = pick.rent * (1 - state.rentDrop / 100);
    const holds = lower >= cost;
    ladder.push({
      title: `Rent falls ${state.rentDrop}% to ${rm(lower)}`,
      cover: holds ? 'Still covers the instalment and maintenance.' : `You top up ${rm(cost - lower)} every month.`,
      status: holds ? 'Covered' : `${rm(lower - cost)}/mo`,
      state: holds ? 'ok' : 'warn',
    });
    ladder.push({
      title: 'Tenant stops paying',
      cover: 'A stamped tenancy agreement, then a reminder, a Letter of Demand and a court order (about 3 months).',
      status: 'Know the steps',
      state: 'info',
    });
  } else {
    ladder.push({
      title: 'Life changes and you rent it out',
      cover: rentOk
        ? 'Rent for similar units covers at least 85% of the instalment.'
        : `You would top up ${rm(pick.instalment - pick.rent)} every month.`,
      status: rentOk ? 'Covered' : `${rm(pick.rent - pick.instalment)}/mo`,
      state: rentOk ? 'ok' : 'warn',
    });
  }
  if (isNew) {
    ladder.push({
      title: 'Project abandoned',
      cover:
        "You keep paying interest on what was released. Check the developer is not on the government's list of developers who failed to deliver, and look at their past projects.",
      status: 'Check the developer',
      state: 'info',
    });
  }
  ladder.push({
    title: 'You must sell in the first 3 years',
    cover: isNew
      ? 'A new project is usually valued below its SPA price for the first 2 to 3 years, so selling early means a loss. Can you afford to sell, or will you hold?'
      : 'After stamp duty and legal fees, selling early usually means a loss. Can you afford to sell, or will you hold?',
    status: 'Plan to hold',
    state: 'info',
  });

  return {
    checks,
    passed,
    unknownPrice: priceState === 'unknown',
    rentNeeded,
    planVerdict,
    planTone: onlyStay || longTerm === 0 ? 'warn' : 'good',
    ladder,
    left,
    carryNeed,
    carries,
    value5: pick.price * Math.pow(1 + PRICE_GROWTH / 100, 5),
  };
}

function MoneyInput({
  id,
  value,
  onChange,
  step,
  placeholder,
  suffix,
  small = false,
}: {
  id: string;
  value: number | '';
  onChange: (value: number | '') => void;
  step: number;
  placeholder?: string;
  suffix?: string;
  small?: boolean;
}) {
  return (
    <span className={`fs-input has-prefix ${suffix ? 'has-suffix' : ''} ${small ? 'small' : ''}`}>
      <span className="fs-affix prefix">RM</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? '' : Math.max(0, Number(raw) || 0));
        }}
      />
      {suffix && <span className="fs-affix suffix">{suffix}</span>}
    </span>
  );
}

interface Draft {
  name: string;
  price: number | '';
  rent: number | '';
  channel: Channel;
}

const EMPTY_DRAFT: Draft = { name: '', price: '', rent: '', channel: 'Subsale' };

/** Sean's four basic steps as a worksheet the reader fills in. Saved in this browser only. */
export function FourSteps() {
  const [state, update] = useFourSteps();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [plansOpen, setPlansOpen] = useState(false);

  const isInvest = state.intent === 'invest';
  const elig = loanEligibility({
    income: state.income,
    debts: state.debts,
    age: state.age,
    housingLoans: state.housingLoans,
  });
  const budget = elig.maxPrice;

  const viewings = state.viewings.map((viewing) => {
    const { upfront, instalment } = costsFor(viewing.price, elig.margin);
    const rent = rentTest(state.intent, viewing.rent, instalment);
    return { ...viewing, upfront, instalment, ...rent, within: viewing.price <= budget };
  });
  const viewedCount = viewings.length;

  const setViewing = (id: number, patch: Partial<Viewing>) =>
    update((current) => ({
      viewings: current.viewings.map((viewing) => (viewing.id === id ? { ...viewing, ...patch } : viewing)),
    }));
  const removeViewing = (id: number) =>
    update((current) => ({ viewings: current.viewings.filter((viewing) => viewing.id !== id) }));

  const addViewing = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(draft.price) || 0;
    if (!draft.name.trim() || price <= 0) return;
    update((current) => ({
      viewings: [
        ...current.viewings,
        {
          id: Math.max(0, ...current.viewings.map((viewing) => viewing.id)) + 1,
          name: draft.name.trim().slice(0, 120),
          channel: draft.channel,
          price,
          rent: Number(draft.rent) || 0,
          star: false,
          median: null,
          maint: 0,
          room: 0,
          stay: 0,
          why: '',
          wrong: '',
        },
      ],
    }));
    setDraft({ ...EMPTY_DRAFT, channel: draft.channel });
  };

  // Step 4: the one property picked from the starred viewings, against Sean's checks.
  const starred = viewings.filter((viewing) => viewing.star);
  const pick = starred.find((viewing) => viewing.id === state.pick) ?? starred[0] ?? null;
  const decision = pick ? decide(pick, state, isInvest) : null;

  const readyCount = READINESS.filter((item) => state.readiness[item.id]).length;
  const pitchCount = PITCH.filter((item) => state.pitch[item.id]).length;
  const left = Math.max(0, VIEWING_GOAL - viewedCount);

  const intentTitle = INTENTS.find((item) => item.id === state.intent)?.title ?? '';
  const steps = [
    { n: 1, title: 'Know why', status: intentTitle, done: true },
    { n: 2, title: 'Loan eligibility', status: `Eligible for ${rmk(elig.loan)}`, done: elig.loan > 0 },
    { n: 3, title: `View ${VIEWING_GOAL}`, status: `${viewedCount} of ${VIEWING_GOAL} viewed`, done: viewedCount >= VIEWING_GOAL },
    {
      n: 4,
      title: 'Decide',
      status: decision
        ? `${pick?.name} · ${decision.passed} of 2 checks`
        : starred.length
          ? 'Pick the one'
          : 'Star a property in Step 3',
      done: false,
    },
  ];
  const current = (steps.find((step) => !step.done) ?? steps[3]).n;

  const eligRows = [
    { label: 'Net income (80% of your gross)', value: rm(elig.net) },
    { label: '× DSR limit for your income band', value: `${Math.round(elig.dsr * 100)}%` },
    { label: '− Existing repayments', value: `−${rm(state.debts)}` },
    { label: '= Instalment the bank allows', value: `${rm(elig.allowedInstalment)}/mo` },
    { label: `× ${elig.multiplier} for a loan that ends by about age 70`, value: rm(elig.loan), strong: true },
  ];

  const numberField = (key: 'income' | 'debts' | 'age') => (value: number | '') =>
    update({ [key]: value === '' ? 0 : value });

  return (
    <div className="fs">
      <div className="fs-head">
        <h1 className="fs-title">Sean&apos;s 4 basic steps</h1>
        <p>
          Know why you are buying, find out your loan eligibility, view {VIEWING_GOAL} properties, then decide. Fill it
          in as you go. It stays in this browser and nothing is sent anywhere.
        </p>
      </div>

      <nav className="fs-progress" aria-label="Your progress">
        {steps.map((step) => (
          <a
            key={step.n}
            href={`#step-${step.n}`}
            className={`${step.done ? 'done' : ''} ${step.n === current ? 'current' : ''}`}
          >
            <span className="fs-progress-dot">{step.done ? <Check size={16} strokeWidth={3} /> : step.n}</span>
            <span className="fs-progress-text">
              <strong>{step.title}</strong>
              <span>{step.status}</span>
            </span>
          </a>
        ))}
      </nav>

      {/* STEP 1 */}
      <section id="step-1" className="fs-card" aria-labelledby="fs-s1">
        <div className="fs-step-head">
          <div>
            <span className="fs-eyebrow">Step 1</span>
            <h2 id="fs-s1">Why are you buying?</h2>
          </div>
          <span className="fs-step-note">Your reason decides which rules apply.</span>
        </div>
        <div className="fs-intents" role="radiogroup" aria-label="Why are you buying">
          {INTENTS.map((intent) => (
            <button
              key={intent.id}
              type="button"
              role="radio"
              aria-checked={state.intent === intent.id}
              className={state.intent === intent.id ? 'on' : ''}
              onClick={() => update({ intent: intent.id })}
            >
              <strong>{intent.title}</strong>
              <span>{intent.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* STEP 2 */}
      <section id="step-2" className="fs-card" aria-labelledby="fs-s2">
        <div className="fs-step-head">
          <div>
            <span className="fs-eyebrow">Step 2</span>
            <h2 id="fs-s2">Find out your loan eligibility.</h2>
          </div>
          <span className="fs-step-note">Banks decide on your salary, your existing loans and your age.</span>
        </div>

        <div className="fs-fields">
          <label className="fs-field" htmlFor="fs-income">
            <span className="fs-label">Gross monthly income</span>
            <MoneyInput id="fs-income" value={state.income} onChange={numberField('income')} step={100} />
          </label>
          <label className="fs-field" htmlFor="fs-debts">
            <span className="fs-label">Existing monthly repayments</span>
            <MoneyInput id="fs-debts" value={state.debts} onChange={numberField('debts')} step={50} />
            <span className="fs-hint">Car, PTPTN, personal loans, 5% of card balances</span>
          </label>
          <label className="fs-field" htmlFor="fs-age">
            <span className="fs-label">Your age</span>
            <span className="fs-input">
              <input
                id="fs-age"
                type="number"
                inputMode="numeric"
                min={18}
                max={70}
                step={1}
                value={state.age}
                onChange={(event) => update({ age: Math.max(0, Number(event.target.value) || 0) })}
              />
            </span>
            <span className="fs-hint">Loans usually end by about age 70</span>
          </label>
        </div>

        <div className="fs-loans">
          <span className="fs-label">Housing loans you already have</span>
          <div className="fs-seg" role="radiogroup" aria-label="Housing loans you already have">
            {[0, 1, 2].map((count) => (
              <button
                key={count}
                type="button"
                role="radio"
                aria-checked={state.housingLoans === count}
                className={state.housingLoans === count ? 'on' : ''}
                onClick={() => update({ housingLoans: count })}
              >
                {count === 2 ? '2 or more' : count}
              </button>
            ))}
          </div>
          <span className="fs-hint">
            {state.housingLoans >= 2
              ? 'From the third housing loan, banks usually lend 70%.'
              : 'Your first two housing loans can be up to 90%.'}
          </span>
        </div>

        <div className="fs-result" aria-live="polite">
          <div>
            <span className="fs-eyebrow">Your loan eligibility</span>
            <span className="fs-big">{rmk(elig.loan)}</span>
            <span className="fs-sub">The most a bank is likely to lend you</span>
          </div>
          <div>
            <span className="fs-eyebrow">Look at properties up to</span>
            <span className="fs-big accent">{rmk(budget)}</span>
            <span className="fs-sub">At a {Math.round(elig.margin * 100)}% loan. Step 3 uses this range.</span>
          </div>
        </div>

        <div>
          <ul className="fs-rows">
            {eligRows.map((row) => (
              <li key={row.label} className={row.strong ? 'strong' : ''}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </li>
            ))}
          </ul>
          <div className="fs-note" role="note">
            <Info size={18} aria-hidden="true" />
            <p>
              <strong>A rough estimate only.</strong> Every bank calculates eligibility its own way: DSR limits, how much
              of your income counts and the loan multiplier all differ, so a bank may offer you more or less than this.
              Banks also check your CCRIS, where late payments in the last 12 months can cut the amount or raise your
              rate. Ask the bank for its own figure before you commit.
            </p>
          </div>
        </div>
      </section>

      {/* STEP 3 */}
      <section id="step-3" className="fs-card" aria-labelledby="fs-s3">
        <div className="fs-step-head end">
          <div className="fs-step-intro">
            <span className="fs-eyebrow">Step 3</span>
            <h2 id="fs-s3">View {VIEWING_GOAL} properties in your range.</h2>
            <p>
              &ldquo;Go visit and visit and visit properties.&rdquo; After about {VIEWING_GOAL}, the sales pitches start
              to sound alike, and you know what you like.
            </p>
          </div>
          <div className="fs-count">
            <span>
              <strong>{viewedCount}</strong> of {VIEWING_GOAL} viewed
            </span>
            <span className="fs-count-bar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (viewedCount / VIEWING_GOAL) * 100)}%` }} />
            </span>
          </div>
        </div>

        <div className="fs-channels">
          <span>Buying channels seen</span>
          {CHANNELS.map((channel) => {
            const count = viewings.filter((viewing) => viewing.channel === channel).length;
            return (
              <span key={channel} className={`fs-channel ${count ? 'seen' : ''}`}>
                {channel} · {count}
              </span>
            );
          })}
        </div>

        {viewings.length > 0 ? (
          <div className="fs-table-wrap">
            <table className="fs-table">
              <thead>
                <tr>
                  <th scope="col">Property</th>
                  <th scope="col">Price</th>
                  <th scope="col">Rent / instalment</th>
                  <th scope="col">Shortlist</th>
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {viewings.map((viewing) => (
                  <tr key={viewing.id}>
                    <th scope="row">
                      <strong>{viewing.name}</strong>
                      <span>{viewing.channel}</span>
                    </th>
                    <td>
                      <strong>{rm(viewing.price)}</strong>
                      <span className={viewing.within ? '' : 'warn'}>
                        {viewing.within ? 'Within your range' : 'Over your range'}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {rm(viewing.rent)} / {rm(viewing.instalment)}
                      </strong>
                      <span className={viewing.pass ? 'good' : 'warn'}>
                        {Math.round(viewing.ratio * 100)}% covered · {viewing.pass ? 'passes' : 'fails'}
                        {isInvest ? ' the full-cover test' : ' the 85% rule'}
                      </span>
                    </td>
                    <td className="center">
                      <button
                        type="button"
                        className={`fs-icon-btn star ${viewing.star ? 'on' : ''}`}
                        aria-pressed={viewing.star}
                        aria-label={`${viewing.star ? 'Remove from shortlist' : 'Add to shortlist'}: ${viewing.name}`}
                        onClick={() => setViewing(viewing.id, { star: !viewing.star })}
                      >
                        <Star size={18} fill={viewing.star ? 'currentColor' : 'none'} aria-hidden="true" />
                      </button>
                    </td>
                    <td className="center">
                      <button
                        type="button"
                        className="fs-icon-btn quiet"
                        aria-label={`Remove ${viewing.name}`}
                        onClick={() => removeViewing(viewing.id)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="fs-empty">No viewings yet. Add each property you visit below, and star the ones you like.</p>
        )}

        <form className="fs-add" onSubmit={addViewing} aria-labelledby="fs-add-title">
          <div className="fs-add-head">
            <span className="fs-add-icon" aria-hidden="true">
              <Plus size={16} strokeWidth={2.4} />
            </span>
            <h3 id="fs-add-title">Add a viewing</h3>
          </div>
          <div className="fs-add-fields">
            <label className="fs-field wide" htmlFor="fs-add-name">
              <span className="fs-label">Property</span>
              <span className="fs-input">
                <input
                  id="fs-add-name"
                  type="text"
                  maxLength={120}
                  placeholder="e.g. 3-bed condo, Cheras"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </span>
            </label>
            <label className="fs-field" htmlFor="fs-add-price">
              <span className="fs-label">Price</span>
              <MoneyInput
                id="fs-add-price"
                value={draft.price}
                onChange={(price) => setDraft({ ...draft, price })}
                step={1000}
                placeholder="350,000"
              />
            </label>
            <label className="fs-field" htmlFor="fs-add-rent">
              <span className="fs-label">Rent nearby</span>
              <MoneyInput
                id="fs-add-rent"
                value={draft.rent}
                onChange={(rent) => setDraft({ ...draft, rent })}
                step={50}
                placeholder="1,400"
                suffix="/mo"
              />
            </label>
          </div>
          <div className="fs-add-actions">
            <div className="fs-pills" role="radiogroup" aria-label="Buying channel">
              {CHANNELS.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  role="radio"
                  aria-checked={draft.channel === channel}
                  className={draft.channel === channel ? 'on' : ''}
                  onClick={() => setDraft({ ...draft, channel })}
                >
                  {channel}
                </button>
              ))}
            </div>
            <button type="submit" className="fs-cta" disabled={!draft.name.trim() || !Number(draft.price)}>
              Add viewing <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="fs-add-foot">
            <span>Rent nearby is what similar units actually rent for on the portals.</span>
            <Link href="/property-reviews">
              Not sure what to view? Browse Sean&apos;s reviews <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </form>
      </section>

      {/* STEP 4 */}
      <section id="step-4" className="fs-card" aria-labelledby="fs-s4">
        <div className="fs-step-head">
          <div className="fs-step-intro">
            <span className="fs-eyebrow">Step 4</span>
            <h2 id="fs-s4">Make that informed decision and take that calculated risk.</h2>
            <p>
              Pick the one, run Sean&apos;s two checks, and make sure you can live through the worst case. Then decide by
              your own standard.
            </p>
          </div>
        </div>

        {left > 0 && (
          <p className="fs-gate">
            You have viewed {viewedCount} of {VIEWING_GOAL}. Sean would keep looking before committing: {left} more to
            go.
          </p>
        )}

        {pick && decision ? (
          <>
            {/* 1. The one */}
            <div className="fs-block">
              <div className="fs-block-head">
                <h3>1. Pick the one</h3>
                <span>
                  From the properties you starred in Step 3 · buying for <strong>{isInvest ? 'investment' : 'own stay'}</strong>
                </span>
              </div>
              <div className="fs-picks" role="radiogroup" aria-label="The property you are deciding on">
                {starred.map((viewing) => (
                  <button
                    key={viewing.id}
                    type="button"
                    role="radio"
                    aria-checked={viewing.id === pick.id}
                    className={viewing.id === pick.id ? 'on' : ''}
                    onClick={() => update({ pick: viewing.id })}
                  >
                    <strong>{viewing.name}</strong>
                    <span>
                      {viewing.channel} · {rm(viewing.price)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="fs-pick-facts">
                <div className="fs-fact">
                  <span>Instalment</span>
                  <strong>{rm(pick.instalment)}/mo</strong>
                </div>
                <div className="fs-fact">
                  <span>Cash to get the keys</span>
                  <strong>{rm(pick.upfront)}</strong>
                </div>
                <label className="fs-field" htmlFor="fs-median">
                  <span className="fs-hint">Median price nearby</span>
                  <MoneyInput
                    id="fs-median"
                    value={pick.median ?? ''}
                    onChange={(value) => setViewing(pick.id, { median: value === '' || value === 0 ? null : value })}
                    step={1000}
                    placeholder="From transacted prices"
                    small
                  />
                </label>
                <label className="fs-field" htmlFor="fs-maint">
                  <span className="fs-hint">Maintenance and sinking fund</span>
                  <MoneyInput
                    id="fs-maint"
                    value={pick.maint || ''}
                    onChange={(value) => setViewing(pick.id, { maint: value === '' ? 0 : value })}
                    step={10}
                    placeholder="0"
                    suffix="/mo"
                    small
                  />
                </label>
              </div>
            </div>

            {/* 2. Sean's two checks */}
            <div className="fs-block">
              <div className="fs-block-head">
                <h3>2. Sean&apos;s two checks</h3>
                <span className={decision.passed === 2 ? 'good' : decision.unknownPrice ? '' : 'warn'}>
                  {decision.passed === 2
                    ? 'Passes both checks'
                    : decision.unknownPrice
                      ? 'Add the median price to finish the checks'
                      : decision.passed === 1
                        ? 'Passes 1 of 2: look again before you decide'
                        : 'Fails both checks'}
                </span>
              </div>
              <div className="fs-two">
                {decision.checks.map((check) => (
                  <article key={check.title} className={`fs-two-card ${check.state}`}>
                    <div className="fs-two-top">
                      <span>{check.title}</span>
                      <span className="fs-two-mark" aria-hidden="true">
                        {check.state === 'ok' ? '✓' : check.state === 'warn' ? '!' : '?'}
                      </span>
                    </div>
                    <strong className="fs-two-big">{check.headline}</strong>
                    <span>{check.compare}</span>
                    <span className="fs-two-why">{check.why}</span>
                  </article>
                ))}
              </div>

              <div className="fs-plans">
                <div className="fs-plans-head">
                  <span>
                    <strong>Plan B and C:</strong> other ways the rent could cover it, in case Plan A falls through.
                  </span>
                  <button type="button" aria-expanded={plansOpen} onClick={() => setPlansOpen(!plansOpen)}>
                    {plansOpen ? 'Hide' : 'Add Plan B and C'}
                  </button>
                </div>
                {plansOpen && (
                  <>
                    {(
                      [
                        { key: 'room', label: 'Plan B', what: 'Rent out by room', note: 'all rooms together' },
                        { key: 'stay', label: 'Plan C', what: 'Short-term stay', note: 'last resort: it can be banned' },
                      ] as const
                    ).map((plan) => {
                      const rent = pick[plan.key];
                      const covers = rent > 0 && rent >= decision.rentNeeded;
                      return (
                        <div key={plan.key} className="fs-plan-row">
                          <span className="fs-plan-label">{plan.label}</span>
                          <span>
                            {plan.what} <span className="fs-plan-note">({plan.note})</span>
                          </span>
                          <MoneyInput
                            id={`fs-plan-${plan.key}`}
                            value={rent || ''}
                            onChange={(value) => setViewing(pick.id, { [plan.key]: value === '' ? 0 : value })}
                            step={50}
                            placeholder="0"
                            suffix="/mo"
                            small
                          />
                          <span className={`fs-plan-mark ${rent > 0 ? (covers ? 'good' : 'warn') : ''}`}>
                            {rent > 0 ? (covers ? 'Covers it' : 'Falls short') : '–'}
                          </span>
                        </div>
                      );
                    })}
                    <span className={`fs-plans-verdict ${decision.planTone}`}>{decision.planVerdict}</span>
                  </>
                )}
              </div>
            </div>

            {/* 3. The worst case */}
            <div className="fs-block">
              <div className="fs-block-head">
                <h3>3. Prepare for the worst</h3>
                <span>Hope for the best, but be prepared for the worst</span>
              </div>
              <ol className="fs-ladder">
                {decision.ladder.map((level, index) => (
                  <li key={level.title} className={level.state}>
                    <span className="fs-ladder-n">L{index + 1}</span>
                    <span className="fs-ladder-text">
                      <strong>{level.title}</strong>
                      <span>{level.cover}</span>
                    </span>
                    <span className="fs-ladder-status">
                      {level.status}
                      {level.state !== 'info' && (
                        <span aria-hidden="true">{level.state === 'ok' ? ' ✓' : ' !'}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="fs-worst-inputs">
                <label className="fs-field" htmlFor="fs-savings">
                  <span className="fs-hint">Savings you can use</span>
                  <MoneyInput
                    id="fs-savings"
                    value={state.savings}
                    onChange={(value) => update({ savings: value === '' ? 0 : value })}
                    step={1000}
                    small
                  />
                </label>
                <label className="fs-field" htmlFor="fs-empty">
                  <span className="fs-hint">{isInvest ? 'Months without a tenant' : 'Months without income'}</span>
                  <span className="fs-input small">
                    <input
                      id="fs-empty"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={24}
                      value={state.emptyMonths}
                      onChange={(event) =>
                        update({ emptyMonths: Math.min(24, Math.max(0, Math.round(Number(event.target.value) || 0))) })
                      }
                    />
                  </span>
                </label>
                {isInvest && (
                  <label className="fs-field" htmlFor="fs-drop">
                    <span className="fs-hint">Rent falls by (%)</span>
                    <span className="fs-input small">
                      <input
                        id="fs-drop"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={50}
                        value={state.rentDrop}
                        onChange={(event) =>
                          update({ rentDrop: Math.min(50, Math.max(0, Math.round(Number(event.target.value) || 0))) })
                        }
                      />
                    </span>
                  </label>
                )}
              </div>
              <p className="fs-best">
                <strong>Best case, in one line:</strong> at {PRICE_GROWTH}% a year it would be worth about{' '}
                {rm(decision.value5)} in 5 years. Sean says prices grew 3–4% a year on average even in the weakest
                years.
              </p>
            </div>

            {/* 4. Can you take the risk */}
            <div className="fs-block">
              <div className="fs-block-head">
                <h3>4. Can you take the risk?</h3>
                <span>
                  {readyCount} of {READINESS.length} · Sean checks these before any purchase
                </span>
              </div>
              <div className={`fs-carry ${decision.carries ? 'ok' : 'warn'}`}>
                <strong>
                  <span className="fs-carry-dot" aria-hidden="true">
                    {decision.carries ? '✓' : '!'}
                  </span>
                  {decision.carries ? 'You can carry the worst case on your own' : "You can't carry the worst case yet"}
                </strong>
                <span>
                  {rm(state.savings)} savings − {rm(pick.upfront)} to get the keys
                  {isInvest ? ` − ${rm(FURNISHING)} to furnish it` : ''} = {rm(decision.left)} left.{' '}
                  {state.emptyMonths} months {isInvest ? 'without a tenant' : 'without income'} need{' '}
                  {rm(decision.carryNeed)}, from you, not your partner or family.
                </span>
              </div>
              <div className="fs-checks">
                {READINESS.map((item) => {
                  const on = state.readiness[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={on}
                      className={on ? 'on' : ''}
                      onClick={() => update({ readiness: { ...state.readiness, [item.id]: !on } })}
                    >
                      <span className="fs-box" aria-hidden="true">
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="fs-block-head sub">
                <h4>Your decision, or a sales pitch?</h4>
                <span>
                  {pitchCount} of {PITCH.length}
                </span>
              </div>
              <div className="fs-checks">
                {PITCH.map((item) => {
                  const on = state.pitch[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={on}
                      className={on ? 'on' : ''}
                      onClick={() => update({ pitch: { ...state.pitch, [item.id]: !on } })}
                    >
                      <span className="fs-box" aria-hidden="true">
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Own standard */}
            <div className="fs-block">
              <div className="fs-block-head">
                <h3>5. Decide by your own standard</h3>
                <span>Saved only in this browser</span>
              </div>
              <ul className="fs-questions">
                <li>At this price, what else could I get?</li>
                <li>Why must it be this location?</li>
                <li>If my career is uncertain, could I keep renting instead?</li>
              </ul>
              <div className="fs-why">
                <label className="fs-field" htmlFor="fs-why">
                  <span className="fs-label">Why this one</span>
                  <textarea
                    id="fs-why"
                    className="fs-textarea"
                    maxLength={1000}
                    placeholder="e.g. In line with the median price, rent covers it two ways, 5 minutes to the MRT."
                    value={pick.why}
                    onChange={(event) => setViewing(pick.id, { why: event.target.value })}
                  />
                </label>
                <label className="fs-field" htmlFor="fs-wrong">
                  <span className="fs-label">What would prove me wrong</span>
                  <textarea
                    id="fs-wrong"
                    className="fs-textarea"
                    maxLength={1000}
                    placeholder="e.g. Still empty after 3 months, or rents nearby falling below the instalment."
                    value={pick.wrong}
                    onChange={(event) => setViewing(pick.id, { wrong: event.target.value })}
                  />
                </label>
              </div>
              <p className="fs-best">
                If you are right, it shows. If you are wrong, you take the loss and learn from it. Either way it was your
                call, made on your homework.
              </p>
            </div>
          </>
        ) : (
          <p className="fs-empty">
            {viewings.length
              ? 'Star the properties you like in Step 3, then pick the one here.'
              : 'Add the properties you view in Step 3 and star the ones you like. Then pick the one here.'}
          </p>
        )}

        <div className="fs-next">
          <h3>Decided? Arrange the financing</h3>
          <ol>
            <li>
              Run its exact upfront costs and instalment in the <Link href="/calculator">calculator</Link>.
            </li>
            <li>Check your CCRIS report, then ask two or three banks for the loan and compare their rates.</li>
            <li>Arrange the down payment, including any family help, before you sign the booking form.</li>
          </ol>
        </div>
      </section>

      <div className="fs-foot">
        <p>
          From Sean&apos;s videos, mainly Sean&apos;s 4 Basics (2020), 4 Things To Do Before Owning A Property (2017),
          How To Calculate Your Loan Eligibility (2022) and Asking Sean #035: Make Informed Decisions, and from his
          Instagram posts on median prices, rental plans and the worst case. Banks set their own DSR limits and margins, so treat these as a first check, not an
          approval. Everything you enter stays in this browser.
        </p>
        <button type="button" className="fs-clear" onClick={clearFourSteps}>
          Clear my answers
        </button>
      </div>
    </div>
  );
}
