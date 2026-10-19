import type { Ref } from 'react';
import logoShapePart from '../assets/logo-shape-part.svg?raw';
import logoShape from '../assets/logo-shape.svg?raw';
import { logoGeometry } from '../features/workbench/landing-intro';

/** The verso shape, drawn tight to its bounds so logomark gaps measure from the visible edge. */
export const logomarkGeometry = logoGeometry(logoShapePart, logoShape);

/** Shape half of every logomark. Sized by `--logomark-symbol-height` (em of the name beside it); colored by the text color. */
export function LogomarkSymbol({ className = '', ref }: { className?: string; ref?: Ref<SVGSVGElement> }) {
  return <svg ref={ref} className={`logomark-symbol ${className}`} viewBox={`0 0 ${logomarkGeometry.width} ${logomarkGeometry.height}`} aria-hidden="true">
    <path d={logomarkGeometry.path} fill="currentColor"/>
  </svg>;
}
