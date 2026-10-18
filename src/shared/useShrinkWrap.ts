import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Shrinks wrapped text boxes to their longest line. CSS sizes a wrapped box to its max-width, which leaves a ragged gap on the right
 * and makes centered padding look off; this measures the rendered lines and sets the box to exactly fit them.
 */
export function useShrinkWrap(container: RefObject<HTMLElement | null>, selector: string, deps: unknown[]) {
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const fit = () => {
      for (const box of root.querySelectorAll<HTMLElement>(selector)) {
        box.style.width = '';
        const natural = box.getBoundingClientRect().width;
        const range = document.createRange();
        range.selectNodeContents(box);
        const lines = [...range.getClientRects()].filter(rect => rect.width > 0);
        if (!lines.length) continue;
        const text = Math.max(...lines.map(rect => rect.right)) - Math.min(...lines.map(rect => rect.left));
        const style = getComputedStyle(box);
        const chrome = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((sum, key) => sum + parseFloat(style[key as 'paddingLeft']), 0);
        // Never wider than the box CSS already allows, so the edge stays on its alignment line.
        box.style.width = `${Math.min(natural, Math.ceil(text + chrome))}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(() => fit());
    observer.observe(root);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, deps);
}
