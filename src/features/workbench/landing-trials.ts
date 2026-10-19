import { easeInOutCubic, easeOutCubic, frameBand, lerp, progress, type Band, type LandingIntro, type LogoGeometry, type Point, type Rect, type Viewport } from './landing-intro.ts';

/**
 * Landing trials: white frames flattening into one frame (`flatten`) or one frame unfolding
 * into many (`unfold`). Both settle onto the two logo frames and loop between a spread
 * stack and a single frame under the scrim. Every move eases; nothing overshoots.
 */
export const TRIAL_INTRO = {
  frames: 7,
  /** Depth offsets between spread frames; wide enough that white frames never touch. */
  depthStep: 3.2,
  fit: { width:.8, height:.8 },
  /** The single frame's height as a share of the viewport. */
  singleFrameHeight: .46,
  flatten: { arriveStart:.15, arriveStagger:.1, arriveDuration:1, arriveDepth:-20, flattenStart:2, flattenDuration:1.2, logoStart:3.4, logoDuration:1, revealAt:4.35, releaseStart:4.9 },
  unfold: { enterStart:.1, enterDuration:1.1, enterScale:12, unfoldStart:1.4, unfoldStagger:.07, unfoldDuration:1.2, logoStart:3.3, logoDuration:1, revealAt:4.25, releaseStart:4.8 },
  releaseDuration: 1.6,
  /** Loop: spread → flatten → hold one frame → unfold → hold spread. */
  loop: { period:8, flattenAt:1.6, oneAt:4.6, duration:1.4, drift:.02 },
} as const;

const t = TRIAL_INTRO;
const count = t.frames;
type Scene = { depths:number[]; scale:number; center:Point };

const slot = (index:number) => (index - (count - 1) / 2) * t.depthStep;
const frameHeight = (geometry:LogoGeometry) => geometry.height - geometry.offset.y;
const spreadScale = (geometry:LogoGeometry, viewport:Viewport) => {
  const span = (count - 1) * t.depthStep;
  return Math.min(viewport.width * t.fit.width / (geometry.frame.width + geometry.offset.x * span), viewport.height * t.fit.height / (frameHeight(geometry) + geometry.offset.y * span));
};
const singleScale = (geometry:LogoGeometry, viewport:Viewport) => Math.min(viewport.height * t.singleFrameHeight / frameHeight(geometry), viewport.width * t.fit.width / geometry.frame.width);

/** `flat` 0 = spread stack, 1 = every frame flattened onto one. Scale eases geometrically between them. */
export function flatScene(flat:number, viewport:Viewport, geometry:LogoGeometry, center:Point = { x:viewport.width / 2, y:viewport.height / 2 }): Scene {
  const spread = spreadScale(geometry, viewport);
  return { depths:Array.from({ length:count }, (_, index) => slot(index) * (1 - flat)), scale:spread * (singleScale(geometry, viewport) / spread) ** flat, center };
}

function logoScene(target:Rect, geometry:LogoGeometry): Scene {
  return { depths:Array.from({ length:count }, (_, index) => index < count / 2 ? -.5 : .5), scale:target.height / geometry.height, center:{ x:target.x + target.width / 2, y:target.y + target.height / 2 } };
}

function blend(a:Scene, b:Scene, weight:number): Scene {
  return {
    depths:a.depths.map((depth, index) => lerp(depth, b.depths[index], weight)),
    scale:a.scale * (b.scale / a.scale) ** weight,
    center:{ x:lerp(a.center.x, b.center.x, weight), y:lerp(a.center.y, b.center.y, weight) },
  };
}

function sceneBands(scene:Scene, geometry:LogoGeometry): Band[] {
  const origin = { x:scene.center.x - geometry.width / 2 * scene.scale, y:scene.center.y - geometry.height / 2 * scene.scale };
  return scene.depths.map(depth => frameBand(geometry, origin, depth + .5, scene.scale));
}

function loopScene(local:number, viewport:Viewport, geometry:LogoGeometry) {
  const { loop } = t;
  const time = ((local % loop.period) + loop.period) % loop.period;
  const flat = easeInOutCubic(progress(time, loop.flattenAt, loop.duration)) - easeInOutCubic(progress(time, loop.oneAt, loop.duration));
  const angle = 2 * Math.PI * time / loop.period;
  return flatScene(flat, viewport, geometry, { x:viewport.width / 2 + Math.sin(angle) * viewport.width * loop.drift, y:viewport.height / 2 + Math.cos(angle) * viewport.height * loop.drift });
}

function trial(intro:(time:number, viewport:Viewport, geometry:LogoGeometry) => Scene, timing:{ logoStart:number; logoDuration:number; revealAt:number; releaseStart:number }, loopOffset:number): LandingIntro {
  return {
    revealAt:timing.revealAt,
    settleTime:timing.releaseStart + t.releaseDuration + .2,
    bands(time, viewport, target, geometry) {
      const logo = logoScene(target, geometry);
      const scene = time < timing.releaseStart
        ? blend(intro(time, viewport, geometry), logo, easeInOutCubic(progress(time, timing.logoStart, timing.logoDuration)))
        : blend(logo, loopScene(time - timing.releaseStart + loopOffset, viewport, geometry), easeInOutCubic(progress(time, timing.releaseStart, t.releaseDuration)));
      return sceneBands(scene, geometry);
    },
  };
}

/** Trial: frames slide in along the depth axis, then flatten into one frame that becomes the logo. */
export const flattenIntro = trial((time, viewport, geometry) => {
  const f = t.flatten;
  const scene = flatScene(easeInOutCubic(progress(time, f.flattenStart, f.flattenDuration)), viewport, geometry);
  return { ...scene, depths:scene.depths.map((depth, index) => depth + f.arriveDepth * (1 - easeOutCubic(progress(time, f.arriveStart + (count - 1 - index) * f.arriveStagger, f.arriveDuration)))) };
}, t.flatten, 0);

/** Trial (reverse): one frame eases in from a drastic scale, then unfolds into many before settling on the logo. */
export const unfoldIntro = trial((time, viewport, geometry) => {
  const u = t.unfold;
  const unfold = easeInOutCubic(progress(time, u.unfoldStart, u.unfoldDuration));
  const spread = flatScene(0, viewport, geometry), single = flatScene(1, viewport, geometry);
  const enter = u.enterScale ** (1 - easeOutCubic(progress(time, u.enterStart, u.enterDuration)));
  return {
    ...blend(single, spread, unfold),
    scale:single.scale * (spread.scale / single.scale) ** unfold * enter,
    depths:spread.depths.map((depth, index) => depth * easeInOutCubic(progress(time, u.unfoldStart + Math.abs(index - (count - 1) / 2) * u.unfoldStagger, u.unfoldDuration))),
  };
}, t.unfold, t.loop.oneAt - t.loop.duration);
