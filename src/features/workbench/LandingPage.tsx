import { memo, useEffect, useRef, useState } from 'react';
import { useTheme } from '../../shared/theme';
import logoShapePart from '../../assets/logo-shape-part.svg?raw';
import logoShape from '../../assets/logo-shape.svg?raw';
import { logoGeometry, stackIntro, type LandingPhase } from './landing-intro';
import { multiplyIntro } from './landing-multiply';
import { turnIntro } from './landing-turn';
import { LandingDescription } from './LandingDescription';
import { impactIntro } from './landing-impact';
import { flattenIntro, unfoldIntro } from './landing-trials';
import { createLandingStage } from './landing-stage';
import { Logomark, logomarkShapeSelector } from '../../components/Logomark';
import { setStartingWorkState } from '../../shared/work-state';

// Preserve the inline SVG nodes across phase changes so opacity transitions can run.
const LandingLogomark = memo(Logomark);

const geometry = logoGeometry(logoShapePart, logoShape);
/** The rotating-sheet intro is the default; `?intro=` picks `stack`, `multiply`, or the `flatten` / `unfold` trials. */
const intro = ({ impact:impactIntro, stack:stackIntro, multiply:multiplyIntro, flatten:flattenIntro, unfold:unfoldIntro } as const)[new URLSearchParams(window.location.search).get('intro') ?? ''] ?? turnIntro;

export function LandingPage() {
  const [theme] = useTheme();
  const [actionsVisible, setActionsVisible] = useState(false);
  const [phase, setPhase] = useState<LandingPhase>('playing');
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brandRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<ReturnType<typeof createLandingStage>>(null);

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current;
    if (!root || !canvas) return;
    const stage = createLandingStage({
      canvas, theme:root, geometry, intro, onPhase:setPhase,
      target:() => {
        // The intro lands on the shape half of the logomark.
        const box = brandRef.current?.querySelector(logomarkShapeSelector)?.getBoundingClientRect(), frame = canvas.getBoundingClientRect();
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

  useEffect(() => {
    if (phase !== 'settled' || actionsVisible) return;
    const reveal = (event:PointerEvent) => {
      if (event.clientY > window.innerHeight / 2) setActionsVisible(true);
    };
    // Keyboard and touch users can also discover the project actions.
    const keyboard = (event:KeyboardEvent) => { if (event.key === 'Tab') setActionsVisible(true); };
    window.addEventListener('pointermove', reveal);
    window.addEventListener('pointerdown', reveal);
    window.addEventListener('keydown', keyboard);
    return () => {
      window.removeEventListener('pointermove', reveal);
      window.removeEventListener('pointerdown', reveal);
      window.removeEventListener('keydown', keyboard);
    };
  }, [phase, actionsVisible]);

  return <main ref={rootRef} className="mw-app landing-page" data-theme={theme} data-intro={phase} aria-label="Landing screen">
    <canvas ref={canvasRef} className="landing-stage" aria-hidden="true"/>
    <div className="landing-scrim" aria-hidden="true"/>
    <div className="landing-content">
      <h1 className="landing-brand"><LandingLogomark ref={brandRef} className="landing-logomark"/></h1>
      <LandingDescription visible={phase !== 'playing'}/>
    </div>
    {/* Shared design-system buttons: primary for the sample, secondary for an empty (0% work state) project. */}
    <div className="landing-actions" data-visible={actionsVisible} inert={!actionsVisible}>
      <div className="landing-action-mask"><a className="mw-button primary landing-open" href={import.meta.env.BASE_URL} onClick={() => setStartingWorkState(1)}>Open sample project</a></div>
      <div className="landing-action-mask"><a className="mw-button landing-open" href={import.meta.env.BASE_URL} onClick={() => setStartingWorkState(0)}>New project (view-only)</a></div>
    </div>
  </main>;
}
