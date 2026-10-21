import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { galleryTokens as t } from './tokens';

type Placement = { left: number; top: number; width: number; maxHeight: number; font: string };

/** Prompt and push captions stay clamped to one line. When the text is cut off, hover (after a short intent delay),
 *  focus or click unfolds it in place: a card over the metadata whose first line sits exactly on the clamped line. */
export function TheaterCaption({ text }: { text: string }) {
  const line = useRef<HTMLParagraphElement>(null);
  const timer = useRef(0);
  const [clipped, setClipped] = useState(false);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useLayoutEffect(() => {
    const element = line.current;
    if (!element) return;
    const measure = () => setClipped(element.scrollWidth > element.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  useEffect(() => { setOpen(false); }, [text]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    const element = line.current, body = element?.closest<HTMLElement>('.theater-body');
    if (!open || !element || !body) { setPlacement(null); return; }
    const place = () => {
      const from = element.getBoundingClientRect(), within = body.getBoundingClientRect();
      const inset = t.theater.captionCardPadding;
      const top = from.top - within.top + body.scrollTop - inset;
      setPlacement({ left: from.left - within.left - inset, top, width: from.width + inset * 2, maxHeight: Math.min(window.innerHeight * t.theater.captionCardMaxVh / 100, within.height - top), font: getComputedStyle(element).font });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  const schedule = (next: boolean, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), delay);
  };
  const enter = () => { if (clipped) schedule(true, open ? 0 : t.theater.captionRevealDelayMs); };
  const leave = () => schedule(false, t.theater.captionCloseDelayMs);
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); line.current?.focus(); }
    if ((event.key === 'Enter' || event.key === ' ') && clipped && event.target === line.current) { event.preventDefault(); setOpen(value => !value); }
  };
  const body = line.current?.closest<HTMLElement>('.theater-body');

  return <>
    <p ref={line} className={`theater-summary${clipped ? ' is-clipped' : ''}`} tabIndex={clipped ? 0 : undefined} aria-expanded={clipped ? open : undefined}
      onPointerEnter={enter} onPointerLeave={leave} onFocus={enter} onBlur={leave} onKeyDown={key} onClick={() => clipped && setOpen(value => !value)}>
      <span data-orbit-blocked data-orbit-inline>{text}</span>
    </p>
    {open && placement && body && createPortal(
      <div className="theater-summary-card" data-orbit-blocked role="note" onPointerEnter={enter} onPointerLeave={leave} onKeyDown={key}
        style={{ left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight, font: placement.font, '--caption-card-padding': `${t.theater.captionCardPadding}px` } as CSSProperties}>
        <p className="theater-summary">{text}</p>
      </div>, body)}
  </>;
}
