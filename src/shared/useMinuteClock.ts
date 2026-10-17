import { useEffect, useState } from 'react';

/** Refresh local relative timestamps while visible and when returning to the page. */
export function useMinuteClock(enabled = true) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setClock(new Date());
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [enabled]);
  return clock;
}
