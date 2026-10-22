import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PhosphorIcon } from '../../components/PhosphorIcon';

import { celebration, confettiKeyframes } from './celebration';

/** Separate from annotation navigation, so mouse and keyboard activation just celebrate. */
export function MilestoneTrophy({ disabled, milestone }: { disabled: boolean; milestone: string }) {
  const [burst, setBurst] = useState<{ x: number; y: number; color: string; sequence: number } | null>(null);
  const particles = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!burst) return;
    const animations = [...particles.current!.children].map((piece, index) => piece.animate(confettiKeyframes(index), { duration: celebration.duration, easing: 'linear', fill: 'both' }));
    const timer = setTimeout(() => setBurst(null), celebration.duration);
    return () => { clearTimeout(timer); animations.forEach(animation => animation.cancel()); };
  }, [burst]);

  return <>
    <button type="button" className="annotation-milestone-icon" disabled={disabled} aria-label={`Celebrate milestone: ${milestone}`} onClick={event => {
      event.stopPropagation();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const button = event.currentTarget, rect = button.getBoundingClientRect();
      setBurst(previous => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, color: getComputedStyle(button).backgroundColor, sequence: (previous?.sequence ?? 0) + 1 }));
    }}>
      <span key={burst?.sequence ?? 0} className={`milestone-trophy-glyph${burst ? ' is-celebrating' : ''}`}><PhosphorIcon name="trophy" weight="fill" size="var(--annotation-pill-icon-size)"/></span>
    </button>
    {burst && createPortal(<div ref={particles} key={burst.sequence} className="milestone-confetti" aria-hidden="true" style={{ left: burst.x, top: burst.y }}>
      {Array.from({ length: celebration.particles }, (_, i) => <i key={i} style={{ backgroundColor: i % 2 ? burst.color : 'var(--confetti-contrast)' }}/>) }
    </div>, document.body)}
  </>;
}
