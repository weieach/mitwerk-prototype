import { forwardRef, useImperativeHandle, useState } from 'react';

import type { CSSProperties } from 'react';
import { galleryTokens as t } from './tokens';
import type { AxisLabel } from './axis-label-layout';
export type AxisLabelsHandle = { update: (labels: AxisLabel[]) => void };

/** React owns sharp DOM text; the scene supplies its projected 3D transforms. */
export const AxisLabels = forwardRef<AxisLabelsHandle>(function AxisLabels(_, ref) {
  const [labels, setLabels] = useState<AxisLabel[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const frontLayer = Math.max(0, ...labels.map(label => label.layer)) + 1;
  useImperativeHandle(ref, () => ({ update: setLabels }), []);
  return <div className="album-axis-labels" aria-hidden="true" style={{ '--axis-hover-background': t.axisText.hoverBackground, '--axis-hover-border': `${t.axisText.hoverBorderWidth}px`, '--axis-hover-color': t.axisText.hoverBorderColor, '--axis-hover-gap': `${t.axisText.hoverBorderGap}px` } as CSSProperties}>
    {labels.map(label => <span key={label.id} className={[
      'album-axis-label',
      hovered === label.id && 'is-hovered',
      label.featured && 'album-axis-label-featured',
      label.featured && label.face === 'ground' && 'album-axis-label-featured-version',
    ].filter(Boolean).join(' ')} hidden={label.hidden} data-date-rail={label.dateRail} data-label-row={label.row ?? 0}
      style={{ transform: label.transform, fontSize: label.fontSize, opacity: label.opacity, zIndex: hovered === label.id ? frontLayer : label.layer }}><span
        onPointerEnter={() => setHovered(label.id)} onPointerLeave={() => setHovered(null)}
        style={{ pointerEvents: label.opacity > .05 ? 'auto' : 'none', transform: `translate(${-100 * label.align}%, ${-50 - 50 * label.rise}%)` }}>{label.text}</span></span>)}
  </div>;
});
