import { easeInOutCubic, easeOutCubic, frameBand, lerp, progress, type Band, type LandingIntro, type LogoGeometry, type Point, type Rect, type Viewport } from './landing-intro.ts';

/**
 * Landing intro version 2: one frame multiplies by repeated doubling along the logo's
 * isometric depth axis, ripples like pages being thumbed, then folds onto the two logo
 * frames. Every leaf is always drawn; unsplit leaves share their ancestor's place.
 */
export const MULTIPLY_INTRO = {
  /** Leaves = 2^levels. */
  levels: 4,
  depthStep: 1,
  entryStart: .1,
  entryDuration: .8,
  entryDepth: -3,
  splitStart: 1,
  splitBeat: .5,
  splitDuration: .55,
  rippleStart: 2.9,
  rippleDuration: 1.3,
  /** Lift of a rippling frame and the ripple's width, in logo units and leaves. */
  rippleLift: 2.4,
  rippleWidth: 1.6,
  collapseStart: 3.9,
  collapseDuration: .9,
  revealAt: 4.75,
  releaseStart: 5.3,
  releaseDuration: 2,
  /** Fit of the whole stack inside the viewport. */
  fit: { width:.96, height:.94 },
  /** The opening frame's height as a share of the viewport. */
  singleFrameHeight: .42,
  /** Background loop: multiply, ripple, merge back to one frame. */
  loop: { period:10, riseStart:.6, riseBeat:.55, holdUntil:6.4, fallBeat:.5, drift:.6 },
} as const;

const leaves = 2 ** MULTIPLY_INTRO.levels;
/** Ripple starts and ends this many leaves past the stack so its lift enters and leaves at zero. */
const rippleReach = MULTIPLY_INTRO.rippleWidth * 3.2;

/** Centered depth of leaf `index` when the stack has split `level` (0…levels, fractional) times. */
export function leafDepth(index:number, level:number) {
  const step = MULTIPLY_INTRO.depthStep;
  const at = (whole:number) => {
    const group = leaves / 2 ** whole;
    return (Math.floor(index / group) * group + (group - 1) / 2 - (leaves - 1) / 2) * step;
  };
  const whole = Math.min(MULTIPLY_INTRO.levels - 1, Math.floor(level));
  return lerp(at(whole), at(whole + 1), level - whole);
}

type Leaf = { depth:number; lift:number };
type Scene = { leaves:Leaf[]; scale:number; center:Point };

function fitScale(geometry:LogoGeometry, viewport:Viewport, span:number) {
  const t = MULTIPLY_INTRO;
  const frameHeight = geometry.height - geometry.offset.y;
  return Math.min(viewport.height * t.singleFrameHeight / frameHeight, viewport.width * t.fit.width / (geometry.frame.width + geometry.offset.x * span), viewport.height * t.fit.height / (frameHeight + geometry.offset.y * span + t.rippleLift));
}

/** The multiplying stack at a split level, with a ripple centered on leaf `ripple`. */
function stackScene(level:number, ripple:number, viewport:Viewport, geometry:LogoGeometry, center:Point): Scene {
  const t = MULTIPLY_INTRO;
  const depths = Array.from({ length:leaves }, (_, index) => leafDepth(index, level));
  const span = depths[leaves - 1] - depths[0];
  return {
    scale:fitScale(geometry, viewport, span), center,
    leaves:depths.map((depth, index) => ({
      depth,
      lift:t.rippleLift * Math.exp(-((index - ripple) ** 2) / (2 * t.rippleWidth ** 2)),
    })),
  };
}

function logoScene(target:Rect, geometry:LogoGeometry): Scene {
  return {
    scale:target.height / geometry.height, center:{ x:target.x + target.width / 2, y:target.y + target.height / 2 },
    leaves:Array.from({ length:leaves }, (_, index) => ({ depth:index < leaves / 2 ? -.5 : .5, lift:0 })),
  };
}

/** Blend two scenes; scale blends geometrically so zooms read evenly. */
function blend(a:Scene, b:Scene, weight:number): Scene {
  return {
    scale:a.scale * (b.scale / a.scale) ** weight,
    center:{ x:lerp(a.center.x, b.center.x, weight), y:lerp(a.center.y, b.center.y, weight) },
    leaves:a.leaves.map((leaf, index) => {
      const other = b.leaves[index];
      return { depth:lerp(leaf.depth, other.depth, weight), lift:lerp(leaf.lift, other.lift, weight) };
    }),
  };
}

const splits = (time:number, start:number, beat:number, ease:(t:number) => number) =>
  Array.from({ length:MULTIPLY_INTRO.levels }, (_, step) => ease(progress(time, start + step * beat, MULTIPLY_INTRO.splitDuration))).reduce((sum, value) => sum + value, 0);

function introScene(time:number, viewport:Viewport, geometry:LogoGeometry): Scene {
  const t = MULTIPLY_INTRO;
  const level = splits(time, t.splitStart, t.splitBeat, easeInOutCubic);
  const ripple = lerp(-rippleReach, leaves - 1 + rippleReach, progress(time, t.rippleStart, t.rippleDuration));
  const scene = stackScene(level, ripple, viewport, geometry, { x:viewport.width / 2, y:viewport.height / 2 });
  const entry = easeOutCubic(progress(time, t.entryStart, t.entryDuration));
  return { ...scene, leaves:scene.leaves.map(leaf => ({ ...leaf, depth:leaf.depth + t.entryDepth * (1 - entry) })) };
}

/** Seamless background loop: one frame multiplies, ripples, then merges back to one. */
function loopScene(time:number, viewport:Viewport, geometry:LogoGeometry): Scene {
  const { loop, levels } = MULTIPLY_INTRO;
  const local = ((time % loop.period) + loop.period) % loop.period;
  const rise = splits(local, loop.riseStart, loop.riseBeat, easeInOutCubic);
  const fall = splits(local, loop.holdUntil, loop.fallBeat, easeInOutCubic);
  const level = Math.max(0, rise - fall);
  const ripplePeriod = (loop.holdUntil - loop.riseStart - levels * loop.riseBeat) / 1.5;
  const ripple = lerp(-rippleReach, leaves - 1 + rippleReach, ((local - loop.riseStart - levels * loop.riseBeat) / ripplePeriod) % 1);
  const angle = 2 * Math.PI * local / loop.period;
  const center = { x:viewport.width / 2 + Math.sin(angle) * viewport.width * .02 * loop.drift, y:viewport.height / 2 + Math.cos(angle) * viewport.height * .02 * loop.drift };
  return stackScene(level, local > loop.riseStart + levels * loop.riseBeat && local < loop.holdUntil ? ripple : -rippleReach, viewport, geometry, center);
}

function sceneBands(scene:Scene, geometry:LogoGeometry): Band[] {
  const origin = { x:scene.center.x - geometry.width / 2 * scene.scale, y:scene.center.y - geometry.height / 2 * scene.scale };
  return scene.leaves.map(leaf => {
    return frameBand(geometry, { x:origin.x, y:origin.y - leaf.lift * scene.scale }, leaf.depth + .5, scene.scale);
  });
}

export const multiplySettleTime = MULTIPLY_INTRO.releaseStart + MULTIPLY_INTRO.releaseDuration;

export function multiplyBands(time:number, viewport:Viewport, target:Rect, geometry:LogoGeometry): Band[] {
  const t = MULTIPLY_INTRO;
  const logo = logoScene(target, geometry);
  if (time < t.releaseStart) return sceneBands(blend(introScene(time, viewport, geometry), logo, easeInOutCubic(progress(time, t.collapseStart, t.collapseDuration))), geometry);
  return sceneBands(blend(logo, loopScene(time - t.releaseStart, viewport, geometry), easeInOutCubic(progress(time, t.releaseStart, t.releaseDuration))), geometry);
}

/** Version 2 (default): one frame multiplies along the depth axis. */
export const multiplyIntro: LandingIntro = { revealAt:MULTIPLY_INTRO.revealAt, settleTime:multiplySettleTime, bands:multiplyBands };
