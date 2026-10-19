import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon';
import { RowSelect } from '../../components/RowSelect';
import { inRange, ranges, type GalleryFrame, type RangeKey } from './model';
import { type JumpScale } from './timeline';

/** A confirmation only: the sample project does not generate an export. */
export function PlaybackExport({ catalog, range, now, unit, hasMilestone }: {
  catalog: GalleryFrame[]; range: RangeKey; now: number; unit: JumpScale; hasMilestone: (version: number) => boolean;
}) {
  const [open, setOpen] = useState(() => new URLSearchParams(location.search).get('screenshot') === '1' && new URLSearchParams(location.search).get('exportOpen') === '1');
  const [exportRange, setExportRange] = useState(range);
  const [toast, setToast] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const id = useId();
  const eligible = catalog.filter(frame => inRange(frame, exportRange, now) && (unit === 'frame' ? frame.kind !== 'push' : frame.kind === 'push' && (unit === 'version' || hasMilestone(frame.version))));
  const count = unit === 'frame' ? eligible.length : new Set(eligible.map(frame => frame.version)).size;
  const countUnit = unit === 'frame' ? 'prompt' : 'version';
  function close(restoreFocus = false) { setOpen(false); if (restoreFocus) trigger.current?.focus(); }
  useLayoutEffect(() => {
    if (!open || !dialog.current) return;
    const panel = dialog.current;
    if (!panel.matches(':popover-open')) panel.showPopover();
    const position = () => {
      const rect = trigger.current!.getBoundingClientRect();
      panel.style.left = `${Math.max(8, Math.min(rect.right - panel.offsetWidth, innerWidth - panel.offsetWidth - 8))}px`;
      panel.style.top = `${rect.bottom + 8}px`;
      panel.style.maxHeight = `${Math.max(80, innerHeight - rect.bottom - 16)}px`;
    };
    position(); addEventListener('resize', position); addEventListener('scroll', position, true);
    panel.focus({ preventScroll: true });
    return () => { removeEventListener('resize', position); removeEventListener('scroll', position, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!dialog.current?.contains(target) && !trigger.current?.contains(target) && !target.closest('.select-menu, .playback-controls-trigger')) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(false), 5000); return () => clearTimeout(timer); }, [toast]);
  return <>
    <button ref={trigger} type="button" className="icon-button panel-expand playback-export-trigger" aria-label="Export playback" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { if (open) close(); else { setExportRange(range); setOpen(true); } }}><Icon name="download" size={16}/></button>
    {open && <div ref={dialog} id={id} role="dialog" aria-label="Export playback" popover="manual" tabIndex={-1} className="playback-export-dialog" data-orbit-blocked
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); } }}>
      <h3>Export playback</h3>
      <RowSelect label="Export time range" value={exportRange} options={ranges} onChange={value => setExportRange(value as RangeKey)}/>
      <button type="button" className="mw-button primary playback-export-save" onClick={() => { close(true); setToast(true); }}>Save MP4</button>
      <p aria-live="polite">{count} {countUnit}{count === 1 ? '' : 's'}</p>
    </div>}
    {toast && createPortal(<div className="mw-toast playback-export-toast" role="status">Exporting is currently not supported for sample project.<button type="button" aria-label="Dismiss export notification" onClick={() => setToast(false)}><Icon name="close"/></button></div>, document.body)}
  </>;
}
