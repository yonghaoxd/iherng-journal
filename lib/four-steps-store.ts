'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { CHANNELS, type Channel, type Intent } from '@/lib/four-steps';

/**
 * What the reader fills in on the 4 Steps page. It is personal (income, savings,
 * the homes they viewed), so it lives only in this browser's localStorage and is
 * never sent anywhere.
 */
export interface Viewing {
  id: number;
  name: string;
  channel: Channel;
  price: number;
  rent: number;
  star: boolean;
  /** A recent transacted price nearby, filled in on the shortlist. */
  median: number | null;
}

export interface Readiness {
  fund: boolean;
  insurance: boolean;
  career: boolean;
}

export interface FourStepsState {
  intent: Intent;
  income: number;
  debts: number;
  age: number;
  housingLoans: number;
  savings: number;
  readiness: Readiness;
  viewings: Viewing[];
}

export const DEFAULT_STATE: FourStepsState = {
  intent: 'own',
  income: 6_000,
  debts: 500,
  age: 28,
  housingLoans: 0,
  savings: 80_000,
  readiness: { fund: false, insurance: false, career: false },
  viewings: [],
};

const KEY = 'iherng-four-steps-v1';

let cached: FourStepsState | undefined;
const listeners = new Set<() => void>();

const num = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;

/** Stored data is only trusted field by field; anything odd falls back to the default. */
function sanitize(raw: unknown): FourStepsState {
  if (!raw || typeof raw !== 'object') return DEFAULT_STATE;
  const data = raw as Record<string, unknown>;
  const readiness = (data.readiness ?? {}) as Record<string, unknown>;
  const viewings = Array.isArray(data.viewings) ? data.viewings : [];
  return {
    intent: data.intent === 'invest' ? 'invest' : 'own',
    income: num(data.income, DEFAULT_STATE.income),
    debts: num(data.debts, DEFAULT_STATE.debts),
    age: num(data.age, DEFAULT_STATE.age),
    housingLoans: Math.min(2, Math.round(num(data.housingLoans, 0))),
    savings: num(data.savings, DEFAULT_STATE.savings),
    readiness: {
      fund: readiness.fund === true,
      insurance: readiness.insurance === true,
      career: readiness.career === true,
    },
    viewings: viewings
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item, index) => ({
        id: typeof item.id === 'number' ? item.id : index + 1,
        name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Property',
        channel: CHANNELS.includes(item.channel as Channel) ? (item.channel as Channel) : 'Subsale',
        price: num(item.price, 0),
        rent: num(item.rent, 0),
        star: item.star === true,
        median: typeof item.median === 'number' && item.median > 0 ? item.median : null,
      }))
      .slice(0, 200),
  };
}

function read(): FourStepsState {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(KEY);
    cached = raw ? sanitize(JSON.parse(raw)) : DEFAULT_STATE;
  } catch {
    cached = DEFAULT_STATE;
  }
  return cached;
}

function write(next: FourStepsState) {
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); the page still works for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function clearFourSteps() {
  cached = DEFAULT_STATE;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing stored to remove.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFourSteps(): [
  FourStepsState,
  (change: Partial<FourStepsState> | ((state: FourStepsState) => Partial<FourStepsState>)) => void,
] {
  const state = useSyncExternalStore(subscribe, read, () => DEFAULT_STATE);
  const update = useCallback(
    (change: Partial<FourStepsState> | ((state: FourStepsState) => Partial<FourStepsState>)) => {
      const current = read();
      const patch = typeof change === 'function' ? change(current) : change;
      write({ ...current, ...patch });
    },
    [],
  );
  return [state, update];
}
