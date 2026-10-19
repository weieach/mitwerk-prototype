import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { workStateStore, workStateTokens } from './work-state';

/** Live state, including the slider value as it moves. Used by the simulator sheet and its hidden-state readout. */
export function useWorkState() {
  return useSyncExternalStore(workStateStore.subscribe, workStateStore.get);
}

/** What the panels render: it changes after the slider settles, not on every pointer move. */
export function usePanelWorkState() {
  return useSyncExternalStore(workStateStore.subscribe, workStateStore.getApplied);
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animates elements marked `data-growth-key` that appear while the simulator is open.
 * Keys already on screen keep their place, so opening the simulator never replays the panel.
 */
export function useGrowthEntrance(root: RefObject<HTMLElement | null>, active: boolean) {
  const seen = useRef<Set<string> | null>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) { if (seen.current) seen.current = new Set(); return; }
    const items = [...element.querySelectorAll<HTMLElement | SVGElement>('[data-growth-key]')];
    const previous = seen.current;
    seen.current = new Set(items.map(item => item.dataset.growthKey!));
    if (!active || !previous || reducedMotion()) return;
    // Individual translate/scale compose with each element's own centering transform.
    for (const item of items) {
      if (previous.has(item.dataset.growthKey!)) continue;
      const svg = item instanceof SVGElement;
      item.animate(svg ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, translate: '0 8px', scale: '.96' }, { opacity: 1, translate: '0 0', scale: '1' }],
        { duration: workStateTokens.growMs, easing: workStateTokens.easing, fill: 'backwards' });
    }
  });
}

/** Cross-fades a chat variation when the slideshow advances. */
export function useSlideTransition(root: RefObject<HTMLElement | null>, key: string, active: boolean) {
  const previous = useRef(key);
  useLayoutEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    if (!active || reducedMotion()) return;
    root.current?.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }],
      { duration: workStateTokens.slideMs, easing: workStateTokens.easing });
  }, [key, active]);
}
