import { useLayoutEffect, useRef, useState } from 'react';
import { galleryTokens as t } from './tokens';

/** Animate explicit seeks; scrubbing and playback keep their immediate response. */
export function usePlayheadMotion(target: number, navigationKey: number) {
  const [position, setPosition] = useState(target);
  const current = useRef(target);
  const previousKey = useRef(navigationKey);
  useLayoutEffect(() => {
    const animate = previousKey.current !== navigationKey;
    previousKey.current = navigationKey;
    const start = current.current;
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target; setPosition(target); return;
    }
    let request = 0;
    const began = performance.now();
    function step(now: number) {
      const progress = Math.min(1, (now - began) / t.timeline.seekDurationMs);
      const eased = 1 - (1 - progress) ** 3;
      current.current = start + (target - start) * eased;
      setPosition(current.current);
      if (progress < 1) request = requestAnimationFrame(step);
    }
    request = requestAnimationFrame(step);
    return () => cancelAnimationFrame(request);
  }, [target, navigationKey]);
  return position;
}
