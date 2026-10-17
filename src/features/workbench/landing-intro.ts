/**
 * Landing intro geometry. Every frame is the `logo-shape-part.svg` parallelogram; the
 * stacked depth offset comes from how `logo-shape.svg` layers two of those frames.
 * Bands, album and logo are one band description, so the sequence morphs continuously.
 * Frames are flat complete white: no strokes, gradients, tone, shadow or blur; only a white glow.
 */
export type Point = { x:number; y:number };
export type Rect = { x:number; y:number; width:number; height:number };
/** A vertical-edged parallelogram: left edge at x=0, right edge at x=width. */
export type FrameShape = { width:number; topLeft:number; topRight:number; bottomLeft:number; bottomRight:number };
export type LogoGeometry = { frame:FrameShape; offset:Point; width:number; height:number; path:string };
/** A band sliced vertically: top and bottom polylines share x0/x1 and each bend at their own hinge. */
export type Band = { x0:number; x1:number; topHinge:number; bottomHinge:number; top:[number, number, number]; bottom:[number, number, number] };
export type LandingPhase = 'playing' | 'revealed' | 'settled';
export type Viewport = { width:number; height:number };
/** A landing intro variant: bands over time, plus when the brand reveals and the loop settles. */
export type LandingIntro = { revealAt:number; settleTime:number; bands:(time:number, viewport:Viewport, target:Rect, geometry:LogoGeometry) => Band[] };

export const LANDING_INTRO = {
  bands: 13,
  margin: .08,
  /** Stacking: bands drop in from above, bottom first, one rhythm beat apart. */
  stackStart: .2,
  stackStagger: .07,
  stackFall: .75,
  /** Traveling bulge through the stack, after the attached rhythm reference. */
  waveFloor: .12,
  wavePower: 2.6,
  waveBandsPerSecond: 1.9,
  waveDrop: 1.25,
  bandThin: .12,
  bandThick: .26,
  topHinge: .7,
  bottomHinge: .34,
  /** Bands open into isometric frames at album scale, then collapse onto the two logo frames. */
  albumStart: 2.2,
  albumDuration: 1.1,
  albumDepth: [-1.2, 2.2] as const,
  albumFill: { width:.5, height:.6 },
  collapseStart: 3.1,
  collapseDuration: .9,
  revealAt: 3.95,
  /** After the logo lands, the stack exhales back into the looping bands under the scrim. */
  releaseStart: 4.6,
  releaseDuration: 2,
  /** Render: one white glow around the white shapes (no shader, grain, trail or blur). */
  glowBlur: 26,
  pixelRatio: 2,
} as const;

export const settleTime = LANDING_INTRO.releaseStart + LANDING_INTRO.releaseDuration;

export const clamp01 = (value:number) => Math.min(1, Math.max(0, value));
export const lerp = (a:number, b:number, t:number) => a + (b - a) * t;
export const easeOutCubic = (t:number) => 1 - (1 - t) ** 3;
export const easeInCubic = (t:number) => t ** 3;
export const easeInOutCubic = (t:number) => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
export const progress = (time:number, start:number, duration:number) => clamp01((time - start) / duration);

export function svgPathData(svg:string) {
  const match = /\sd="([^"]+)"/.exec(svg);
  if (!match) throw new Error('SVG has no path data');
  return match[1];
}

/** Vertices of an SVG path built from M/L/H/V/Z commands (absolute or relative). */
export function pathPoints(d:string): Point[] {
  const tokens = d.match(/[MLHVZmlhvz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const points: Point[] = [];
  let x = 0, y = 0, command = 'M', index = 0;
  const number = () => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/[a-z]/i.test(tokens[index])) command = tokens[index++];
    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case 'M': case 'L': { const nx = number(), ny = number(); x = relative ? x + nx : nx; y = relative ? y + ny : ny; break; }
      case 'H': { const nx = number(); x = relative ? x + nx : nx; break; }
      case 'V': { const ny = number(); y = relative ? y + ny : ny; break; }
      case 'Z': continue;
      default: throw new Error(`Unsupported path command ${command}`);
    }
    if (!points.some(point => Math.abs(point.x - x) < 1e-6 && Math.abs(point.y - y) < 1e-6)) points.push({ x, y });
  }
  return points;
}

function bounds(points:Point[]) {
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  return { minX:Math.min(...xs), maxX:Math.max(...xs), minY:Math.min(...ys), maxY:Math.max(...ys) };
}

/** Derive the frame and the logo's stacking offset from the two SVG assets. */
export function logoGeometry(partSvg:string, logoSvg:string): LogoGeometry {
  const part = pathPoints(svgPathData(partSvg));
  const partBox = bounds(part);
  const edge = (x:number) => part.filter(point => Math.abs(point.x - x) < 1e-3).map(point => point.y - partBox.minY);
  const left = edge(partBox.minX), right = edge(partBox.maxX);
  const frame: FrameShape = {
    width:partBox.maxX - partBox.minX,
    topLeft:Math.min(...left), bottomLeft:Math.max(...left),
    topRight:Math.min(...right), bottomRight:Math.max(...right),
  };
  const path = svgPathData(logoSvg);
  const logoBox = bounds(pathPoints(path));
  const width = logoBox.maxX - logoBox.minX, height = logoBox.maxY - logoBox.minY;
  return { frame, offset:{ x:width - frame.width, y:height - (partBox.maxY - partBox.minY) }, width, height, path };
}

/** One logo frame at `depth` logo offsets from frame A, with the logo's top-left at `origin`. */
export function frameBand(geometry:LogoGeometry, origin:Point, depth:number, scale:number): Band {
  const { frame, offset } = geometry;
  const x0 = origin.x + offset.x * depth * scale, x1 = x0 + frame.width * scale;
  const y = origin.y + offset.y * depth * scale;
  const topL = y + frame.topLeft * scale, topR = y + frame.topRight * scale;
  const bottomL = y + frame.bottomLeft * scale, bottomR = y + frame.bottomRight * scale;
  const t = LANDING_INTRO;
  return {
    x0, x1, topHinge:lerp(x0, x1, t.topHinge), bottomHinge:lerp(x0, x1, t.bottomHinge),
    top:[topL, lerp(topL, topR, t.topHinge), topR], bottom:[bottomL, lerp(bottomL, bottomR, t.bottomHinge), bottomR],
  };
}

/** Drop profile (left, hinge, right) as a share of each band's swell drop, mirrored from the rhythm reference. */
const topDrop = [.75, -.15, 0] as const, bottomDrop = [.85, .85, 0] as const;
const along = (profile:readonly [number, number, number], hinge:number, f:number) => f <= hinge ? lerp(profile[0], profile[1], f / hinge) : lerp(profile[1], profile[2], (f - hinge) / (1 - hinge));

/** The looping stack. Spacing opens around the traveling bulge so neighboring bands never overlap. */
function stackBands(time:number, viewport:Viewport): Band[] {
  const t = LANDING_INTRO;
  const pitch = viewport.height / (t.bands + 1);
  const x0 = viewport.width * t.margin, x1 = viewport.width * (1 - t.margin), width = x1 - x0;
  const shapes = Array.from({ length:t.bands }, (_, index) => {
    const swell = t.waveFloor + (1 - t.waveFloor) * (.5 + .5 * Math.cos(2 * Math.PI * (index - time * t.waveBandsPerSecond) / t.bands)) ** t.wavePower;
    const breathe = Math.sin(time * .7 + index * .9) * .03;
    return { swell, drop:pitch * t.waveDrop * swell, half:pitch * (t.bandThin + t.bandThick * swell) / 2, topHinge:t.topHinge + breathe, bottomHinge:t.bottomHinge - breathe };
  });
  const clearances = shapes.slice(1).map((next, index) => {
    const band = shapes[index];
    const overhang = Math.max(0, ...[0, band.bottomHinge, next.topHinge, 1].map(f => band.drop * along(bottomDrop, band.bottomHinge, f) - next.drop * along(topDrop, next.topHinge, f)));
    return band.half + next.half + overhang;
  });
  const slack = Math.max(0, (pitch * (t.bands - 1) - clearances.reduce((sum, value) => sum + value, 0)) / (t.bands - 1));
  let settled = pitch;
  return shapes.map((band, index) => {
    if (index) settled += clearances[index - 1] + slack;
    const fall = easeOutCubic(progress(time, t.stackStart + (t.bands - 1 - index) * t.stackStagger, t.stackFall));
    const rest = settled - (1 - fall) * (viewport.height + settled + pitch);
    return {
      x0, x1, topHinge:x0 + width * band.topHinge, bottomHinge:x0 + width * band.bottomHinge,
      top:topDrop.map(share => rest - band.half + share * band.drop) as Band['top'],
      bottom:bottomDrop.map(share => rest + band.half + share * band.drop) as Band['bottom'],
    };
  });
}

/** Album (0→1) and collapse (0→1) weights; both reverse during the release. */
export function introWeights(time:number) {
  const t = LANDING_INTRO;
  const release = 1 - easeInOutCubic(progress(time, t.releaseStart, t.releaseDuration));
  return {
    album:easeInOutCubic(progress(time, t.albumStart, t.albumDuration)) * release,
    collapse:easeInOutCubic(progress(time, t.collapseStart, t.collapseDuration)) * release,
  };
}

export function landingPhase(time:number, intro:Pick<LandingIntro, 'revealAt' | 'settleTime'> = stackIntro): LandingPhase {
  return time >= intro.settleTime ? 'settled' : time >= intro.revealAt ? 'revealed' : 'playing';
}

/** Every band at `time`, in painter order (back to front). `target` is the logo's on-screen box. */
export function landingBands(time:number, viewport:Viewport, target:Rect, geometry:LogoGeometry): Band[] {
  const t = LANDING_INTRO;
  const { album, collapse } = introWeights(time);
  const [depthBack, depthFront] = t.albumDepth;
  const span = { width:geometry.frame.width + geometry.offset.x * (depthFront - depthBack), height:geometry.height + geometry.offset.y * (depthFront - depthBack - 1) };
  const big = Math.min(viewport.width * t.albumFill.width / span.width, viewport.height * t.albumFill.height / span.height);
  const final = target.height / geometry.height;
  const scale = big * (final / big) ** collapse;
  const center = { x:lerp(viewport.width / 2, target.x + target.width / 2, collapse), y:lerp(viewport.height / 2, target.y + target.height / 2, collapse) };
  const origin = { x:center.x - geometry.width / 2 * scale, y:center.y - geometry.height / 2 * scale };
  return stackBands(time, viewport).map((stack, index) => {
    const depth = lerp(lerp(depthBack, depthFront, index / (t.bands - 1)), index < t.bands / 2 ? 0 : 1, collapse);
    const frame = frameBand(geometry, origin, depth, scale);
    const mix = (a:number, b:number) => lerp(a, b, album);
    return {
      x0:mix(stack.x0, frame.x0), x1:mix(stack.x1, frame.x1),
      topHinge:mix(stack.topHinge, frame.topHinge), bottomHinge:mix(stack.bottomHinge, frame.bottomHinge),
      top:stack.top.map((y, i) => mix(y, frame.top[i])) as Band['top'],
      bottom:stack.bottom.map((y, i) => mix(y, frame.bottom[i])) as Band['bottom'],
    };
  });
}

/** Version 1: a vertical stack of bands, after the prompt #303 rhythm reference. */
export const stackIntro: LandingIntro = { revealAt:LANDING_INTRO.revealAt, settleTime, bands:landingBands };
