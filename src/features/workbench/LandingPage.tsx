import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../shared/theme';
import logoShapePart from '../../assets/logo-shape-part.svg?raw';
import logoShape from '../../assets/logo-shape.svg?raw';
import { logoGeometry, stackIntro, type LandingPhase } from './landing-intro';
import { multiplyIntro } from './landing-multiply';
import { impactIntro } from './landing-impact';
import { flattenIntro, unfoldIntro } from './landing-trials';
import { createLandingStage } from './landing-stage';
import './workspace-layout.css';

const geometry = logoGeometry(logoShapePart, logoShape);
/** Version 3 (impact) is the default; `?intro=` picks `stack`, `multiply`, or the `flatten` / `unfold` trials. */
const intro = ({ stack:stackIntro, multiply:multiplyIntro, flatten:flattenIntro, unfold:unfoldIntro } as const)[new URLSearchParams(window.location.search).get('intro') ?? ''] ?? impactIntro;

export function LandingPage() {
  const [theme] = useTheme();
  const [phase, setPhase] = useState<LandingPhase>('playing');
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const symbolRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<ReturnType<typeof createLandingStage>>(null);

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current;
    if (!root || !canvas) return;
    const stage = createLandingStage({
      canvas, theme:root, geometry, intro, onPhase:setPhase,
      target:() => {
        const box = symbolRef.current?.getBoundingClientRect(), frame = canvas.getBoundingClientRect();
        return box ? { x:box.left - frame.left, y:box.top - frame.top, width:box.width, height:box.height } : null;
      },
    });
    stageRef.current = stage;
    if (!stage) setPhase('settled');
    const skip = () => stageRef.current?.skip();
    root.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
    return () => { stage?.dispose(); root.removeEventListener('pointerdown', skip); window.removeEventListener('keydown', skip); };
  }, []);

  useEffect(() => { stageRef.current?.refreshColors(); }, [theme]);

  return <main ref={rootRef} className="mw-app landing-page" data-theme={theme} data-intro={phase} aria-label="Landing screen">
    <canvas ref={canvasRef} className="landing-stage" aria-hidden="true"/>
    <div className="landing-scrim" aria-hidden="true"/>
    <div className="landing-content">
      <div className="landing-brand">
        <svg ref={symbolRef} className="landing-symbol" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true"><path d={geometry.path} fill="currentColor"/></svg>
        <strong>MitWerk</strong>
      </div>
      <a className="mw-button landing-open" href={import.meta.env.BASE_URL}>Open project</a>
    </div>
  </main>;
}
