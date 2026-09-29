import * as THREE from 'three';

/** Interpolate orbit angles independently so yaw remains visible even at the pole. */
export function interpolateOrbit(from: THREE.Vector3, to: THREE.Vector3, progress: number) {
  const a = new THREE.Spherical().setFromVector3(from);
  const b = new THREE.Spherical().setFromVector3(to);
  const turn = Math.atan2(Math.sin(b.theta - a.theta), Math.cos(b.theta - a.theta));
  return new THREE.Vector3().setFromSpherical(new THREE.Spherical(
    THREE.MathUtils.lerp(a.radius, b.radius, progress),
    THREE.MathUtils.lerp(a.phi, b.phi, progress),
    a.theta + turn * progress,
  ));
}
