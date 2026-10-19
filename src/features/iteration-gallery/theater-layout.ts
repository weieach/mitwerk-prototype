import { captureSummaryMaxLength } from '../../shared/capture-format.mjs';
import type { Capture, GalleryFrame } from './model';

type Size = { width: number; height: number };
export function referenceCapture<T extends Capture>(frames: T[], reference: Pick<Capture, 'kind' | 'number'>) {
  return frames.find(frame => frame.kind === reference.kind && frame.number === reference.number) ?? frames[0];
}

export function aspectRatioLabel(width: number, height: number) {
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const w = Math.max(0, Math.round(width));
  const h = Math.max(0, Math.round(height));
  const divisor = gcd(w, h) || 1;
  return `${w / divisor}:${h / divisor}`;
}
export function theaterFrameSize(available: Size, _baseline: Size, viewport: Size) {
  const ratio = viewport.width / Math.max(viewport.height, 1);
  const width = Math.max(0, available.width);
  return { width, height: width / ratio };
}

/** Fit a prototype viewport inside the theater frame, keeping its own aspect ratio. */
export function fitPrototypeFrame(available: Size, viewport: Size) {
  const ratio = viewport.width / Math.max(viewport.height, 1);
  let width = Math.min(Math.max(0, available.width), Math.max(0, viewport.width));
  let height = width / ratio;
  if (height > available.height) {
    height = Math.max(0, available.height);
    width = height * ratio;
  }
  return { width, height };
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

/** Prompt and push numbers lead the caption; other captures keep the summary alone. */
export function theaterCaptionLead(frame: Pick<Capture, 'kind' | 'number'>) {
  if (frame.number == null || (frame.kind !== 'prompt' && frame.kind !== 'push')) return '';
  const label = frame.kind === 'prompt' ? 'Prompt' : 'Push';
  return `${label} #${frame.number}: `;
}

/** Legacy filenames cannot distinguish exact-limit messages from truncated ones. */
export function theaterCaption(frame: Pick<Capture, 'kind' | 'summary' | 'fullPrompt' | 'commitMessage'>) {
  if (frame.fullPrompt !== undefined) return frame.fullPrompt;
  if (frame.kind === 'push' && frame.commitMessage) return frame.commitMessage;
  if (frame.kind !== 'prompt') return frame.summary;
  const summary = frame.summary.trim();
  const text = summary.length >= captureSummaryMaxLength ? `${summary.slice(0, captureSummaryMaxLength).replace(/[. ]+$/, '')}...` : summary;
  return `"${text}"`;
}
