import { useCallback, useId, useRef, useState } from 'react';
import { SelectMenu } from '../../components/SelectMenu';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { captureBucketStore } from '../../shared/capture-buckets';
import { useCaptureBuckets } from '../../shared/useCaptureBuckets';

export function CaptureBucketChip({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const buckets = useCaptureBuckets();
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const [pillWidth, setPillWidth] = useState(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const name = query.trim();
  const exists = buckets.some(bucket => bucket.value.toLowerCase() === name.toLowerCase());
  const options = [...(name && !exists ? [{ value: name, label: `Create bucket "${name}"` }] : []), ...buckets];
  const dismiss = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => anchor.current?.querySelector('button')?.focus());
  }, []);
  const choose = (text: string) => { const bucket = captureBucketStore.add(text); if (bucket) onChange(bucket); dismiss(true); };
  function edit() { setPillWidth(anchor.current?.getBoundingClientRect().width ?? 0); setQuery(''); setCursor(0); setOpen(true); }
  return <span ref={anchor} className="capture-bucket-control">
    {open ? <input autoFocus className="capture-setting-input" style={{ width: Math.max(pillWidth, (query.length + 2) * 6), minWidth: pillWidth }} role="combobox" aria-label="Capture screen name" aria-expanded="true" aria-controls={id} aria-autocomplete="list" aria-activedescendant={`${id}-${cursor}`} value={query} placeholder={value} onChange={event => { setQuery(event.target.value); setCursor(0); }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(true); }
      else if (event.key === 'Enter') { event.preventDefault(); choose(name || options[cursor]?.value || value); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setCursor(index => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))); }
      else if (event.key === 'Tab') dismiss(false);
    }}/> : <button type="button" className="capture-setting-chip" aria-label="Capture screen" aria-haspopup="listbox" aria-expanded="false" onClick={edit} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); edit(); } }}><PhosphorIcon name="folder" size={10}/><span>{value}</span><PhosphorIcon name="pencil-simple" weight="fill" size={10}/></button>}
    {open && <SelectMenu id={id} label="Capture screen" anchor={anchor} options={options} value={value} className="capture-bucket-menu" minWidth={pillWidth} focusOnOpen={false} activeIndex={cursor} onActiveIndexChange={setCursor} onChoose={choose} onDismiss={dismiss}/>}
  </span>;
}
