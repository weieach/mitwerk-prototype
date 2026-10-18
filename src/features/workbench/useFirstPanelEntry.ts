import { useEffect, useRef } from 'react';

const panelSelectors = {
  chat: '#workspace-pane-chat',
  version: '.iteration-gallery',
  ideas: '#workspace-pane-ideas',
  live: '.theater-runtime',
} as const;
type Feature = keyof typeof panelSelectors;

/** Play once per feature in this workspace session, including initially open panels. */
export function useFirstPanelEntry(active: Record<Feature, boolean>) {
  const entered = useRef(new Set<Feature>());
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      for (const feature of Object.keys(panelSelectors) as Feature[]) {
        if (!active[feature] || entered.current.has(feature)) continue;
        const panel = document.querySelector<HTMLElement>(panelSelectors[feature]);
        if (!panel) continue;
        entered.current.add(feature);
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) continue;
        const duration = parseFloat(getComputedStyle(panel).getPropertyValue('--feature-entry-duration'));
        panel.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }],
          { duration, easing: 'cubic-bezier(.2,0,0,1)' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [active.chat, active.version, active.ideas, active.live]);
}
