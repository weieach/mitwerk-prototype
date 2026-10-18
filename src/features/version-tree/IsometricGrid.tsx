import { useId } from 'react';
import { geometry } from './layout';
import { treeTheme } from './tokens';

/** Dots sit on the isometric lattice intersections, so stations and routes still land on the grid. */
export function IsometricGrid({ width, height, x = 0, visible }: { width: number; height: number; x?: number; visible: boolean }) {
  const id = useId().replaceAll(':', '');
  const step = geometry.gridUnit;
  const rise = geometry.gridRise;
  const dots = [[0, 0], [step * 2, 0], [0, rise * 2], [step * 2, rise * 2], [step, rise]];
  return <g aria-hidden="true" opacity={visible ? 1 : 0}>
    <defs><pattern id={id} width={step * 2} height={rise * 2} patternUnits="userSpaceOnUse">
      <g fill="var(--grid-line)" opacity={treeTheme.gridDotOpacity}>{dots.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={treeTheme.gridDotRadius}/>)}</g>
    </pattern></defs>
    <rect x={x} width={width} height={height} fill={`url(#${id})`}/>
  </g>;
}
