import { useLayoutEffect, useRef, type RefObject } from 'react';
import { galleryTokens as t } from './tokens';

/** Keep the same frame on screen while its surrounding panels restore their layout. */
export function useRuntimeReturn(screen: RefObject<HTMLDivElement | null>, exiting: boolean, active: boolean) {
  const origin = useRef<DOMRect | null>(null);
  const repaint = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const node = screen.current;
    const from = origin.current;
    if (!node || !from || !exiting || !active || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const start = performance.now();
    node.style.transformOrigin = '0 0';
    node.style.willChange = 'transform';
    const paint = (now: number) => {
      // Re-read the destination as the reader divider and footer settle. Measuring
      // without our transform avoids feeding the previous animation into itself.
      node.style.transform = '';
      const to = node.getBoundingClientRect();
      const progress = Math.min(1, (now - start) / t.theaterMotion.runtimeReturnMs);
      const remaining = Math.pow(1 - progress, 3);
      if (to.width && to.height) {
        node.style.transform = `translate(${(from.x - to.x) * remaining}px, ${(from.y - to.y) * remaining}px) scale(${1 + (from.width / to.width - 1) * remaining}, ${1 + (from.height / to.height - 1) * remaining})`;
      }
      return progress;
    };
    const tick = (now: number) => {
      if (paint(now) < 1) raf = requestAnimationFrame(tick);
    };
    repaint.current = () => { paint(performance.now()); };
    // React measurements and the restoring CSS grid can change the frame between
    // RAF callbacks. Correct those changes before paint as well.
    const observer = new ResizeObserver(() => repaint.current?.());
    observer.observe(node);
    tick(start);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      repaint.current = null;
      node.style.transform = '';
      node.style.transformOrigin = '';
      node.style.willChange = '';
    };
  }, [screen, exiting, active]);
  useLayoutEffect(() => { repaint.current?.(); });
  return () => { origin.current = screen.current?.getBoundingClientRect() ?? null; };
}
