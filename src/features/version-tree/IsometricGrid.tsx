import { useId } from 'react';
import { geometry } from './layout';

export function IsometricGrid({ width, height, x = 0, visible }: { width: number; height: number; x?: number; visible: boolean }) {
  const id = useId().replaceAll(':', '');
  const step = geometry.gridUnit;
  const rise = geometry.gridRise;
  return <g aria-hidden="true" opacity={visible ? 1 : 0}>
    <defs><pattern id={id} width={step * 2} height={rise * 2} patternUnits="userSpaceOnUse"><path d={`M0 0L${step * 2} ${rise * 2}M0 ${rise * 2}L${step * 2} 0M${step} 0V${rise * 2}M0 0V${rise * 2}`} fill="none" stroke="var(--grid-line)" strokeWidth="0.55" opacity="0.32"/></pattern></defs>
    <rect x={x} width={width} height={height} fill={`url(#${id})`}/>
  </g>;
}
