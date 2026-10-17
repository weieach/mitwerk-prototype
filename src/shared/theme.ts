import { useEffect, useState } from 'react';

/** Interface theme. Tokens for both live in `src/index.css`, keyed by `data-theme` on the document root. */
export type Theme = 'light' | 'dark';

const storageKey = 'mitwerk-theme';

export function savedTheme(): Theme {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('screenshot') === '1' && (params.get('theme') === 'dark' || params.get('theme') === 'light')) return params.get('theme') as Theme;
  }
  try { return localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('screenshot') === '1') return;
  try { localStorage.setItem(storageKey, theme); } catch { /* Theme still applies for this session. */ }
}

/** Single theme state for the app; every surface reads it through root tokens. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(savedTheme);
  useEffect(() => applyTheme(theme), [theme]);
  return [theme, setTheme] as const;
}

/** Calls `listener` whenever the root theme changes, for canvases that paint resolved colors. */
export function observeTheme(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

/** Resolves a `var(--token)` reference to its current value; plain colors pass through. */
export function resolveColor(value: string) {
  const match = /^var\((--[\w-]+)\)$/.exec(value.trim());
  return match ? getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() : value;
}
