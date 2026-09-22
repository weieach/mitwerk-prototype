import { captureSummaryMaxLength } from '../../shared/capture-format.mjs';
import type { Capture, GalleryFrame } from './model';

type Size = { width: number; height: number };
export function referenceCapture<T extends Capture>(frames: T[], reference: Pick<Capture, 'kind' | 'number'>) {
  return frames.find(frame => frame.kind === reference.kind && frame.number === reference.number) ?? frames[0];
}

/** Reference proportions determine the stable height; viewport changes can still constrain width. */
export function theaterFrameSize(available: Size, baseline: Size, viewport: Size) {
  const ratio = viewport.width / viewport.height;
  const height = Math.max(0, Math.min(available.height, available.width * baseline.height / baseline.width, available.width / ratio));
  return { width: height * ratio, height };
}

/** Accumulate wheel pixels until one shared step; scroll down advances, scroll up goes back. */
export function wheelFrameDelta(deltaY: number, accumulated: number, step: number) {
  const next = accumulated + deltaY;
  if (Math.abs(next) < step) return { accumulated: next, move: 0 };
  return { accumulated: 0, move: next > 0 ? 1 : -1 };
}

/** While the pointer moves, retain the last decoded preview until its replacement is ready. */
export function presentedFrame(previewing: boolean, preview: GalleryFrame | null, selected: GalleryFrame | null, requested: GalleryFrame | undefined) {
  return (previewing ? preview : null) ?? selected ?? requested;
}

/** Legacy filenames cannot distinguish exact-limit messages from truncated ones. */
export function theaterCaption(frame: Pick<Capture, 'kind' | 'summary'>) {
  if (frame.kind !== 'prompt') return frame.summary;
  const summary = frame.summary.trim();
  const text = summary.length >= captureSummaryMaxLength ? `${summary.slice(0, captureSummaryMaxLength).replace(/[. ]+$/, '')}...` : summary;
  return `"${text}"`;
}
