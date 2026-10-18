import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { captureBucketStore } from '../../shared/capture-buckets';
import { useCaptureBuckets } from '../../shared/useCaptureBuckets';

const exitDuration = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
const menuGap = 4;

/**
 * Bucket (page) chip. The chip itself never changes while choosing: the other buckets drop below it as a stack of paler capsules,
 * and the last, palest capsule is a field for typing a new bucket. Arrow keys move through the stack; Enter picks or creates.
 */
export function CaptureBucketChip({ value, onChange, label = 'Capture screen', icon = 'folder', emptyLabel, compact = false }: {
  value: string; onChange: (value: string) => void; label?: string; icon?: string | null; emptyLabel?: string; compact?: boolean;
}) {
  const buckets = useCaptureBuckets();
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [cursor, setCursor] = useState(-1);
  const [place, setPlace] = useState<CSSProperties>({});
  const name = draft.trim();
  const exists = buckets.some(bucket => bucket.value.toLowerCase() === name.toLowerCase());
  const options = [...(name && !exists ? [{ value: name, label: `Create location "${name}"` }] : []), ...buckets];

  // Closing plays the capsules' staggered exit, then unmounts the stack.
  const dismiss = useCallback((restoreFocus: boolean) => {
    clearTimeout(exitTimer.current);
    setClosing(true);
    const stagger = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 20;
    exitTimer.current = setTimeout(() => { setOpen(false); setClosing(false); }, exitDuration() + stagger * 4);
    if (restoreFocus) requestAnimationFrame(() => anchor.current?.querySelector('button')?.focus());
  }, []);
  useEffect(() => () => clearTimeout(exitTimer.current), []);
  const choose = (text: string) => {
    const next = text.trim() ? captureBucketStore.add(text) : '';
    if (next !== null && next !== value && (next || emptyLabel)) onChange(next);
    dismiss(true);
  };
  function show() { clearTimeout(exitTimer.current); setClosing(false); setDraft(''); setCursor(-1); setOpen(true); }

  useLayoutEffect(() => {
    if (!open) return;
    const element = menu.current!;
    if (!element.matches(':popover-open')) element.showPopover();
    const position = () => { const rect = anchor.current!.getBoundingClientRect(); const below = innerHeight - rect.bottom - 8; const above = rect.top - 8; const flip = below < Math.min(360, element.scrollHeight) && above > below; setPlace({ left: Math.max(8, Math.min(rect.left, innerWidth - element.offsetWidth - 8)), '--location-trigger-width': `${rect.width}px`, maxHeight: Math.min(360, (flip ? above : below) - menuGap), ...(flip ? { bottom: innerHeight - rect.top + menuGap } : { top: rect.bottom + menuGap }) } as CSSProperties & { '--location-trigger-width': string }); };
    position();
    field.current?.focus();
    addEventListener('resize', position); addEventListener('scroll', position, true);
    return () => { removeEventListener('resize', position); removeEventListener('scroll', position, true); };
  }, [open, options.length]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { const target = event.target as Node; if (!menu.current?.contains(target) && !anchor.current?.contains(target)) dismiss(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, dismiss]);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(true); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      // -1 is the add-new capsule at the bottom of the stack.
      const last = options.length - 1;
      setCursor(index => event.key === 'ArrowDown' ? (index === last ? -1 : index + 1) : (index === -1 ? last : index - 1));
    }
    else if (event.key === 'Enter') { event.preventDefault(); if (cursor >= 0) choose(options[cursor].value); else if (draft.trim()) choose(draft); }
    else if (event.key === 'Tab') dismiss(false);
  }

  return <span ref={anchor} className={`capture-bucket-control${open ? ' is-open' : ''}${compact ? ' is-compact' : ''}`}>
    <button type="button" className={`capture-setting-chip${value ? '' : ' is-empty'}`} aria-label={label} aria-haspopup="listbox" aria-expanded={open && !closing} aria-controls={open ? id : undefined}
      onClick={() => open && !closing ? dismiss(false) : show()} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); show(); } }}>
      {value ? <>{icon && <PhosphorIcon name={icon} size={10}/>}<span>{value}</span><PhosphorIcon className="capture-chip-edit" name="pencil-simple" weight="fill" size={10}/></> : <><PhosphorIcon name="plus" size={10}/><span>{emptyLabel}</span></>}
    </button>
    {open && <div ref={menu} id={id} popover="manual" className={`capture-bucket-stack${closing ? ' is-closing' : ''}`} inert={closing} style={{ ...place, '--n': options.length + 1 } as CSSProperties} onKeyDown={onKeyDown}>
      <div id={`${id}-options`} role="listbox" aria-label={label} className="capture-bucket-options">
        {options.map((option, index) => <div key={option.value || 'none'} id={`${id}-${index}`} role="option" aria-selected={option.value === value} className={`capture-bucket-option${cursor === index ? ' is-highlighted' : ''}${option.value ? '' : ' is-clear'}`} style={{ '--i': index } as CSSProperties}
          onPointerMove={() => setCursor(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(option.value)}>{option.label}</div>)}
      </div>
      <input ref={field} style={{ '--i': options.length } as CSSProperties} className={`capture-bucket-new${cursor === -1 ? ' is-highlighted' : ''}`} role="combobox" aria-expanded={true} aria-controls={`${id}-options`} aria-label="Location name" placeholder="Location name" value={draft}
        aria-activedescendant={cursor >= 0 ? `${id}-${cursor}` : undefined} onFocus={() => setCursor(-1)} onChange={event => { setDraft(event.target.value); setCursor(-1); }}/>
    </div>}
  </span>;
}
