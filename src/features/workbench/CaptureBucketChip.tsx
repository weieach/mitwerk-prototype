import { useCallback, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { SelectMenu } from '../../components/SelectMenu';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { captureBucketStore } from '../../shared/capture-buckets';
import { useCaptureBuckets } from '../../shared/useCaptureBuckets';

/** Editable capture pill. The field keeps the pill's exact size; with `buckets`, a menu of saved buckets unrolls beneath it. */
export function CaptureBucketChip({ value, onChange, label = 'Capture screen', buckets: withBuckets = true, icon = 'folder', emptyLabel, compact = false }: { value: string; onChange: (value: string) => void; label?: string; buckets?: boolean; icon?: string | null; emptyLabel?: string; compact?: boolean }) {
  const buckets = useCaptureBuckets();
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const [pill, setPill] = useState({ width: 0, height: 0 });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const name = query.trim();
  const exists = buckets.some(bucket => bucket.value.toLowerCase() === name.toLowerCase());
  const options = withBuckets ? [...(name && !exists ? [{ value: name, label: `Create bucket "${name}"` }] : []), ...buckets, ...(emptyLabel && value ? [{ value: '', label: 'No page' }] : [])] : [];
  const dismiss = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => anchor.current?.querySelector('button')?.focus());
  }, []);
  const choose = (text: string) => {
    const next = !text.trim() ? '' : withBuckets ? captureBucketStore.add(text) : text.trim();
    if (next !== null && next !== value && (next || emptyLabel)) onChange(next);
    dismiss(true);
  };
  function edit() { const rect = anchor.current?.getBoundingClientRect(); setPill({ width: rect?.width ?? 0, height: rect?.height ?? 0 }); setQuery(''); setCursor(0); setOpen(true); }
  return <span ref={anchor} className={`capture-bucket-control${open ? ' is-open' : ''}${open && withBuckets ? ' has-menu' : ''}${compact ? ' is-compact' : ''}`} style={open ? { '--capture-edit-width': `${pill.width}px` } as CSSProperties : undefined}>
    {open ? <input autoFocus className="capture-setting-input" role={withBuckets ? 'combobox' : undefined} aria-label={`${label} name`} aria-expanded={withBuckets ? true : undefined} aria-controls={withBuckets ? id : undefined} aria-autocomplete={withBuckets ? 'list' : undefined} aria-activedescendant={withBuckets ? `${id}-${cursor}` : undefined} value={query} placeholder={value || emptyLabel} onChange={event => { setQuery(event.target.value); setCursor(0); }}
      onBlur={() => { if (!withBuckets) choose(name || value); }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(true); }
      else if (event.key === 'Enter') { event.preventDefault(); choose(name || options[cursor]?.value || value); }
      else if (withBuckets && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { event.preventDefault(); setCursor(index => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))); }
      else if (event.key === 'Tab') dismiss(false);
    }}/> : <button type="button" className={`capture-setting-chip${value ? '' : ' is-empty'}`} aria-label={`Edit ${label.toLowerCase()}`} aria-haspopup={withBuckets ? 'listbox' : undefined} aria-expanded={withBuckets ? false : undefined} onClick={edit} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); edit(); } }}>{value ? <>{icon && <PhosphorIcon name={icon} size={10}/>}<span>{value}</span><PhosphorIcon name="pencil-simple" weight="fill" size={10}/></> : <><PhosphorIcon name="plus" size={10}/><span>{emptyLabel}</span></>}</button>}
    {open && withBuckets && <SelectMenu id={id} label={label} anchor={anchor} options={options} value={value} className="capture-bucket-menu" minWidth={pill.width} focusOnOpen={false} activeIndex={cursor} onActiveIndexChange={setCursor} onChoose={choose} onDismiss={dismiss}/>}
  </span>;
}
