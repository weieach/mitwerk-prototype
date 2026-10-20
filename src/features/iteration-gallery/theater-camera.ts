import { OrthographicCamera, Quaternion, Vector3 } from 'three';

type Frustum = readonly [number, number, number, number];

/** Turn around the chosen frame, keeping its projected center on the handoff path. */
export function frameCameraTurn(camera: OrthographicCamera, fromPivot: Vector3, toPivot: Vector3, toFrustum: Frustum, distance: number) {
  camera.updateMatrixWorld();
  const fromRotation = camera.quaternion.clone();
  const frontalRotation = new Quaternion();
  const fromFrustum = [camera.left, camera.right, camera.top, camera.bottom].map(value => value / camera.zoom);
  const fromCenter = fromPivot.clone().project(camera);
  const toCenter = new Vector3(
    -(toFrustum[1] + toFrustum[0]) / (toFrustum[1] - toFrustum[0]),
    -(toFrustum[2] + toFrustum[3]) / (toFrustum[2] - toFrustum[3]), 0);
  const fromDistance = camera.position.clone().sub(fromPivot).applyQuaternion(fromRotation.clone().invert()).z;
  const center = new Vector3(), pivot = new Vector3(), offset = new Vector3();
  return (progress: number) => {
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
}
