import { forwardRef, useImperativeHandle, useState } from 'react';

import type { AxisLabel } from './axis-label-layout';
export type AxisLabelsHandle = { update: (labels: AxisLabel[]) => void };

/** React owns sharp DOM text; the scene supplies its projected 3D transforms. */
export const AxisLabels = forwardRef<AxisLabelsHandle>(function AxisLabels(_, ref) {
  const [labels, setLabels] = useState<AxisLabel[]>([]);
  useImperativeHandle(ref, () => ({ update: setLabels }), []);
  return <div className="album-axis-labels" aria-hidden="true">
    {labels.map(label => <span key={label.id} className="album-axis-label" hidden={label.hidden}
      style={{ transform: label.transform, fontSize: label.fontSize }}><span>{label.text}</span></span>)}
  </div>;
});
