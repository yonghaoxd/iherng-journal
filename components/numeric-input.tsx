'use client';

import { useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | '';
  onChange: (next: number | '') => void;
  /** Allow one decimal point (interest rates); otherwise whole numbers only. */
  decimal?: boolean;
};

/**
 * A number box that never shows "012" or "06000". A type="number" input keeps the
 * leading zeros the reader typed, because React sees 012 and 12 as the same value
 * and leaves the field alone. This keeps its own text while the reader types,
 * strips leading zeros and anything that is not a digit, and shows the stored value
 * again once the field loses focus (so a parent can clamp it on blur).
 */
export function NumericInput({ value, onChange, decimal = false, onBlur, ...rest }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const stored = value === '' || !Number.isFinite(value) ? '' : String(value);

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={draft ?? stored}
      onChange={(event) => {
        let raw = event.target.value.replace(decimal ? /[^\d.]/g : /\D/g, '');
        if (decimal) {
          const dot = raw.indexOf('.');
          if (dot >= 0) raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, '');
          if (raw.startsWith('.')) raw = `0${raw}`;
        }
        raw = raw.replace(/^0+(?=\d)/, '').slice(0, 12);
        setDraft(raw);
        onChange(raw === '' ? '' : Number(raw));
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
