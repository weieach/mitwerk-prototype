import type { GalleryFrame } from './model';

/** The current working frame and newest pushed snapshot are entry points to live code. */
export function liveFrameIds(frames: GalleryFrame[]): Set<string> {
  const latest = frames.reduce<GalleryFrame | undefined>((last, frame) => !last || frame.timestamp >= last.timestamp ? frame : last, undefined);
  const push = frames.filter(frame => frame.kind === 'push').reduce<GalleryFrame | undefined>((last, frame) => !last || (frame.number ?? -1) > (last.number ?? -1) ? frame : last, undefined);
  return new Set([latest?.id, push?.id].filter((id): id is string => !!id));
}
