import type { FramePlane } from './geometry.ts';
import { galleryTokens as t } from './tokens.ts';

type Point = { x: number; depth: number };

/** Cumulative values share one scale; branch runs partition that area without restarting it. */
export function tokenUsageArea(planes: FramePlane[]) {
  const active = planes.filter(plane => plane.active).sort((a, b) => a.frame.timestamp - b.frame.timestamp);
  const total = active.reduce((sum, plane) => sum + (plane.frame.tokenUsage?.total ?? 0), 0);
  const baseline = active.length ? Math.min(...active.map(plane => plane.x)) : 0;
  const height = active.length ? Math.max(...active.map(plane => plane.width)) : 0;
  let cumulative = 0;
  const samples = active.map(plane => {
    cumulative += plane.frame.tokenUsage?.total ?? 0;
    return { plane, cumulative, ratio: total ? cumulative / total : 0, branch: plane.frame.branch ?? 'main' };
  });
  const first = active[0], last = active.at(-1);
  // The end frames, not the block edges or hit regions, define the area footprint.
  const start = first?.depth ?? 0, end = last?.depth ?? start;
  const top: Point[] = samples.map(sample => ({ x: baseline + height * sample.ratio, depth: sample.plane.depth }));
  const outline = first && last && total > 0 ? [
    { x: baseline, depth: start }, ...top, { x: baseline, depth: end },
  ] : [];
  const segments: { branch: string; outline: Point[] }[] = [];
  if (outline.length) {
    let runStart = 0;
    for (let i = 0; i < samples.length; i++) {
      if (i < samples.length - 1 && samples[i].branch === samples[i + 1].branch) continue;
      const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, depth: (a.depth + b.depth) / 2 });
      const left = runStart ? midpoint(top[runStart - 1], top[runStart]) : top[0];
      const right = i < samples.length - 1 ? midpoint(top[i], top[i + 1]) : top[i];
      segments.push({ branch: samples[i].branch, outline: [
        { x: baseline, depth: left.depth }, left, ...top.slice(runStart, i + 1), right, { x: baseline, depth: right.depth },
      ] });
      runStart = i + 1;
    }
  }
  const spacing = active.slice(1).map((plane, i) => Math.abs(plane.depth - active[i].depth)).filter(value => value > 0);
  const barWidth = Math.min(t.tokenUsage.barWidth, ...spacing.map(value => value * t.tokenUsage.barSpacingRatio));
  const bars = total > 0 ? samples.map(sample => ({ ...sample,
    width: barWidth, height: height * sample.ratio,
  })) : [];
  return { total, baseline, height, samples, outline, segments, bars };
}
