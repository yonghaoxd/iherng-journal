'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

/** Kept in step with the inline script in app/layout.tsx, which sets the theme before paint. */
export const THEME_KEY = 'theme';
const THEME_COLORS: Record<Theme, string> = {
  dark: '#0E100F',
  light: '#F6F3EC',
};

function current(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme]);
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  // Until the reader picks one, follow the system setting as it changes.
  const system = window.matchMedia('(prefers-color-scheme: light)');
  const followSystem = () => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      // Storage can be blocked; the system setting still applies.
    }
    if (saved !== 'light' && saved !== 'dark')
      apply(system.matches ? 'light' : 'dark');
  };
  system.addEventListener('change', followSystem);
  return () => {
    observer.disconnect();
    system.removeEventListener('change', followSystem);
  };
}

/** Switches between the dark and light themes and remembers the choice. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => 'dark' as Theme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label =
    next === 'light' ? 'Switch to light mode' : 'Switch to dark mode';

  const toggle = () => {
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private windows can refuse storage; the switch still works for this visit.
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}
