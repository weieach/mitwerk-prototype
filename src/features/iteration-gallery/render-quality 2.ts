import { galleryTokens as t } from './tokens.ts';

/** Scale the drawing buffer with panel size and display density, within a GPU pixel budget. */
export function galleryRenderRatio(width: number, height: number, deviceRatio: number, maxDimension = Infinity) {
  if (width <= 0 || height <= 0) return 1;
  const q = t.webgl.resolution;
  const progress = Math.max(0, Math.min(1, (width - q.panelStart) / (q.panelEnd - q.panelStart)));
  const density = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const desired = density * (1 + progress * (q.largePanelScale - 1));
  return Math.min(desired, t.webgl.pixelRatioMax, Math.sqrt(q.maxPixels / (width * height)), maxDimension / width, maxDimension / height);
}
