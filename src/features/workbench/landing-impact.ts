import { easeInCubic, easeInOutCubic, easeOutCubic, frameBand, lerp, progress, type Band, type LandingIntro, type LogoGeometry, type Point, type Rect, type Viewport } from './landing-intro.ts';

/**
 * Landing intro version 3: a fixed set of white frames (no multiplying) is thrown from the
 * camera onto an isometric pile, which then drops a long way in scale onto the logo. In the
 * loop frames are flung back past the camera. Every move eases; nothing overshoots.
 */
export const IMPACT_INTRO = {
  frames: 7,
  /** Depth offsets between piled frames; wide enough that white frames never touch. */
  depthStep: 2.9,
  /** A thrown frame starts this many times larger than its slot. */
  throwScale: 16,
  /** Where each throw enters from, as a share of the viewport, cycling per frame. */
  entryOffsets: [[-.34, .28], [.3, -.24], [-.18, -.32], [.36, .2], [-.3, -.08], [.12, .34], [0, -.2]] as const,
  throwStart: .15,
  throwStagger: .3,
  throwDuration: .7,
  fit: { width:.8, height:.8 },
  /** The pile's eased fall onto the logo, with frames gathering onto the two logo slots. */
  dropStart: 2.95,
  dropDuration: 1,
  revealAt: 3.95,
  releaseStart: 4.5,
  flingStagger: .12,
  flingDuration: .6,
  loop: { period:7.5, holdUntil:4.4, drift:.02 },
} as const;

const t = IMPACT_INTRO;
const count = t.frames;

/** Perspective magnification of a frame thrown at `start`: eases from `throwScale` to 1. Null before the throw. */
export function throwMagnification(time:number, start:number) {
  if (time < start) return null;
  return t.throwScale ** (1 - easeOutCubic(progress(time, start, t.throwDuration)));
}

/** Magnification of a frame flung at `start` back past the camera. Null once it has passed. */
function flingMagnification(time:number, start:number) {
  if (time >= start + t.flingDuration) return null;
  return t.throwScale ** easeInCubic(progress(time, start, t.flingDuration));
}

function pileScale(geometry:LogoGeometry, viewport:Viewport) {
  const span = (count - 1) * t.depthStep;
  return Math.min(viewport.width * t.fit.width / (geometry.frame.width + geometry.offset.x * span), viewport.height * t.fit.height / (geometry.height - geometry.offset.y + geometry.offset.y * span));
}

type Body = { depth:number; magnification:number; vanish:Point };

/** Project the frame at `depth` on the stage plane, then magnify it about `vanish`. */
function bodyBand(body:Body, center:Point, scale:number, geometry:LogoGeometry): Band {
  const origin = { x:center.x - geometry.width / 2 * scale, y:center.y - geometry.height / 2 * scale };
  const band = frameBand(geometry, origin, body.depth + .5, scale);
  const m = body.magnification, px = (x:number) => body.vanish.x + (x - body.vanish.x) * m, py = (y:number) => body.vanish.y + (y - body.vanish.y) * m;
  return {
    x0:px(band.x0), x1:px(band.x1), topHinge:px(band.topHinge), bottomHinge:px(band.bottomHinge),
    top:band.top.map(py) as Band['top'], bottom:band.bottom.map(py) as Band['bottom'],
  };
}

const pileDepth = (index:number) => (index - (count - 1) / 2) * t.depthStep;
const logoDepth = (index:number) => index < count / 2 ? -.5 : .5;
const entryPoint = (index:number, viewport:Viewport, center:Point) => {
  const [dx, dy] = t.entryOffsets[index % t.entryOffsets.length];
  return { x:center.x + dx * viewport.width, y:center.y + dy * viewport.height };
};

export const impactLoopStart = t.releaseStart + (count - 1) * t.flingStagger + t.flingDuration;
/** Settles once the first loop pile has landed, so captures show it under the scrim. */
export const impactSettleTime = impactLoopStart + t.throwStart + (count - 1) * t.throwStagger + t.throwDuration + .3;

export function impactBands(time:number, viewport:Viewport, target:Rect, geometry:LogoGeometry): Band[] {
  const screen = { x:viewport.width / 2, y:viewport.height / 2 };
  const album = pileScale(geometry, viewport);
  const final = target.height / geometry.height;
  const logoCenter = { x:target.x + target.width / 2, y:target.y + target.height / 2 };
  const bands: Band[] = [];

  if (time < t.releaseStart) {
    // The pile eases a long way down in scale onto the logo while frames gather onto its two slots.
    const drop = easeInOutCubic(progress(time, t.dropStart, t.dropDuration));
    const scale = album * (final / album) ** drop, center = { x:lerp(screen.x, logoCenter.x, drop), y:lerp(screen.y, logoCenter.y, drop) };
    for (let index = 0; index < count; index += 1) {
      const magnification = throwMagnification(time, t.throwStart + index * t.throwStagger);
      if (magnification === null) continue;
      bands.push(bodyBand({ depth:lerp(pileDepth(index), logoDepth(index), drop), magnification, vanish:entryPoint(index, viewport, screen) }, center, scale, geometry));
    }
    return bands;
  }

  if (time < impactLoopStart) {
    // Release: the logo's frames are flung back past the camera, front first, bursting around the logo.
    for (let index = 0; index < count; index += 1) {
      const magnification = flingMagnification(time, t.releaseStart + (count - 1 - index) * t.flingStagger);
      if (magnification === null) continue;
      bands.push(bodyBand({ depth:logoDepth(index), magnification, vanish:entryPoint(index, viewport, logoCenter) }, logoCenter, final, geometry));
    }
    return bands;
  }

  // Loop: throw the pile in, hold, fling it out front first, repeat.
  const local = (time - impactLoopStart) % t.loop.period;
  const angle = 2 * Math.PI * local / t.loop.period;
  const center = { x:screen.x + Math.sin(angle) * viewport.width * t.loop.drift, y:screen.y + Math.cos(angle) * viewport.height * t.loop.drift };
  for (let index = 0; index < count; index += 1) {
    const magnification = local < t.loop.holdUntil
      ? throwMagnification(local, t.throwStart + index * t.throwStagger)
      : flingMagnification(local, t.loop.holdUntil + (count - 1 - index) * t.flingStagger);
    if (magnification === null) continue;
    bands.push(bodyBand({ depth:pileDepth(index), magnification, vanish:entryPoint(index, viewport, center) }, center, album, geometry));
  }
  return bands;
}

/** Version 3: thrown white frames and a drastic eased scale drop onto the logo. */
export const impactIntro: LandingIntro = { revealAt:t.revealAt, settleTime:impactSettleTime, bands:impactBands };
