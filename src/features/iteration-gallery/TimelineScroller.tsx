import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { timelineScrollWindow } from './timeline';

/** A persistent overview of the native scroll viewport, independent of the playhead. */
export function TimelineScroller({ viewportRef, contentKey }: { viewportRef: RefObject<HTMLDivElement | null>; contentKey: number }) {
  const [window, setWindow] = useState({ start: 0, size: 1, maxScroll: 0 });
  const drag = useRef<{ id: number; x: number; left: number; scale: number } | null>(null);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setWindow(timelineScrollWindow(viewport.clientWidth, viewport.scrollWidth, viewport.scrollLeft));
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    viewport.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); viewport.removeEventListener('scroll', update); };
  }, [viewportRef, contentKey]);
  return <div className="timeline-scroll-overview" role="slider" tabIndex={0} aria-label="Timeline visible portion"
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(window.start / Math.max(1 - window.size, .0001) * 100)}
    aria-valuetext={`${Math.round(window.start * 100)}–${Math.round((window.start + window.size) * 100)}% of sequence visible`}
    onPointerDown={event => {
      if (event.button !== 0 || !viewportRef.current) return;
      event.preventDefault(); event.currentTarget.focus();
      const viewport = viewportRef.current;
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      if (x < window.start * bounds.width || x > (window.start + window.size) * bounds.width) {
        viewport.scrollLeft = (x / bounds.width - window.size / 2) * viewport.scrollWidth;
      }
      drag.current = { id: event.pointerId, x: event.clientX, left: viewport.scrollLeft, scale: viewport.scrollWidth / bounds.width };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (drag.current?.id !== event.pointerId || !viewportRef.current) return;
      viewportRef.current.scrollLeft = drag.current.left + (event.clientX - drag.current.x) * drag.current.scale;
    }}
    onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); drag.current = null; }}
    onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
    onKeyDown={event => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? .1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -.1
        : event.key === 'PageDown' ? 1 : event.key === 'PageUp' ? -1 : null;
      if (delta === null && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      viewport.scrollLeft = event.key === 'Home' ? 0 : event.key === 'End' ? window.maxScroll : viewport.scrollLeft + viewport.clientWidth * delta!;
    }}>
    <span className="timeline-scroll-thumb" style={{ left: `${window.start * 100}%`, width: `${window.size * 100}%` }}/>
  </div>;
}
