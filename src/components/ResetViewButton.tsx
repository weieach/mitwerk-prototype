import { useEffect, useRef } from 'react';
import { controlTokens } from '../control-tokens';
import { FullscreenIcon } from './PhosphorIcon';

/** Share reset/center semantics without firing reset before a double-click. */
export function ResetViewButton({ onReset, onCenter, label = 'Reset view', centerLabel = 'center' }: {
  onReset: () => void;
  onCenter: () => void;
  label?: string;
  centerLabel?: string;
}) {
  const pending = useRef<number | null>(null);
  function cancel() {
    if (pending.current !== null) window.clearTimeout(pending.current);
    pending.current = null;
  }
  useEffect(() => cancel, []);

  return <button className="icon-button reset-view-button" aria-label={label}
    title={`${label} · Double-click to ${centerLabel}`}
    onClick={event => {
      cancel();
      if (event.detail === 0) onReset();
      else if (event.detail === 1) pending.current = window.setTimeout(() => {
        pending.current = null;
        onReset();
      }, controlTokens.doubleClickMs);
    }} onDoubleClick={() => { cancel(); onCenter(); }}>
    <FullscreenIcon size={16}/>
  </button>;
}
