'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hands a question and the reader's numbers from the calculators to AIherng on the
 * home page. The situation is personal, so it travels in sessionStorage rather than
 * the URL: it never reaches a server log, a shared link or the browser history.
 */
export interface AskHandoff {
  question: string;
  situation: string;
}

const KEY = 'aiherng-handoff';

let cached: AskHandoff | null | undefined;
const listeners = new Set<() => void>();

function read(): AskHandoff | null {
  if (cached !== undefined) return cached;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as AskHandoff) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function writeAskHandoff(handoff: AskHandoff): void {
  cached = handoff;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(handoff));
  } catch {
    // Storage can be unavailable (private mode); the in-memory copy still carries it.
  }
  listeners.forEach((listener) => listener());
}

/** Once the reader has asked, the numbers are not filled in again on a later visit. */
export function clearAskHandoff(): void {
  if (!read()) return;
  cached = null;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored to remove.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAskHandoff(): AskHandoff | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
