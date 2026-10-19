import { LANDING_ORBIT, orbitQuads } from './landing-orbit.ts';
import { LANDING_INTRO, landingPhase, type Band, type LandingIntro, type LandingPhase, type LogoGeometry, type Rect } from './landing-intro.ts';

/** Canvas surface rendering shared by the sheet intro and its depth-sorted 3D orbit. */
const SURFACE = { wireWidth:1, wireOpacity:.65 } as const;
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
  const readColors = () => {
    const frame = token(theme, '--landing-frame');
    // The glow is the quad color at --landing-frame-glow-alpha, built here so the canvas gets a plain rgba().
    const rawAlpha = getComputedStyle(theme).getPropertyValue('--landing-frame-glow-alpha').trim();
    const alpha = rawAlpha ? Number(rawAlpha) : .14;
    const [r, g, b] = frame.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255];
    const opening = token(theme, '--landing-opening-frame').match(/[\d.]+/g)?.map(Number) ?? [208, 208, 208];
    const lit = token(theme, '--landing-lit-frame').match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255];
    return { opening, lit, background:token(theme, '--landing-stage-background'), frame, glowRgb:`${r}, ${g}, ${b}`, glowAlpha:alpha };
  };
  let colors = readColors();
  let lastTime = 0;
  let size = { width:0, height:0, ratio:1 };
  let start = performance.now(), frame = 0, phase: LandingPhase | null = null;

  const render = (time:number) => {
    lastTime = time;
    const { width, height, ratio } = size;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.shadowBlur = 0;
    context.shadowOffsetX = context.shadowOffsetY = 0;
    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);
    const box = target() ?? { x:width / 2, y:height / 2, width:1, height:1 };
    const orbitTime = time - intro.settleTime;
    const orbitReady = String(reducedMotion || !intro.orbitAfterSettle || orbitTime >= Math.max(LANDING_ORBIT.growDuration, LANDING_ORBIT.scaleDuration));
    if (canvas.dataset.orbitReady !== orbitReady) canvas.dataset.orbitReady = orbitReady;
    if (intro.orbitAfterSettle && orbitTime >= 0 && !reducedMotion) {
      for (const quad of orbitQuads(orbitTime, { width, height }, box, geometry)) {
        context.save();
        context.globalAlpha = quad.opacity;
        context.beginPath();
        quad.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
        context.closePath();
        const shade = Math.round(255 * quad.light);
        context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        context.fill();
        context.restore();
      }
      return;
    }
    const bands = intro.bands(time, { width, height }, box, geometry);
    const light = intro.illumination?.(time);
    const fill = light === undefined ? colors.frame : `rgb(${colors.opening.map((channel, index) => channel + (colors.lit[index] - channel) * light).join(', ')})`;
    const glowProgress = (time - intro.revealAt + LANDING_INTRO.glowLead) / (LANDING_INTRO.glowLead + LANDING_INTRO.glowTail);
    const glow = !reducedMotion && glowProgress > 0 && glowProgress < 1 ? Math.sin(Math.PI * glowProgress) ** 2 : 0;
    context.beginPath();
    for (const band of bands) trace(context, band);
    context.fillStyle = fill;
    context.shadowColor = `rgba(${colors.glowRgb}, ${colors.glowAlpha * glow})`;
    context.shadowBlur = (glow > 0 ? LANDING_INTRO.glowBlur * ratio : 0);
    const fillOpacity = intro.fillOpacity?.(time) ?? 1;
    context.save();
    context.globalAlpha = fillOpacity;
    context.fill('nonzero');
    context.restore();
    // One stroke pass keeps overlapping outlines crisp without accumulating opacity.
    if (fillOpacity < 1) {
      context.save();
      context.shadowBlur = 0;
      context.globalAlpha = (1 - fillOpacity) * SURFACE.wireOpacity;
      context.strokeStyle = fill;
      context.lineWidth = SURFACE.wireWidth;
      context.stroke();
      context.restore();
    }
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
    const time = (now - start) / 1000;
    render(time);
    report(time);
    if (!intro.staticAfterSettle || time < intro.settleTime) frame = requestAnimationFrame(tick);
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
      render(fixedTime ?? lastTime);
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}
