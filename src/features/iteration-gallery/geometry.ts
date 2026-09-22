import type { GalleryFrame, GalleryVersion, RangeKey } from './model.ts';
import { inRange } from './model.ts';
import { galleryTokens as t } from './tokens.ts';

export function imageSize(frame: Pick<GalleryFrame, 'width' | 'height'>) {
  const scale = Math.min(t.maxImageWidth / frame.width, t.maxImageHeight / frame.height);
  return { width: frame.width * scale, height: frame.height * scale };
}
export type FramePlane = { frame: GalleryFrame; x: number; y: number; depth: number; width: number; height: number; active: boolean; hitStart: number; hitEnd: number };
export type AlbumBlock = { key: string; version: number; width: number; height: number; start: number; end: number; active: boolean };

export function buildAlbum(versions: GalleryVersion[], range: RangeKey, now: number) {
  const blocks: AlbumBlock[] = [], planes: FramePlane[] = [];
  for (const version of versions) {
    const sizes = version.frames.map(imageSize);
    const width = Math.max(...sizes.map(size => size.width)) + t.padding * 2;
    const height = Math.max(...sizes.map(size => size.height)) + t.padding * 2;
    const start = version.index * t.versionDepth;
    const end = start + t.versionDepth - t.blockGap;
    const step = (end - start - t.padding * 2) / version.frames.length;
    let chunkStart = start, chunkActive = inRange(version.frames[0], range, now), chunkIndex = 0;
    version.frames.forEach((frame, i) => {
      const active = inRange(frame, range, now);
      const boundary = start + t.padding + i * step;
      if (active !== chunkActive) {
        blocks.push({ key: `${version.number}:${chunkIndex++}`, version: version.number, width, height, start: chunkStart, end: boundary, active: chunkActive });
        chunkStart = boundary; chunkActive = active;
      }
      planes.push({ frame, ...sizes[i], x: (width - sizes[i].width) / 2, y: (height - sizes[i].height) / 2,
        depth: boundary + step / 2, active, hitStart: i === 0 ? start : boundary,
        hitEnd: i === version.frames.length - 1 ? end : boundary + step });
    });
    blocks.push({ key: `${version.number}:${chunkIndex}`, version: version.number, width, height, start: chunkStart, end, active: chunkActive });
  }
  const width = Math.max(t.maxImageWidth, ...blocks.map(block => block.width));
  const depth = versions.length * t.versionDepth;
  return { blocks, planes, width, depth };
}
