import type { GalleryFrame } from './model';

/** Each version occupies one equal slot; its captured commits subdivide that slot. */
export function buildTimeline(frames: Pick<GalleryFrame, 'id' | 'version'>[]) {
  const groups = new Map<number, { id: string; index: number }[]>();
  frames.forEach((frame, index) => {
    if (!groups.has(frame.version)) groups.set(frame.version, []);
    groups.get(frame.version)!.push({ id: frame.id, index });
  });
  const versions = [...groups].sort(([a], [b]) => a - b).map(([number, items], slot) => ({
    number, start: slot / groups.size, end: (slot + 1) / groups.size,
    marks: items.map((item, i) => ({ ...item, position: (slot + (i + .5) / items.length) / groups.size })),
  }));
  return { versions, marks: versions.flatMap(version => version.marks) };
}

export function nearestTimelineFrame(marks: { index: number; position: number }[], position: number) {
  return marks.reduce<(typeof marks)[number] | undefined>((best, mark) =>
    !best || Math.abs(mark.position - position) < Math.abs(best.position - position) ? mark : best, undefined)?.index ?? 0;
}

/** Skip only to real push captures within the current filtered sequence. */
export function adjacentPushIndex(frames: Pick<GalleryFrame, 'kind'>[], index: number, direction: -1 | 1) {
  for (let next = index + direction; next >= 0 && next < frames.length; next += direction) {
    if (frames[next].kind === 'push') return next;
  }
  return null;
}
