import type { GalleryFrame } from './model.ts';

/** Traverse saved versions, skipping prompt captures and duplicate pushes of one version. */
export function adjacentPrototypeFrames(frames: GalleryFrame[], version: number) {
  const pushes = new Map<number, GalleryFrame>();
  for (const frame of frames) if (frame.kind === 'push') {
    const previous = pushes.get(frame.version);
    if (!previous || frame.timestamp > previous.timestamp) pushes.set(frame.version, frame);
  }
  const ordered = [...pushes.values()].sort((a, b) => a.version - b.version);
  return { previous:ordered.filter(frame => frame.version < version).at(-1) ?? null, next:ordered.find(frame => frame.version > version) ?? null };
}

/** The current working frame and newest pushed snapshot are entry points to live code. */
export function liveFrameIds(frames: GalleryFrame[]): Set<string> {
  const latest = frames.reduce<GalleryFrame | undefined>((last, frame) => !last || frame.timestamp >= last.timestamp ? frame : last, undefined);
  const push = frames.filter(frame => frame.kind === 'push').reduce<GalleryFrame | undefined>((last, frame) => !last || (frame.number ?? -1) > (last.number ?? -1) ? frame : last, undefined);
  return new Set([latest?.id, push?.id].filter((id): id is string => !!id));
}
