import { useEffect, useState } from 'react';

/** Shared toast exit: shorter than its 320ms entrance, so a dismissed toast gets out of the way quickly. */
export const toastExitMs = 150;

/** Keep the last non-empty value on screen for `exitMs` after it clears, flagged as leaving,
 *  so conditionally rendered UI (toasts) can play an exit instead of vanishing. */
export function useLeavingValue<T>(value: T, exitMs = toastExitMs) {
  const [shown, setShown] = useState(value);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (value) { setShown(value); setLeaving(false); return; }
    if (!shown) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    setLeaving(true);
    const timer = window.setTimeout(() => { setShown(value); setLeaving(false); }, exitMs);
    return () => window.clearTimeout(timer);
  }, [value]);
  return { shown, leaving };
}
