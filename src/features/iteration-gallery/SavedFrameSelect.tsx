import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { formatFrameLabel, type GalleryFrame } from './model';

/** A rich listbox keeps annotation indicators aligned independently of label length. */
export function SavedFrameSelect({ frames, counts, value, onChange }: {
  frames: GalleryFrame[]; counts: ReadonlyMap<string, number>; value: string; onChange: (id: string) => void;
}) {
  const options = useMemo(() => [...frames].sort((a, b) => b.timestamp - a.timestamp || (b.number ?? 0) - (a.number ?? 0)), [frames]);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [bounds, setBounds] = useState({ top:0, left:0, width:0, maxHeight:0 });
  const selected = frames.find(frame => frame.id === value);
  function dismiss(restore = true) { setOpen(false); if (restore) trigger.current?.focus(); }
  function choose(index: number) { onChange(options[index].id); dismiss(); }
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect();
      setBounds({ top: rect.bottom, left:rect.left, width:Math.min(Math.max(rect.width, 280), innerWidth - rect.left - 8), maxHeight:Math.max(80, Math.min(360, innerHeight - rect.bottom - 12)) });
    };
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const outside = (event: PointerEvent) => { if (!list.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) dismiss(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { if (open) list.current?.children[cursor]?.scrollIntoView({ block:'nearest' }); }, [cursor, open]);
  return <>
    <button ref={trigger} className={`row-select saved-frame-trigger${value ? '' : ' is-placeholder'}`} data-header-fill data-header-fill-content
      aria-label="Saved frame" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} disabled={!frames.length}
      onClick={() => { setCursor(Math.max(0, options.findIndex(frame => frame.id === value))); setOpen(!open); }}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setCursor(Math.max(0, options.findIndex(frame => frame.id === value))); setOpen(true); } }}>
      <span className="row-select-copy">{selected ? formatFrameLabel(selected) : frames.length ? 'Select frame' : 'No frames in range'}</span>
      <PhosphorIcon name="caret-down" size="var(--selector-caret-size)"/>
    </button>
    {open && createPortal(<div ref={list} id={id} role="listbox" aria-label="Saved frames, newest first" aria-activedescendant={`${id}-${cursor}`} tabIndex={-1}
      className="saved-frame-options" style={bounds}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
        else if (event.key === 'Tab') dismiss(false);
        else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (options[cursor]) choose(cursor); }
        else if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
          event.preventDefault(); setCursor(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
        }
      }}>
      {options.map((frame, index) => <div id={`${id}-${index}`} key={frame.id} role="option" aria-selected={value === frame.id}
        aria-label={`${formatFrameLabel(frame)}${counts.has(frame.id) ? `, ${counts.get(frame.id)} annotations` : ''}`}
        className={cursor === index ? 'is-highlighted' : ''} onPointerMove={() => setCursor(index)} onClick={() => choose(index)}>
        <span>{formatFrameLabel(frame)}</span>{counts.has(frame.id) && <PhosphorIcon name="bookmark-simple" weight="fill"/>}
      </div>)}
    </div>, document.body)}
  </>;
}
