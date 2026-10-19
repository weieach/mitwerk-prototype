import type { Ref } from 'react';
import markup from '../assets/verso-logomark.svg?raw';

/** Selector for the shape half of the logomark (the splash intro lands on its bounds). */
export const logomarkShapeSelector = '[data-logomark-shape]';

/**
 * The verso logomark: one SVG with the shape and the name. Its height is `--logomark-height` (em of the
 * surrounding font size, so it scales with the type role around it) and its color is `--logomark-ink`.
 */
export function Logomark({ className = '', label = 'verso', ref }: { className?: string; label?: string | null; ref?: Ref<HTMLSpanElement> }) {
  return <span ref={ref} className={`logomark ${className}`} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    dangerouslySetInnerHTML={{ __html: markup }}/>;
}
