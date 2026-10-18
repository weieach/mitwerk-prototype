import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';
import { galleryTokens as t } from './tokens';
import { workStateTokens } from '../../shared/work-state';
import type { AxisLabel } from './axis-label-layout';
export type AxisLabelsHandle = { update: (labels: AxisLabel[]) => void };

/** Label ids end in their depth; the entry key drops it, so a label that only moves is not new. */
const entryKey = (id: string) => id.slice(0, id.lastIndexOf(':'));

/**
 * The scene owns label DOM inside this layer, keeping text and canvas in one frame.
 * With `animateEntry` (the work state simulator), labels that appear slide up inside their own box as a
 * mask, just after their ruler tick starts extending.
 */
export const AxisLabels = forwardRef<AxisLabelsHandle, { animateEntry?: boolean }>(function AxisLabels({ animateEntry = false }, ref) {
  const root = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLSpanElement>());
  const animate = useRef(animateEntry);
  animate.current = animateEntry;
  const seen = useRef<Set<string> | null>(null);
  useImperativeHandle(ref, () => ({ update(labels) {
    const layer = root.current;
    if (!layer) return;
    const previous = seen.current;
    const entering = animate.current && previous && previous.size > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    seen.current = new Set(labels.map(label => entryKey(label.id)));
    const ids = new Set(labels.map(label => label.id));
    for (const [id, node] of nodes.current) if (!ids.has(id)) { node.remove(); nodes.current.delete(id); }
    layer.style.setProperty('--axis-front-layer', String(Math.max(0, ...labels.map(label => label.layer)) + 1));
    for (const label of labels) {
      let node = nodes.current.get(label.id);
      if (!node) {
        node = document.createElement('span');
        const text = document.createElement('span'), ink = document.createElement('span');
        ink.className = 'album-axis-label-ink';
        text.append(ink);
        node.append(text);
        nodes.current.set(label.id, node);
        layer.append(node);
        if (entering && !previous.has(entryKey(label.id))) ink.animate([{ translate: '0 110%' }, { translate: '0 0' }],
          { duration: workStateTokens.growMs, delay: workStateTokens.growMs * workStateTokens.labelDelay, easing: workStateTokens.easing, fill: 'backwards' });
      }
      node.className = ['album-axis-label', label.featured && 'album-axis-label-featured',
        label.featured && label.face === 'ground' && 'album-axis-label-featured-version'].filter(Boolean).join(' ');
      node.hidden = label.hidden;
      node.dataset.labelId = label.id;
      node.dataset.labelRow = String(label.row ?? 0);
      if (label.dateRail) node.dataset.dateRail = label.dateRail; else delete node.dataset.dateRail;
      Object.assign(node.style, { transform:label.transform, fontSize:`${label.fontSize}px`, opacity:String(label.opacity), zIndex:String(label.layer) });
      const text = node.firstElementChild as HTMLSpanElement;
      const ink = text.firstElementChild as HTMLSpanElement;
      if (ink.textContent !== label.text) ink.textContent = label.text;
      text.style.pointerEvents = label.opacity > .05 ? 'auto' : 'none';
      text.style.transform = `translate(${-100 * label.align}%, ${-50 - 50 * label.rise}%)`;
    }
  } }), []);
  return <div ref={root} className="album-axis-labels" aria-hidden="true" style={{ '--axis-hover-background': t.axisText.hoverBackground, '--axis-hover-border': `${t.axisText.hoverBorderWidth}px`, '--axis-hover-color': t.axisText.hoverBorderColor, '--axis-hover-gap': `${t.axisText.hoverBorderGap}px` } as CSSProperties}/>;
});
