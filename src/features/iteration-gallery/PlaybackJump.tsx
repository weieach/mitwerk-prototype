import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { SelectMenu } from '../../components/SelectMenu';
import { jumpMenuDelayMs, type JumpScale } from './timeline';

export function PlaybackJump({ direction, scale, unavailable, onJump, onChoose }: {
  direction: -1 | 1; scale: JumpScale; unavailable: boolean; onJump: () => void; onChoose: (scale: JumpScale) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const word = direction === -1 ? 'prev' : 'next';
  function clearTimer() { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  function dismiss(restoreFocus: boolean) { clearTimer(); setOpen(false); if (restoreFocus) trigger.current?.focus(); }
  useEffect(() => () => clearTimer(), []);
  return <span className="playback-jump" onPointerEnter={event => {
    clearTimer();
    if (event.pointerType !== 'touch' && !open) timer.current = setTimeout(() => { setKeyboard(false); setOpen(true); }, jumpMenuDelayMs);
  }} onPointerLeave={() => {
    clearTimer();
    if (open) timer.current = setTimeout(() => setOpen(false), 120);
  }}>
    <button ref={trigger} type="button" className="icon-button" aria-label={`Jump to ${word} ${scale}`}
      aria-disabled={unavailable} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { dismiss(false); if (!unavailable) onJump(); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); clearTimer(); setKeyboard(true); setOpen(true); }
        if (event.key === 'Escape') dismiss(true);
      }}>
      <Icon name={direction === -1 ? 'previous' : 'next'}/>
    </button>
    {open && <SelectMenu id={id} label={`Jump ${word} by`} anchor={trigger} minWidth={190} value={scale} focusOnOpen={keyboard}
      options={[{ value:'frame', label:`Jump to ${word} frame` }, { value:'version', label:`Jump to ${word} version` }]}
      onChoose={value => { onChoose(value as JumpScale); dismiss(true); }} onDismiss={dismiss}/>}
  </span>;
}
