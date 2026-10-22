import { OrthographicCamera, Quaternion, Vector3 } from 'three';

type Frustum = readonly [number, number, number, number];

/** Turn around the chosen frame, keeping its projected center on the handoff path. `retarget` moves the landing
 * rectangle mid-turn, for Playback layout that settles after the turn starts. */
export function frameCameraTurn(camera: OrthographicCamera, fromPivot: Vector3, toPivot: Vector3, landing: Frustum, distance: number) {
  let toFrustum = landing;
  camera.updateMatrixWorld();
  const fromRotation = camera.quaternion.clone();
  const frontalRotation = new Quaternion();
  const fromFrustum = [camera.left, camera.right, camera.top, camera.bottom].map(value => value / camera.zoom);
  const fromCenter = fromPivot.clone().project(camera);
  const centerOf = (frustum: Frustum) => new Vector3(
    -(frustum[1] + frustum[0]) / (frustum[1] - frustum[0]),
    -(frustum[2] + frustum[3]) / (frustum[2] - frustum[3]), 0);
  let toCenter = centerOf(toFrustum);
  const fromDistance = camera.position.clone().sub(fromPivot).applyQuaternion(fromRotation.clone().invert()).z;
  const center = new Vector3(), pivot = new Vector3(), offset = new Vector3();
  const turn = (progress: number) => {
    camera.quaternion.slerpQuaternions(fromRotation, frontalRotation, progress);
    camera.zoom = 1;
    [camera.left, camera.right, camera.top, camera.bottom] = fromFrustum.map((value, index) => value + (toFrustum[index] - value) * progress);
    center.lerpVectors(fromCenter, toCenter, progress);
    pivot.lerpVectors(fromPivot, toPivot, progress);
    offset.set(
      -(center.x * (camera.right - camera.left) + camera.right + camera.left) / 2,
      -(center.y * (camera.top - camera.bottom) + camera.top + camera.bottom) / 2,
      fromDistance + (distance - fromDistance) * progress);
    camera.position.copy(pivot).add(offset.applyQuaternion(camera.quaternion));
    camera.updateProjectionMatrix();
  };
  return Object.assign(turn, { retarget(next: Frustum) { toFrustum = next; toCenter = centerOf(next); } });
}
