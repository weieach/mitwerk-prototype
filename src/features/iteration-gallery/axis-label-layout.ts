import * as THREE from 'three';
import { galleryTokens as t } from './tokens.ts';

export type AxisAnchor = { id: string; text: string; timestamp?: number; position: THREE.Vector3; face: 'ground' | 'wall' | 'frame'; valueOrigin?: THREE.Vector3; overheadDate?: boolean; topPosition?: THREE.Vector3; featured?: boolean };
export type AxisLabel = { id: string; text: string; layer: number; transform: string; fontSize: number; hidden: boolean; featured?: boolean; face?: AxisAnchor['face']; rise: number; opacity: number; align: number; dateRail?: 'wall' | 'overhead'; row?: number };

const AXIS_TITLES = new Set(['Date', 'Version']);

/** Ground-plane viewing angle, independent of pan, zoom and camera elevation.
 * Only the front of the album unfolds the labels; rear views retain their planes. */
export function axisFrontBlend(camera: THREE.Camera) {
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
  const angle = THREE.MathUtils.radToDeg(Math.atan2(Math.abs(forward.x), forward.z));
  return 1 - THREE.MathUtils.smoothstep(angle, t.axisFacing.fullyFrontDegrees, t.axisFacing.startDegrees);
}

export function axisTopBlend(camera: THREE.Camera) {
  const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
  const elevation = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(outward.y, -1, 1)));
  return THREE.MathUtils.smoothstep(elevation, t.topView.startDegrees, t.topView.fullDegrees);
}

export function axisLabelRotation(face: AxisAnchor['face'], frontBlend: number, topBlend = 0) {
  const turn = Math.PI / 2 * (1 - frontBlend);
  return face === 'ground' ? new THREE.Euler(-Math.PI / 2 * topBlend, 0, 0)
    : face === 'wall' ? new THREE.Euler(0, -turn, 0) : new THREE.Euler();
}

/** Fold the date wall outward onto the right floor, retaining depth and ruler length. */
export function overheadDatePosition(point: THREE.Vector3, floor: number) {
  return new THREE.Vector3(point.x + point.y, floor, point.z);
}

export function withOverheadDates(anchors: AxisAnchor[], floor: number, endDepth?: number): AxisAnchor[] {
  return anchors.flatMap(anchor => anchor.face !== 'wall' ? [anchor] : [anchor, {
    ...anchor, id: `${anchor.id}:overhead`, overheadDate: true,
    position: overheadDatePosition(anchor.position, floor),
    valueOrigin: anchor.valueOrigin ? overheadDatePosition(anchor.valueOrigin, floor) : undefined,
  }]).map(anchor => {
    if (endDepth === undefined || !anchor.valueOrigin || (!anchor.overheadDate && anchor.face !== 'ground')) return anchor;
    return { ...anchor, topPosition: new THREE.Vector3(anchor.valueOrigin.x, floor, -endDepth + t.topView.titleEndGap) };
  });
}

/** Match both title gaps in screen space using the Date-to-values clearance as base.
 * Inverse zoom makes the visible gap larger as the album gets smaller. */
export function axisLabelScreenPosition(anchor: AxisAnchor, camera: THREE.OrthographicCamera, width: number, height: number) {
  const project = (position: THREE.Vector3) => {
    const point = position.clone().project(camera);
    return new THREE.Vector3((point.x + 1) * width / 2, (1 - point.y) * height / 2, point.z);
  };
  const point = project(anchor.position);
  if (!anchor.valueOrigin) return point;
  const origin = project(anchor.valueOrigin);
  const direction = new THREE.Vector2(point.x - origin.x, point.y - origin.y);
  if (direction.lengthSq() < 1e-8) direction.set(anchor.face === 'ground' ? 1 : 0, anchor.face === 'wall' ? -1 : 0);
  direction.normalize();
  const dateUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion.clone().invert());
  const dateScale = Math.hypot(dateUp.x * width / (camera.right - camera.left), dateUp.y * height / (camera.top - camera.bottom));
  const minimumScale = t.axisTitle.minProjection * height / (camera.top - camera.bottom);
  const gap = t.axisTitle.valueGap * Math.max(minimumScale, dateScale) / camera.zoom ** t.axisTitle.zoomGapPower;
  return new THREE.Vector3(origin.x + direction.x * gap, origin.y + direction.y * gap, point.z);
}

/** Keep static titles; replace a tick that already sits at a featured depth. */
export function mergeAxisAnchors(anchors: AxisAnchor[], featured: AxisAnchor[]) {
  const occupied = new Set(featured.map(anchor => `${anchor.face}:${anchor.position.z.toFixed(3)}`));
  return [
    ...anchors.filter(anchor => AXIS_TITLES.has(anchor.text) || !occupied.has(`${anchor.face}:${anchor.position.z.toFixed(3)}`)),
    ...featured,
  ];
}

/** Project plane-aligned DOM text through the same orthographic camera as the blocks.
 * Screen-space font sizing compensates for distance without losing the plane's rotation. */
export function projectAxisLabels(anchors: AxisAnchor[], camera: THREE.OrthographicCamera, width: number, height: number, dateBlend = axisTopBlend(camera), tokenBlend = 0, measureText: (text: string, size: number) => number = (text, size) => text.length * size * .65): AxisLabel[] {
  const { minPx, basePx, maxPx, referenceViewport, minProjection } = t.axisText;
  const fontSize = THREE.MathUtils.clamp(basePx * Math.min(width, height) / referenceViewport, minPx, maxPx);
  const inverseCamera = camera.quaternion.clone().invert();
  const frontBlend = axisFrontBlend(camera);
  const topBlend = axisTopBlend(camera);
  const dates = [...new Set(anchors.flatMap(anchor => anchor.timestamp === undefined ? [] : [anchor.timestamp]))].sort((a, b) => a - b);
  const layers = new Map(dates.map((date, index) => [date, index + 1]));
  const labels: AxisLabel[] = anchors.map(anchor => {
    const rotation = anchor.overheadDate ? new THREE.Euler(-Math.PI / 2, 0, 0) : axisLabelRotation(anchor.face, frontBlend, topBlend);
    const plane = new THREE.Quaternion().setFromEuler(rotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(plane).applyQuaternion(inverseCamera);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(plane).applyQuaternion(inverseCamera);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(plane).applyQuaternion(inverseCamera);
    // Keep the reverse face readable when the user orbits behind the album.
    if (normal.z < 0) { right.negate(); normal.negate(); }
    const compensation = 1 / Math.max(minProjection, Math.min(Math.hypot(right.x, right.y), Math.hypot(up.x, up.y)));
    right.multiplyScalar(compensation); up.multiplyScalar(compensation);
    // At overhead angles, read every rail in screen orientation as the album turns.
    const readable = THREE.MathUtils.smoothstep(topBlend, 0, 1);
    right.lerp(new THREE.Vector3(1, 0, 0), readable);
    up.lerp(new THREE.Vector3(0, 1, 0), readable);
    normal.lerp(new THREE.Vector3(0, 0, 1), readable);

    const point = axisLabelScreenPosition(anchor, camera, width, height);
    if (anchor.topPosition) {
      const end = axisLabelScreenPosition({ ...anchor, position: anchor.topPosition, valueOrigin: undefined }, camera, width, height);
      point.lerp(end, topBlend);
    }
    const pinnedTitle = AXIS_TITLES.has(anchor.text) && (anchor.overheadDate || anchor.face === 'ground');
    if (pinnedTitle) point.x = THREE.MathUtils.lerp(point.x, t.tokenUsage.axisInsetPx, tokenBlend);
    const align = anchor.id.startsWith('tokens:') ? 0 : (.5 + (anchor.overheadDate ? -.5 : anchor.face === 'ground' ? .5 : 0) * topBlend) * (pinnedTitle ? 1 - tokenBlend : 1);
    const titleClearance = t.tokenUsage.axisInsetPx + 'Version'.length * fontSize * .55 + t.tokenUsage.axisTitleGapPx;
    const underTitle = !pinnedTitle && (anchor.overheadDate || anchor.face === 'ground')
      && point.x - anchor.text.length * fontSize * align < titleClearance;
    const railOpacity = underTitle ? 1 - tokenBlend : 1;
    const matrix = [right.x, -right.y, right.z, 0, -up.x, up.y, -up.z, 0,
      normal.x, -normal.y, normal.z, 0, point.x, point.y, 0, 1];
    return { id: anchor.id, text: anchor.text, layer: layers.get(anchor.timestamp!) ?? 0, transform: `matrix3d(${matrix.join(',')})`, fontSize,
      hidden: point.z < -1 || point.z > 1, featured: anchor.featured, face: anchor.face,
      rise: anchor.face === 'ground' ? 1 - topBlend : 0,
      align, dateRail: anchor.face === 'wall' ? (anchor.overheadDate ? 'overhead' : 'wall') : undefined,
      opacity: (anchor.overheadDate ? dateBlend : anchor.face === 'wall' ? 1 - dateBlend : 1) * railOpacity };
  });
  return spaceDateLabels(labels, width, height, measureText);
}

/** Stagger projected dates in whole text rows, recomputing from untouched anchors
 * each frame. Camera/zoom never receives this presentation-only adjustment. */
export function spaceDateLabels(labels: AxisLabel[], width: number, height: number, measureText: (text: string, size: number) => number): AxisLabel[] {
  type Box = { left: number; right: number; top: number; bottom: number };
  const result = [...labels];
  const gap = t.axisText.collisionGap;
  const intersects = (a: Box, b: Box) => a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
  for (const rail of ['wall', 'overhead'] as const) {
    const entries = labels.flatMap((label, index) => {
      if (label.dateRail !== rail || label.hidden || label.opacity < .01) return [];
      const matrix = label.transform.slice(9, -1).split(',').map(Number);
      const padX = label.featured ? t.labelBackdrop.paddingInline : 0;
      const padY = label.featured ? t.labelBackdrop.paddingBlock : 0;
      const w = measureText(label.text, label.fontSize) + padX * 2;
      const h = label.fontSize * t.axisText.lineHeight + padY * 2;
      const corners = [-label.align * w, (1 - label.align) * w].flatMap(x => [-h / 2, h / 2].map(y => ({x:matrix[12] + matrix[0] * x + matrix[4] * y, y:matrix[13] + matrix[1] * x + matrix[5] * y})));
      const box = {left:Math.min(...corners.map(p => p.x)),right:Math.max(...corners.map(p => p.x)),top:Math.min(...corners.map(p => p.y)),bottom:Math.max(...corners.map(p => p.y))};
      if (box.right < 0 || box.left > width || box.bottom < 0 || box.top > height) return [];
      return [{label,index,matrix,box,rowHeight:h}];
    }).sort((a,b) => Number(AXIS_TITLES.has(b.label.text)) - Number(AXIS_TITLES.has(a.label.text)) || a.label.layer - b.label.layer || a.label.id.localeCompare(b.label.id));
    const occupied: Box[] = [];
    for (const entry of entries) {
      const {label,index,matrix,box,rowHeight} = entry;
      let row = 0, placed = box;
      if (!AXIS_TITLES.has(label.text) && occupied.some(other => intersects(box, other))) {
        const limit = Math.ceil(entries.reduce((sum,e) => sum + e.box.bottom - e.box.top + gap, height) / rowHeight) + 1;
        search: for (const direction of [1,-1]) {
          for (let step = 1; step <= limit; step++) {
            const candidate = {...box,top:box.top - direction * step * rowHeight,bottom:box.bottom - direction * step * rowHeight};
            if (candidate.top < 0 || (candidate.bottom > height && step < limit)) continue;
            if (!occupied.some(other => intersects(candidate,other))) {row = direction * step; placed = candidate; break search;}
          }
        }
      }
      occupied.push(placed);
      matrix[13] -= row * rowHeight;
      result[index] = {...label,row,transform:`matrix3d(${matrix.join(',')})`};
    }
  }
  return result;
}
