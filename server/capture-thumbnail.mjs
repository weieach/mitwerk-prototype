import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from './blob-gallery.mjs';

// The album and its previews draw captures small; full PNGs load only for an opened frame.
export const thumbnailWidth = 960;
export const thumbnailMimeType = 'image/webp';

export async function captureThumbnail(bytes) {
  const { default: sharp } = await import('sharp');
  return sharp(bytes).resize({ width: thumbnailWidth, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
}

/** Disk-cached thumbnail for a local capture, keyed by its path, size and modification time. */
export async function cachedCaptureThumbnail(root, path) {
  const { size, mtimeMs } = statSync(path);
  const directory = join(root, 'node_modules/.cache/verso-thumbnails');
  const cached = join(directory, `${sha256(`${path}:${size}:${mtimeMs}:${thumbnailWidth}`)}.webp`);
  if (existsSync(cached)) return readFileSync(cached);
  const bytes = await captureThumbnail(readFileSync(path));
  mkdirSync(directory, { recursive: true });
  writeFileSync(cached, bytes);
  return bytes;
}
