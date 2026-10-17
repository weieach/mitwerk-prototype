import { LANDING_INTRO, landingPhase, type Band, type LandingIntro, type LandingPhase, type LogoGeometry, type Rect } from './landing-intro.ts';

/**
 * Landing intro renderer. Plain Canvas2D, no shaders: every visible frame is filled in
 * complete white as one path, so a single glow wraps the shapes. No gradients, tone,
 * shadow, grain, motion blur or trails.
 */
type Options = { canvas:HTMLCanvasElement; theme:HTMLElement; target:() => Rect | null; geometry:LogoGeometry; intro:LandingIntro; onPhase:(phase:LandingPhase) => void };

function token(host:HTMLElement, name:string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  probe.style.display = 'none';
  host.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

function trace(context:CanvasRenderingContext2D, band:Band) {
  context.moveTo(band.x0, band.top[0]);
  context.lineTo(band.topHinge, band.top[1]);
  context.lineTo(band.x1, band.top[2]);
  context.lineTo(band.x1, band.bottom[2]);
  context.lineTo(band.bottomHinge, band.bottom[1]);
  context.lineTo(band.x0, band.bottom[0]);
  context.closePath();
}

export function createLandingStage({ canvas, theme, target, geometry, intro, onPhase }:Options) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fixedTime = reducedMotion ? intro.settleTime : null;
  const readColors = () => ({ background:token(theme, '--landing-stage-background'), frame:token(theme, '--landing-frame'), glow:token(theme, '--landing-frame-glow') });
  let colors = readColors();
  let size = { width:0, height:0, ratio:1 };
  let start = performance.now(), frame = 0, phase: LandingPhase | null = null;

  const render = (time:number) => {
    const { width, height, ratio } = size;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.shadowBlur = 0;
    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);
    const box = target() ?? { x:width / 2, y:height / 2, width:1, height:1 };
    context.beginPath();
    for (const band of intro.bands(time, { width, height }, box, geometry)) trace(context, band);
    context.fillStyle = colors.frame;
    context.shadowColor = colors.glow;
    context.shadowBlur = LANDING_INTRO.glowBlur * ratio;
    context.fill('nonzero');
  };

  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, LANDING_INTRO.pixelRatio);
    size = { width:canvas.clientWidth, height:canvas.clientHeight, ratio };
    canvas.width = Math.max(1, Math.round(size.width * ratio));
    canvas.height = Math.max(1, Math.round(size.height * ratio));
    render(fixedTime ?? (performance.now() - start) / 1000);
  };

  const report = (time:number) => {
    const next = landingPhase(time, intro);
    if (next !== phase) { phase = next; onPhase(next); }
  };

  const tick = (now:number) => {
    frame = requestAnimationFrame(tick);
    const time = (now - start) / 1000;
    render(time);
    report(time);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  if (fixedTime === null) frame = requestAnimationFrame(tick);
  else report(fixedTime);

  return {
    /** Jump straight to the logo reveal. */
    skip() {
      const time = (performance.now() - start) / 1000;
      if (fixedTime === null && time < intro.revealAt) start -= (intro.revealAt - time) * 1000;
    },
    refreshColors() {
      colors = readColors();
      if (fixedTime !== null) render(fixedTime);
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}
