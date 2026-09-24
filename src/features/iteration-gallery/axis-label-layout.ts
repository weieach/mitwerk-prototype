import * as THREE from 'three';
import { galleryTokens as t } from './tokens.ts';

export type AxisAnchor = { id: string; text: string; position: THREE.Vector3; face: 'ground' | 'wall' | 'frame'; featured?: boolean };
export type AxisLabel = { id: string; text: string; transform: string; fontSize: number; hidden: boolean; featured?: boolean; face?: AxisAnchor['face'] };

const AXIS_TITLES = new Set(['Date', 'Version']);

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
export function projectAxisLabels(anchors: AxisAnchor[], camera: THREE.OrthographicCamera, width: number, height: number): AxisLabel[] {
  const { minPx, basePx, maxPx, referenceViewport, minProjection } = t.axisText;
  const fontSize = THREE.MathUtils.clamp(basePx * Math.min(width, height) / referenceViewport, minPx, maxPx);
  const inverseCamera = camera.quaternion.clone().invert();
  return anchors.map(anchor => {
    // Wall text runs along depth: a quarter turn from the former upright date labels.
    const rotation = anchor.face === 'ground' ? new THREE.Euler(-Math.PI / 2, 0, 0)
      : anchor.face === 'wall' ? new THREE.Euler(0, Math.PI / 2, 0) : new THREE.Euler();
    const plane = new THREE.Quaternion().setFromEuler(rotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(plane).applyQuaternion(inverseCamera);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(plane).applyQuaternion(inverseCamera);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(plane).applyQuaternion(inverseCamera);
    // Keep the reverse face readable when the user orbits behind the album.
    if (normal.z < 0) { right.negate(); normal.negate(); }
    const compensation = 1 / Math.max(minProjection, Math.min(Math.hypot(right.x, right.y), Math.hypot(up.x, up.y)));
    right.multiplyScalar(compensation); up.multiplyScalar(compensation);
    const point = anchor.position.clone().project(camera);
    const matrix = [right.x, -right.y, right.z, 0, -up.x, up.y, -up.z, 0,
      normal.x, -normal.y, normal.z, 0, (point.x + 1) * width / 2, (1 - point.y) * height / 2, 0, 1];
    return { id: anchor.id, text: anchor.text, transform: `matrix3d(${matrix.join(',')})`, fontSize,
      hidden: point.z < -1 || point.z > 1, featured: anchor.featured, face: anchor.face };
  });
}
