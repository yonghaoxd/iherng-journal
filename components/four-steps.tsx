'use client';

import { useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Info, Plus, Star, X } from 'lucide-react';
import { formatMYR } from '@/lib/calculator';
import {
  CHANNELS,
  FURNISHING,
  VIEWING_GOAL,
  costsFor,
  loanEligibility,
  rentTest,
  type Channel,
  type Intent,
} from '@/lib/four-steps';
import { clearFourSteps, useFourSteps, type Readiness, type Viewing } from '@/lib/four-steps-store';

const rm = (value: number) => formatMYR(Math.round(value)).replace(/^RM\s?/, 'RM ');
const rmk = (value: number) => rm(Math.round(value / 1000) * 1000);

const INTENTS: { id: Intent; title: string; desc: string }[] = [
  { id: 'own', title: 'Own stay', desc: 'A home to live in for years, which you could rent out if life changes.' },
  { id: 'invest', title: 'Investment', desc: 'Rent it out from day one.' },
];

const READINESS: { id: keyof Readiness; label: string }[] = [
  { id: 'fund', label: 'About six months of expenses saved as an emergency fund' },
  { id: 'insurance', label: 'Medical insurance in place' },
  { id: 'career', label: 'A stable job or clear career path' },
];

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
        },
      ],
    }));
    setDraft({ ...EMPTY_DRAFT, channel: draft.channel });
  };

  // Step 4: the shortlist, each against Sean's checks.
  const shortlist = viewings
    .filter((viewing) => viewing.star)
    .map((viewing) => {
      const furnish = isInvest ? FURNISHING : 0;
      const leftAfter = state.savings - viewing.upfront - furnish;
      const buffer = 6 * viewing.instalment;
      const tests: { ok: boolean | null; label: string; detail: string }[] = [
        {
          ok: viewing.within,
          label: viewing.within ? 'Within your range' : 'Over your range',
          detail: `up to ${rmk(budget)}`,
        },
        {
          ok: viewing.pass,
          label: isInvest
            ? viewing.pass
              ? 'Rent covers the instalment'
              : 'Rent falls short'
            : viewing.pass
              ? 'Passes the 85% rule'
              : 'Fails the 85% rule',
          detail: `${Math.round(viewing.ratio * 100)}% of the instalment`,
        },
      ];
      if (viewing.median) {
        const diff = (viewing.price - viewing.median) / viewing.median;
        tests.push({
          ok: diff <= 0.02,
          label:
            diff < -0.02
              ? `${Math.round(-diff * 100)}% below recent sales`
              : diff <= 0.02
                ? 'In line with recent sales'
                : `${Math.round(diff * 100)}% above recent sales`,
          detail: `nearby units sold for about ${rm(viewing.median)}`,
        });
      } else {
        tests.push({
          ok: null,
          label: 'Compare with recent sales',
          detail: 'add a transacted price above, not the asking price',
        });
      }
      tests.push({
        ok: viewing.upfront <= state.savings,
        label: viewing.upfront <= state.savings ? 'You can pay to get the keys' : 'Short of cash for the keys',
        detail: `${rm(viewing.upfront)} of your ${rm(state.savings)}`,
      });
      const carries = leftAfter >= buffer;
      tests.push({
        ok: carries,
        label: isInvest
          ? carries
            ? 'Can carry six empty months'
            : "Can't carry six empty months"
          : carries
            ? 'Six months of instalments in hand'
            : 'Less than six months in hand',
        detail: `${rm(Math.max(0, leftAfter))} left${furnish ? ' after furnishing' : ''}, ${rm(buffer)} needed`,
      });
      return { ...viewing, tests, score: tests.filter((test) => test.ok === true).length };
    });
  const bestId =
    shortlist.length > 1
      ? [...shortlist].sort((a, b) => b.score - a.score || a.price - b.price)[0].id
      : null;

  const readyCount = READINESS.filter((item) => state.readiness[item.id]).length;
  const left = Math.max(0, VIEWING_GOAL - viewedCount);

  const intentTitle = INTENTS.find((item) => item.id === state.intent)?.title ?? '';
  const steps = [
    { n: 1, title: 'Know why', status: intentTitle, done: true },
    { n: 2, title: 'Loan eligibility', status: `Eligible for ${rmk(elig.loan)}`, done: elig.loan > 0 },
    { n: 3, title: `View ${VIEWING_GOAL}`, status: `${viewedCount} of ${VIEWING_GOAL} viewed`, done: viewedCount >= VIEWING_GOAL },
    {
      n: 4,
      title: 'Decide',
      status: `${shortlist.length} shortlisted · ${readyCount}/3 risk checks`,
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
          <div>
            <span className="fs-eyebrow">Step 4</span>
            <h2 id="fs-s4">Make informed decisions and take calculated risks.</h2>
          </div>
        </div>

        <p className={`fs-gate ${left > 0 ? '' : 'ready'}`}>
          {left > 0
            ? `You have viewed ${viewedCount} of ${VIEWING_GOAL}. Sean would keep looking before committing: ${left} more to go. Your shortlist below updates as you add viewings.`
            : `You have viewed ${VIEWING_GOAL} properties. Compare your shortlist on the checks below, then arrange the financing for your pick.`}
        </p>

        <div className="fs-savings">
          <label className="fs-field" htmlFor="fs-savings">
            <span className="fs-label">Savings you can use</span>
            <MoneyInput
              id="fs-savings"
              value={state.savings}
              onChange={(value) => update({ savings: value === '' ? 0 : value })}
              step={1000}
            />
          </label>
          <p>
            Sean&apos;s cash test: after paying the down payment, legal fees and stamp duty, you should still hold six
            months of instalments{isInvest ? ', plus about RM50,000 to furnish it for rent' : ''}. Keep your emergency
            fund out of this number.
          </p>
        </div>

        {shortlist.length > 0 ? (
          <div className="fs-shortlist">
            {shortlist.map((viewing) => (
              <article key={viewing.id} className={`fs-pick ${viewing.id === bestId ? 'best' : ''}`}>
                <div className="fs-pick-head">
                  {viewing.id === bestId && <span className="fs-badge">Passes the most checks</span>}
                  <h3>{viewing.name}</h3>
                  <span>{viewing.channel}</span>
                </div>
                <dl className="fs-pick-stats">
                  <div>
                    <dt>Price</dt>
                    <dd>{rm(viewing.price)}</dd>
                  </div>
                  <div>
                    <dt>Instalment</dt>
                    <dd>{rm(viewing.instalment)}/mo</dd>
                  </div>
                  <div className="wide">
                    <dt>Cash to get the keys</dt>
                    <dd>{rm(viewing.upfront)}</dd>
                  </div>
                </dl>
                <label className="fs-field" htmlFor={`fs-median-${viewing.id}`}>
                  <span className="fs-hint">Recent transacted price nearby</span>
                  <MoneyInput
                    id={`fs-median-${viewing.id}`}
                    value={viewing.median ?? ''}
                    onChange={(value) => setViewing(viewing.id, { median: value === '' || value === 0 ? null : value })}
                    step={1000}
                    placeholder="From Brickz or sold listings"
                    small
                  />
                </label>
                <ul className="fs-tests">
                  {viewing.tests.map((test) => (
                    <li key={test.label}>
                      <span
                        className={`fs-test-dot ${test.ok === null ? 'unknown' : test.ok ? 'ok' : 'warn'}`}
                        aria-hidden="true"
                      >
                        {test.ok === null ? '?' : test.ok ? '✓' : '!'}
                      </span>
                      <span>
                        <strong>{test.label}</strong> <span>{test.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="fs-empty">Star the properties you like in Step 3 to compare them here.</p>
        )}

        <div className="fs-risk">
          <div className="fs-risk-head">
            <h3>Can you take the risk?</h3>
            <span>{readyCount} of 3 · Sean checks these before any purchase</span>
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
        </div>

        <div className="fs-next">
          <h3>Once you have picked one</h3>
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
          From Sean&apos;s videos, mainly 4 Things To Do Before Owning A Property (2017) and How To Calculate Your Loan
          Eligibility (2022). Banks set their own DSR limits and margins, so treat these as a first check, not an
          approval. Everything you enter stays in this browser.
        </p>
        <button type="button" className="fs-clear" onClick={clearFourSteps}>
          Clear my answers
        </button>
      </div>
    </div>
  );
}
