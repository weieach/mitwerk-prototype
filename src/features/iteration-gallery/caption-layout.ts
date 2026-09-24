import * as THREE from 'three';
import type { FramePlane } from './geometry.ts';
import { galleryTokens as t } from './tokens.ts';

/** Preserve the normal frame caption; overhead, billboard from the block's left edge. */
export function hoverCaptionPose(plane: Pick<FramePlane, 'x' | 'y' | 'width' | 'depth'>,
  size: { width: number; height: number }, camera: THREE.Camera, topBlend: number) {
  const normal = new THREE.Vector3(plane.x + size.width / 2,
    -plane.y + t.hoverCaptionGap + size.height / 2, -plane.depth);
  const ends = [new THREE.Vector3(plane.x - t.padding, -plane.y, -plane.depth),
    new THREE.Vector3(plane.x + plane.width + t.padding, -plane.y, -plane.depth)];
  const left = ends[0].clone().project(camera).x <= ends[1].clone().project(camera).x ? ends[0] : ends[1];
  const offset = new THREE.Vector3(size.width / 2, t.hoverCaptionGap + size.height / 2, 0).applyQuaternion(camera.quaternion);
  return { position: normal.lerp(left.clone().add(offset), topBlend),
    rotation: new THREE.Quaternion().slerp(camera.quaternion, topBlend) };
}
