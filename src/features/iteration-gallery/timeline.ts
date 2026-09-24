import type { GalleryFrame } from './model';
import { galleryTokens as t } from './tokens.ts';

export type TimelineInput = Pick<GalleryFrame, 'id' | 'version'> & { enabled?: boolean; branch?: string | null };

/** Each version occupies one equal slot; its captured commits subdivide that slot. */
export function buildTimeline(frames: TimelineInput[]) {
  const groups = new Map<number, { id: string; index: number; enabled: boolean; branch: string | null }[]>();
  let playable = 0;
  frames.forEach(frame => {
    if (!groups.has(frame.version)) groups.set(frame.version, []);
    const enabled = frame.enabled !== false;
    groups.get(frame.version)!.push({ id: frame.id, index: enabled ? playable++ : -1, enabled, branch: frame.branch ?? null });
  });
  const gap = t.blockGap * t.timeline.gapScale;
  const span = Math.max(t.versionDepth, groups.size * t.versionDepth) - gap;
  const blockDepth = t.versionDepth - gap;
  const contentDepth = blockDepth - 2 * t.timeline.inlinePadding;
  const versions = [...groups].sort(([a], [b]) => a - b).map(([number, items], slot) => ({
    number, enabled: items.some(item => item.enabled), branch: timelineBranch(items),
    start: slot * t.versionDepth / span, end: (slot * t.versionDepth + blockDepth) / span,
    marks: items.map((item, i) => ({ ...item,
      position: (slot * t.versionDepth + t.timeline.inlinePadding + (i + .5) * contentDepth / items.length) / span })),
  }));
  return { versions, marks: versions.flatMap(version => version.marks) };
}

/** A version block uses the branch of its frames when they leave the checked-out branch. */
export function timelineBranch(frames: { branch?: string | null }[], active = 'main') {
  return frames.map(frame => frame.branch).find(branch => branch && branch !== active) ?? active;
}

/** The selected range's label sits where out-of-range blocks meet playable ones. */
export function timelineRangeLabelAt(versions: { enabled: boolean; start: number }[]) {
  const disabled = versions.find(version => !version.enabled);
  const enabled = versions.find(version => version.enabled);
  if (!disabled || !enabled) return null;
  return disabled.start < enabled.start ? enabled.start : disabled.start;
}

export function nearestTimelineFrame(marks: { index: number; position: number }[], position: number) {
  const playable = marks.filter(mark => mark.index >= 0);
  return playable.reduce<(typeof playable)[number] | undefined>((best, mark) =>
    !best || Math.abs(mark.position - position) < Math.abs(best.position - position) ? mark : best, undefined)?.index ?? 0;
}

/** A pointer inside an out-of-range block cannot move the playhead. */
export function timelinePointerIndex(timeline: ReturnType<typeof buildTimeline>, position: number) {
  const block = timeline.versions.find(version => position >= version.start && position <= version.end);
  if (block && !block.enabled) return null;
  if (!timeline.marks.some(mark => mark.index >= 0)) return null;
  return nearestTimelineFrame(timeline.marks, position);
}

/** Skip only to real push captures within the current filtered sequence. */
export function adjacentPushIndex(frames: Pick<GalleryFrame, 'kind'>[], index: number, direction: -1 | 1) {
  for (let next = index + direction; next >= 0 && next < frames.length; next += direction) {
    if (frames[next].kind === 'push') return next;
  }
  return null;
}
