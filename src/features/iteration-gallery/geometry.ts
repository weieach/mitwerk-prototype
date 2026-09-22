import type { GalleryFrame, GalleryVersion, RangeKey } from './model.ts';
import { inRange } from './model.ts';
import { galleryTokens as t } from './tokens.ts';

export function imageSize(frame: Pick<GalleryFrame, 'width' | 'height'>) {
  const scale = Math.min(t.maxImageWidth / frame.width, t.maxImageHeight / frame.height);
  return { width: frame.width * scale, height: frame.height * scale };
}
export type FramePlane = { frame: GalleryFrame; x: number; y: number; depth: number; width: number; height: number; active: boolean; hitStart: number; hitEnd: number };
export type AlbumBlock = { key: string; version: number; width: number; height: number; start: number; end: number; active: boolean };

export function albumEnvelope(versions: GalleryVersion[]) {
  const sizes = versions.flatMap(version => version.frames.map(imageSize));
  return {
    width: (sizes.length ? Math.max(...sizes.map(size => size.width)) : t.maxImageWidth) + t.padding * 2,
    height: (sizes.length ? Math.max(...sizes.map(size => size.height)) : t.maxImageHeight) + t.padding * 2,
  };
}

export function buildAlbum(versions: GalleryVersion[], range: RangeKey, now: number) {
  const blocks: AlbumBlock[] = [], planes: FramePlane[] = [];
  const { width, height } = albumEnvelope(versions);
  for (const version of versions) {
    const sizes = version.frames.map(imageSize);
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
  return { blocks, planes, width, depth: versions.length * t.versionDepth };
}

export type Vec3 = { x: number; y: number; z: number };

export function frameFocus(plane: Pick<FramePlane, 'x' | 'y' | 'width' | 'height' | 'depth'>): Vec3 {
  return { x: plane.x + plane.width / 2, y: -plane.y - plane.height / 2, z: -plane.depth };
}

export function albumBlockBounds(album: Pick<ReturnType<typeof buildAlbum>, 'blocks'>) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const block of album.blocks) {
    min.x = Math.min(min.x, 0);
    max.x = Math.max(max.x, block.width);
    min.y = Math.min(min.y, -block.height);
    max.y = Math.max(max.y, 0);
    min.z = Math.min(min.z, -block.end);
    max.z = Math.max(max.z, -block.start);
  }
  return {
    min, max,
    center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 },
  };
}

export function boxCorners(bounds: { min: Vec3; max: Vec3 }): Vec3[] {
  const { min, max } = bounds;
  return [
    { x: min.x, y: min.y, z: min.z }, { x: min.x, y: min.y, z: max.z },
    { x: min.x, y: max.y, z: min.z }, { x: min.x, y: max.y, z: max.z },
    { x: max.x, y: min.y, z: min.z }, { x: max.x, y: min.y, z: max.z },
    { x: max.x, y: max.y, z: min.z }, { x: max.x, y: max.y, z: max.z },
  ];
}

export function coverRadius(center: Vec3, points: Vec3[]) {
  return Math.sqrt(Math.max(0, ...points.map(point =>
    (point.x - center.x) ** 2 + (point.y - center.y) ** 2 + (point.z - center.z) ** 2)));
}

export type LabelFace = 'ground' | 'wall' | 'frame';

export function albumFloorY(album: Pick<ReturnType<typeof buildAlbum>, 'blocks'>) {
  return -Math.max(...album.blocks.map(block => block.height));
}

export function versionLabelPose(album: Pick<ReturnType<typeof buildAlbum>, 'width' | 'blocks'>, index: number) {
  return { x: album.width + t.rulerTickLength + t.rulerLabelGap, y: albumFloorY(album), z: -(index + .5) * t.versionDepth, face: 'ground' as const };
}

export function dateLabelPose(depth: number, height: number) {
  return { x: -(t.rulerTickLength + t.rulerLabelGap), y: -height / 2, z: -depth, face: 'wall' as const };
}

/** Reset looks at the blocks. Nearby ground/wall labels participate in the fit without pulling the look-at sideways. */
export function resetLook(album: ReturnType<typeof buildAlbum>) {
  const bounds = albumBlockBounds(album);
  const points = [
    ...boxCorners(bounds),
    { x: bounds.max.x + t.rulerTickLength + t.rulerTitleGap, y: bounds.min.y, z: bounds.center.z },
    { x: bounds.min.x, y: bounds.max.y, z: bounds.center.z },
  ];
  const span = coverRadius(bounds.center, points) * 2 * t.overviewPadding / t.overviewFitScale;
  return { center: { ...bounds.center, y: bounds.center.y + span * t.resetDrop }, span };
}
