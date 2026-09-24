import { versionKeepsPush, type GalleryFrame } from './model.ts';
import { galleryTokens as t } from './tokens.ts';

export type TimelineInput = Pick<GalleryFrame, 'id' | 'version'> & { enabled?: boolean; branch?: string | null; kind?: GalleryFrame['kind'] };

/** Each version occupies one equal slot; its captured commits subdivide that slot. */
export function buildTimeline(frames: TimelineInput[]) {
  const groups = new Map<number, { id: string; index: number; enabled: boolean; branch: string | null; kind?: GalleryFrame['kind'] }[]>();
  frames.forEach(frame => {
    if (!groups.has(frame.version)) groups.set(frame.version, []);
    groups.get(frame.version)!.push({ id: frame.id, index: -1, enabled: frame.enabled !== false, branch: frame.branch ?? null, kind: frame.kind });
  });
  const showPush = new Map([...groups].map(([version, items]) => [version, versionKeepsPush(items)]));
  let playable = 0;
  for (const [version, items] of groups) for (const item of items) {
    if (item.enabled && (item.kind !== 'push' || showPush.get(version))) item.index = playable++;
  }
  const gap = t.blockGap * t.timeline.gapScale;
  const span = Math.max(t.versionDepth, groups.size * t.versionDepth) - gap;
  const blockDepth = t.versionDepth - gap;
  const contentDepth = blockDepth - 2 * t.timeline.inlinePadding;
  const versions = [...groups].sort(([a], [b]) => a - b).map(([number, items], slot) => ({
    number, enabled: items.some(item => item.enabled), branch: timelineBranch(items),
    start: slot * t.versionDepth / span, end: (slot * t.versionDepth + blockDepth) / span,
    marks: items.filter(item => item.kind !== 'push' || showPush.get(number)).map((item, i, gallery) => ({ ...item,
      position: (slot * t.versionDepth + t.timeline.inlinePadding + (i + .5) * contentDepth / Math.max(1, gallery.length)) / span })),
  }));
  const pushes = versions.map((version, i) => {
    const push = [...groups].sort(([a], [b]) => a - b)[i][1].filter(item => item.kind === 'push').at(-1);
    return { version: version.number, start: version.end, end: versions[i + 1]?.start ?? version.end + gap / span,
      index: null, frameId: push?.id ?? null, floating: i === versions.length - 1 };
  });
  return { versions, marks: versions.flatMap(version => version.marks), pushes };
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
  const push = timeline.pushes.find(node => position >= node.start && position < node.end);
  if (push) return push.index;
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
