'use client';

/** Form controls shared by the purchase cost and rental cash flow calculators. */

export function CalcNumberField({
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

export function CalcToggle({
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
