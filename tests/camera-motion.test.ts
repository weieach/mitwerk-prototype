import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { interpolateOrbit } from '../src/features/iteration-gallery/camera-motion.ts';

test('orbit transition turns gradually both into and out of overhead view', () => {
  const top = new THREE.Vector3(1e-3, 1000, 0);
  const gallery = new THREE.Vector3(400, 700, 1000);
  for (const [from, to] of [[top, gallery], [gallery, top]]) {
    assert.ok(interpolateOrbit(from, to, 0).distanceTo(from) < 1e-6);
    assert.ok(interpolateOrbit(from, to, 1).distanceTo(to) < 1e-6);
    const a = new THREE.Spherical().setFromVector3(from);
    const b = new THREE.Spherical().setFromVector3(to);
    const middle = new THREE.Spherical().setFromVector3(interpolateOrbit(from, to, .5));
    assert.ok(Math.abs(middle.theta - (a.theta + b.theta) / 2) < 1e-6);
    assert.ok(Math.abs(middle.phi - (a.phi + b.phi) / 2) < 1e-6);
  }
});
test('orbit yaw crosses its wrap boundary along the shorter path', () => {
  const from = new THREE.Vector3().setFromSpherical(new THREE.Spherical(100, 1, Math.PI - .1));
  const to = new THREE.Vector3().setFromSpherical(new THREE.Spherical(100, 1, -Math.PI + .1));
  const middle = new THREE.Spherical().setFromVector3(interpolateOrbit(from, to, .5));
  assert.ok(Math.abs(Math.abs(middle.theta) - Math.PI) < 1e-8);
});
