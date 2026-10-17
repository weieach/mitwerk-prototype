import { flushSync } from 'react-dom';

const panelSelector = '.mw-body > *';

function visiblePanels() {
  const panels = new Map<string, DOMRect>();
  for (const element of document.querySelectorAll<HTMLElement>(panelSelector)) {
    const name = getComputedStyle(element).viewTransitionName;
    const rect = element.getBoundingClientRect();
    if (name && name !== 'none' && !element.hidden && rect.width > 0) panels.set(name, rect);
  }
  return panels;
}

/**
 * Morphs panels between layouts with the View Transitions API. Staying panels stretch or squeeze their frame;
 * entering and leaving panels sweep in or out from the edge they share with their neighbours. Content is never scaled.
 * Falls back to an instant update without support, with reduced motion or while the page is hidden.
 */
export function animateLayout(update: () => void) {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || typeof document === 'undefined' || document.visibilityState !== 'visible' || !('startViewTransition' in document)) { update(); return; }
  const root = document.documentElement;
  const before = visiblePanels();
  let entering: [string, DOMRect][] = [], leaving: [string, DOMRect][] = [];
  const transition = document.startViewTransition(() => {
    flushSync(update);
    const after = visiblePanels();
    entering = [...after].filter(([name]) => !before.has(name));
    leaving = [...before].filter(([name]) => !after.has(name));
    root.dataset.vtSweep = [...entering, ...leaving].map(([name]) => name).join(' ');
    root.dataset.vtLeave = leaving.map(([name]) => name).join(' ');
  });
  transition.ready.then(() => {
    const style = getComputedStyle(root);
    const timing = { duration: parseFloat(style.getPropertyValue('--motion-layout')) || 0, easing: style.getPropertyValue('--ease-layout').trim() || 'ease', fill: 'both' as const };
    const radius = style.getPropertyValue('--workspace-radius').trim() || '0px';
    const sweep = (rect: DOMRect) => rect.left + rect.width / 2 > innerWidth / 2 ? `inset(0 0 0 100% round ${radius})` : `inset(0 100% 0 0 round ${radius})`;
    const open = `inset(0 0 0 0 round ${radius})`;
    for (const [name, rect] of entering) root.animate({ clipPath: [sweep(rect), open] }, { ...timing, pseudoElement: `::view-transition-group(${name})` });
    for (const [name, rect] of leaving) root.animate({ clipPath: [open, sweep(rect)] }, { ...timing, pseudoElement: `::view-transition-group(${name})` });
  }).catch(() => {});
  // A skipped transition still applies the update; only the animation is dropped.
  transition.finished.catch(() => {}).finally(() => { delete root.dataset.vtSweep; delete root.dataset.vtLeave; });
}
