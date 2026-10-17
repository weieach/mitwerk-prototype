import { useEffect, useRef, useState } from 'react';

type Mode = 'Gallery' | 'Playback';

/** One Figma-style label; the old word leaves before the new word enters. */
export function PanelViewSwitch({ mode, disabled, onChange }: { mode: Mode; disabled: boolean; onChange?: (mode: Mode) => void }) {
  const [label, setLabel] = useState(mode);
  const [leaving, setLeaving] = useState(false);
  const labelRef = useRef(mode);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  function transition(next: Mode) {
    if (labelRef.current === next) return;
    labelRef.current = next;
    clearTimeout(timer.current);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setLabel(next); setLeaving(false); pending.current=false; return; }
    pending.current=true;
    setLeaving(true);
    const duration = parseFloat(getComputedStyle(button.current!).getPropertyValue('--panel-label-half-ms')) || 100;
    timer.current = setTimeout(() => { setLabel(next); setLeaving(false); pending.current=false; }, duration);
  }
  useEffect(() => { transition(mode); }, [mode]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <button ref={button} type="button" className="panel-view-label" disabled={disabled}
    aria-label={`${label} view. Switch to ${label === 'Gallery' ? 'Playback' : 'Gallery'}`}
    title={`Switch to ${label === 'Gallery' ? 'Playback' : 'Gallery'}`}
    onClick={() => { if (pending.current) return; const next = mode === 'Gallery' ? 'Playback' : 'Gallery'; transition(next); onChange?.(next); }}>
    <span key={label} className={leaving ? 'panel-view-word is-leaving' : 'panel-view-word'}>{label}</span>
  </button>;
}
