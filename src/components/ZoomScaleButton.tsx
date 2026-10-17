import { useEffect, useRef } from 'react';
import { controlTokens } from '../control-tokens';

/** Separate a zoom reset from a double-click camera reset, including a keyboard equivalent. */
export function ZoomScaleButton({ zoom, onResetZoom, onResetView, label = 'Reset gallery zoom' }: { label?: string; zoom: number; onResetZoom: () => void; onResetView: () => void }) {
  const pending = useRef<number | null>(null);
  const cancel = () => { if (pending.current !== null) window.clearTimeout(pending.current); pending.current = null; };
  useEffect(() => cancel, []);
  return <button type="button" className="icon-button zoom-scale-button" aria-label={label}
    title="Click to reset zoom · Double-click or Shift+Enter to reset view"
    onClick={event => {
      cancel();
      if (event.detail === 0) onResetZoom();
      else if (event.detail === 1) pending.current = window.setTimeout(() => { pending.current = null; onResetZoom(); }, controlTokens.doubleClickMs);
    }}
    onDoubleClick={() => { cancel(); onResetView(); }}
    onKeyDown={event => { if (event.key === 'Enter' && event.shiftKey) { event.preventDefault(); cancel(); onResetView(); } }}>
    {Math.round(zoom * 100)}%
  </button>;
}
