import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';
import { galleryTokens as t } from './tokens';
import type { AxisLabel } from './axis-label-layout';
export type AxisLabelsHandle = { update: (labels: AxisLabel[]) => void };

/** The scene owns label DOM inside this layer, keeping text and canvas in one frame. */
export const AxisLabels = forwardRef<AxisLabelsHandle>(function AxisLabels(_, ref) {
  const root = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLSpanElement>());
  useImperativeHandle(ref, () => ({ update(labels) {
    const layer = root.current;
    if (!layer) return;
    const ids = new Set(labels.map(label => label.id));
    for (const [id, node] of nodes.current) if (!ids.has(id)) { node.remove(); nodes.current.delete(id); }
    layer.style.setProperty('--axis-front-layer', String(Math.max(0, ...labels.map(label => label.layer)) + 1));
    for (const label of labels) {
      let node = nodes.current.get(label.id);
      if (!node) {
        node = document.createElement('span');
        node.append(document.createElement('span'));
        nodes.current.set(label.id, node);
        layer.append(node);
      }
      node.className = ['album-axis-label', label.featured && 'album-axis-label-featured',
        label.featured && label.face === 'ground' && 'album-axis-label-featured-version'].filter(Boolean).join(' ');
      node.hidden = label.hidden;
      node.dataset.labelId = label.id;
      node.dataset.labelRow = String(label.row ?? 0);
      if (label.dateRail) node.dataset.dateRail = label.dateRail; else delete node.dataset.dateRail;
      Object.assign(node.style, { transform:label.transform, fontSize:`${label.fontSize}px`, opacity:String(label.opacity), zIndex:String(label.layer) });
      const text = node.firstElementChild as HTMLSpanElement;
      if (text.textContent !== label.text) text.textContent = label.text;
      text.style.pointerEvents = label.opacity > .05 ? 'auto' : 'none';
      text.style.transform = `translate(${-100 * label.align}%, ${-50 - 50 * label.rise}%)`;
    }
  } }), []);
  return <div ref={root} className="album-axis-labels" aria-hidden="true" style={{ '--axis-hover-background': t.axisText.hoverBackground, '--axis-hover-border': `${t.axisText.hoverBorderWidth}px`, '--axis-hover-color': t.axisText.hoverBorderColor, '--axis-hover-gap': `${t.axisText.hoverBorderGap}px` } as CSSProperties}/>;
});
