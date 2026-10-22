import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from './blob-gallery.mjs';

// The album and its previews draw captures small (`thumb`); opened frames use the full image.
// Deployments without Blob ship `display` WebPs in place of the original PNGs.
export const capturePresets = { thumb: { width: 960, quality: 78 }, display: { width: 2400, quality: 70 } };
export const thumbnailWidth = capturePresets.thumb.width;
export const thumbnailMimeType = 'image/webp';

export async function encodeCapture(bytes, preset = 'thumb') {
  const { width, quality } = capturePresets[preset];
  const { default: sharp } = await import('sharp');
  return sharp(bytes).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
}
export const captureThumbnail = bytes => encodeCapture(bytes, 'thumb');

/** Disk-cached WebP for a local image, keyed by its path, size, modification time and preset. */
export async function cachedCaptureEncoding(root, path, preset = 'thumb') {
  const { size, mtimeMs } = statSync(path);
  const { width, quality } = capturePresets[preset];
  const directory = join(root, 'node_modules/.cache/verso-thumbnails');
  const cached = join(directory, `${sha256(`${path}:${size}:${mtimeMs}:${width}:${quality}`)}.webp`);
  if (existsSync(cached)) return readFileSync(cached);
  const bytes = await encodeCapture(readFileSync(path), preset);
  mkdirSync(directory, { recursive: true });
  writeFileSync(cached, bytes);
  return bytes;
}
export const cachedCaptureThumbnail = (root, path) => cachedCaptureEncoding(root, path, 'thumb');
