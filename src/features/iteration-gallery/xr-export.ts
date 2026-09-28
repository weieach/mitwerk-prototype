import { albumEnvelope, albumFloorY, buildAlbum, dateLabelPose, imageSize, versionLabelPose } from './geometry.ts';
import { buildVersions, dateTicks, formatDate, formatVersion, representativeFrames } from './model.ts';
import type { Capture, RangeKey } from './model.ts';
import { galleryTokens as t } from './tokens.ts';

export const xrTokens = {
  albumWidthMeters: .8, placement: [0, 1.3, -1.6], labelHeightMeters: .025,
  textureMaxEdge: 1536, textureCacheSize: 8,
  colors: { paper: '#ffffff', ink: '#111111', edge: '#777777', guide: '#b9bdba', selected: '#000000' },
} as const;

/** Engine-neutral snapshot of the same version spacing, padding and axis geometry as the app. */
export function createXRManifest(captures: Capture[], range: RangeKey = 'all', now = Date.now()) {
  const versions = buildVersions(captures);
  const album = buildAlbum(versions, range, now);
  const envelope = albumEnvelope(versions);
  const scale = xrTokens.albumWidthMeters / envelope.width;
  const point = (x: number, y: number, z: number) => [x * scale, y * scale, z * scale];
  const representativeIds = new Set(representativeFrames(versions, range, now).map(frame => frame.id));
  const frames = album.planes.map((plane, index) => {
    const size = imageSize(plane.frame);
    return { id: plane.frame.id, image: `screenshots/frame-${String(index + 1).padStart(4, '0')}.png`,
      sourceFilename: plane.frame.filename, version: plane.frame.version, captureKind: plane.frame.kind,
      captureNumber: plane.frame.number, branch: plane.frame.branch ?? 'main', timestamp: plane.frame.timestamp,
      summary: plane.frame.summary, pixelSize: [plane.frame.width, plane.frame.height],
      position: point(envelope.width / 2, -envelope.height / 2, -plane.depth),
      size: [size.width * scale, size.height * scale], active: plane.active, showAtRest: representativeIds.has(plane.frame.id) };
  });
  const floor = versions.length ? albumFloorY(album) : -envelope.height;
  const labels: { id: string; text: string; position: number[]; rotation: number[]; height: number }[] = [];
  const guides: { id: string; axis: string; points: number[][] }[] = [];
  const label = (id: string, text: string, x: number, y: number, z: number, face: 'ground' | 'wall') => labels.push({ id, text, position: point(x, y, z), rotation: face === 'ground' ? [-Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0], height: xrTokens.labelHeightMeters });
  label('date-title', 'Date', 0, t.rulerTickLength + t.rulerLabelGap + t.axisTitle.valueGap, -album.depth / 2, 'wall');
  label('version-title', 'Version', album.width + t.rulerTickLength + t.rulerLabelGap + t.axisTitle.valueGap, floor, -album.depth / 2, 'ground');
  for (const tick of dateTicks(album.planes.map(plane => plane.frame))) {
    const plane = album.planes.find(item => item.frame.id === tick.id);
    if (!plane) continue;
    const pose = dateLabelPose(plane.depth);
    const id = `date-${tick.timestamp}`;
    guides.push({ id, axis: 'date', points: [point(0, 0, -plane.depth), point(0, t.rulerTickLength, -plane.depth)] });
    label(id, formatDate(tick.timestamp), pose.x, pose.y, pose.z, 'wall');
  }
  for (const version of versions) {
    const pose = versionLabelPose(album, version.index);
    const id = `version-${version.number}`;
    guides.push({ id, axis: 'version', points: [point(album.width, floor, pose.z), point(album.width + t.rulerTickLength, floor, pose.z)] });
    label(id, formatVersion(version.number), pose.x, pose.y, pose.z, 'ground');
  }
  return {
    schemaVersion: 1, generatedAt: new Date(now).toISOString(), range,
    coordinates: { units: 'meters', handedness: 'right', up: '+Y', timeDirection: '-Z', rotationUnits: 'radians', eulerOrder: 'XYZ', sourceUnitMeters: scale },
    placement: { position: [...xrTokens.placement], rotation: [0, 0, 0], scale: [1, 1, 1] },
    bounds: { min: point(0, floor, -album.depth), max: point(album.width, 0, 0) },
    style: { ...xrTokens, blockOpacity: t.webgl.blockOpacity, edgeOpacity: t.webgl.edgeOpacity, frameOutlineOpacity: t.webgl.frameOutlineOpacity,
      inactiveOpacity: t.disabledOpacity, frameOpacity: t.endpointOpacity, liftMeters: t.hoverLift * scale },
    blocks: album.blocks.map(block => ({ id: block.key, version: block.version, active: block.active,
      position: point(block.width / 2, -block.height / 2, -(block.start + block.end) / 2),
      size: point(block.width, block.height, block.end - block.start) })),
    frames, axes: { guides, labels },
  };
}
