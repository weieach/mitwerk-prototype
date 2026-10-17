import type { GalleryFrame, GalleryVersion, RangeKey } from './model.ts';
import { formatFrameDate, formatVersion, inRange, versionKeepsPush } from './model.ts';
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

/** Chronological depth mapped to the newest-first gallery's physical depth. */
export function galleryDepth(depth: number, total: number) { return total - t.blockGap - depth; }

export function buildAlbum(versions: GalleryVersion[], range: RangeKey, now: number) {
  const blocks: AlbumBlock[] = [], planes: FramePlane[] = [];
  const { width, height } = albumEnvelope(versions);
  for (const version of versions) {
    const start = version.index * t.versionDepth;
    const end = start + t.versionDepth - t.blockGap;
    const shown = versionKeepsPush(version.frames) ? version.frames : version.frames.filter(frame => frame.kind !== 'push');
    if (!shown.length) {
      blocks.push({ key: `${version.number}:0`, version: version.number, width, height, start, end, active: version.frames.some(frame => inRange(frame, range, now)) });
      continue;
    }
    const step = (end - start - t.padding * 2) / shown.length;
    let chunkStart = start, chunkActive = inRange(shown[0], range, now), chunkIndex = 0;
    shown.forEach((frame, i) => {
      const active = inRange(frame, range, now);
      const boundary = start + t.padding + i * step;
      if (active !== chunkActive) {
        blocks.push({ key: `${version.number}:${chunkIndex++}`, version: version.number, width, height, start: chunkStart, end: boundary, active: chunkActive });
        chunkStart = boundary; chunkActive = active;
      }
      planes.push({ frame, width: width - t.padding * 2, height: height - t.padding * 2, x: t.padding, y: t.padding,
        depth: boundary + step / 2, active, hitStart: i === 0 ? start : boundary,
        hitEnd: i === shown.length - 1 ? end : boundary + step });
    });
    blocks.push({ key: `${version.number}:${chunkIndex}`, version: version.number, width, height, start: chunkStart, end, active: chunkActive });
  }
  const depth = versions.length * t.versionDepth;
  // Preserve chronological array order; reflect only spatial coordinates so the latest frame is nearest +Z.
  for (const block of blocks) [block.start, block.end] = [galleryDepth(block.end, depth), galleryDepth(block.start, depth)];
  for (const plane of planes) {
    plane.depth = galleryDepth(plane.depth, depth);
    [plane.hitStart, plane.hitEnd] = [galleryDepth(plane.hitEnd, depth), galleryDepth(plane.hitStart, depth)];
  }
  return { blocks, planes, width, depth };
}

/** Rulers share the album's range eligibility, including partially active versions. */
export function albumAxisContent(album: Pick<ReturnType<typeof buildAlbum>, 'planes' | 'blocks'>, versions: GalleryVersion[]) {
  const activeVersions = new Set(album.blocks.filter(block => block.active).map(block => block.version));
  return {
    frames: album.planes.filter(plane => plane.active).map(plane => plane.frame),
    versions: versions.filter(version => activeVersions.has(version.number)),
  };
}

export type Vec3 = { x: number; y: number; z: number };

export function frameFocus(plane: Pick<FramePlane, 'x' | 'y' | 'width' | 'height' | 'depth'>): Vec3 {
  return { x: plane.x + plane.width / 2, y: -plane.y - plane.height / 2 + plane.height * t.webgl.frontViewLift, z: -plane.depth };
}

/** Anchor the highest point of the latest frame's top edge at the shared viewport fraction. */
export function defaultFrameFocus(plane: Pick<FramePlane, 'x' | 'y' | 'width' | 'height' | 'depth'>, viewUp: Vec3, verticalSpan: number): Vec3 {
  const center = frameFocus(plane);
  const topAboveCenter = Math.abs(viewUp.x) * plane.width / 2 + viewUp.y * (-plane.y - center.y);
  const shift = topAboveCenter + (t.webgl.latestFrameTop - .5) * verticalSpan;
  return { x: center.x + viewUp.x * shift, y: center.y + viewUp.y * shift, z: center.z + viewUp.z * shift };
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

export function versionLabelPoseAtDepth(album: Pick<ReturnType<typeof buildAlbum>, 'width' | 'blocks'>, depth: number) {
  return { x: -t.rulerTickLength - t.rulerLabelGap, y: albumFloorY(album), z: -depth, face: 'ground' as const };
}

export function versionLabelPose(album: Pick<ReturnType<typeof buildAlbum>, 'width' | 'blocks' | 'depth'>, index: number) {
  return versionLabelPoseAtDepth(album, galleryDepth((index + .5) * t.versionDepth, album.depth));
}

export function dateLabelPose(depth: number, album: { width: number }) {
  return { x: album.width, y: t.rulerTickLength + t.rulerLabelGap, z: -depth, face: 'wall' as const };
}

export function featuredTickLength() {
  return t.rulerTickLength * t.featuredTickScale;
}

export function featuredVersionPose(album: Pick<ReturnType<typeof buildAlbum>, 'width' | 'blocks'>, depth: number) {
  return { x: -featuredTickLength() - t.rulerLabelGap, y: albumFloorY(album), z: -depth, face: 'ground' as const };
}

export function featuredDatePose(depth: number, album: { width: number }) {
  return { x: album.width, y: featuredTickLength() + t.rulerLabelGap, z: -depth, face: 'wall' as const };
}

/** Date on the wall and version on the ground, both at the selected frame's depth. */
export function featuredFrameAxis(album: Pick<ReturnType<typeof buildAlbum>, 'width' | 'blocks'>, plane: Pick<FramePlane, 'depth' | 'frame'>) {
  return {
    date: { ...featuredDatePose(plane.depth, album), text: formatFrameDate(plane.frame.timestamp) },
    version: { ...featuredVersionPose(album, plane.depth), text: formatVersion(plane.frame.version) },
  };
}

export function hoverCaptionHeight(frameHeight: number, viewHeight: number) {
  return Math.max(frameHeight * t.hoverCaptionFrame, viewHeight * t.hoverCaptionViewport) * t.hoverCaptionScale;
}

/** Block envelope that contains a frame. On a chunk boundary, take the later chunk. */
export function containingBlock(album: Pick<ReturnType<typeof buildAlbum>, 'blocks'>, plane: Pick<FramePlane, 'depth' | 'frame'>) {
  return album.blocks
    .filter(block => block.version === plane.frame.version && plane.depth >= block.start && plane.depth <= block.end)
    .sort((a, b) => b.start - a.start)[0];
}

/** Reset looks at the blocks. Nearby ground/wall labels participate in the fit without pulling the look-at sideways. */
export function resetLook(album: ReturnType<typeof buildAlbum>) {
  const bounds = albumBlockBounds(album);
  const points = [
    ...boxCorners(bounds),
    { x: bounds.min.x - t.rulerTickLength - t.rulerLabelGap - t.axisTitle.valueGap, y: bounds.min.y, z: bounds.center.z },
    { x: bounds.max.x, y: bounds.max.y + t.rulerTickLength + t.rulerLabelGap + t.axisTitle.dateValueGap, z: bounds.center.z },
  ];
  const span = coverRadius(bounds.center, points) * 2 * t.overviewPadding / t.overviewFitScale;
  return { center: bounds.center, span };
}

/** Camera pose for Reset view, including the shared counterclockwise ground-plane orbit. */
export function resetCameraDestination(album: ReturnType<typeof buildAlbum>) {
  const look = resetLook(album);
  const distance = Math.max(look.span, album.depth) * 2;
  const yaw = -t.webgl.groundRotationDegrees * Math.PI / 180;
  const [x, y, z] = t.webgl.initialDirection;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const dx = x * cos + z * sin, dz = -x * sin + z * cos;
  const length = Math.hypot(dx, y, dz) || 1;
  return {
    ...look,
    position: { x: look.center.x + dx / length * distance, y: look.center.y + y / length * distance, z: look.center.z + dz / length * distance },
  };
}
