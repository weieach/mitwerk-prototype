import { useLayoutEffect, useRef } from 'react';

/** FLIP keyed rows from their current visual position, including interrupted moves. */
export function useReorderAnimation() {
  const listRef = useRef<HTMLUListElement>(null);
  const previous = useRef<Map<string, DOMRect> | null>(null);
  const animations = useRef<Animation[]>([]);
  function capturePositions() {
    const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-reorder-id]');
    previous.current = new Map(Array.from(rows ?? [], row => [row.dataset.reorderId!, row.getBoundingClientRect()]));
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
  }
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = null;
    const list = listRef.current;
    if (!before || !list || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const style = getComputedStyle(list);
    const duration = Number.parseFloat(style.getPropertyValue('--drawer-reorder-duration'));
    const easing = style.getPropertyValue('--drawer-open-ease').trim();
    for (const row of list.querySelectorAll<HTMLElement>('[data-reorder-id]')) {
      const old = before.get(row.dataset.reorderId!);
      if (!old) continue;
      const next = row.getBoundingClientRect();
      const x = old.left - next.left, y = old.top - next.top;
      if (Math.abs(x) + Math.abs(y) < .5) continue;
      animations.current.push(row.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }], { duration, easing }));
    }
  });
  useLayoutEffect(() => () => animations.current.forEach(animation => animation.cancel()), []);
  return { listRef, capturePositions };
}
