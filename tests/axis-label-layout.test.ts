import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { projectAxisLabels } from '../src/features/iteration-gallery/axis-label-layout.ts';
import type { AxisAnchor } from '../src/features/iteration-gallery/axis-label-layout.ts';

const anchors: AxisAnchor[] = [{ id: 'date', text: 'Sep 22', position: new THREE.Vector3(0, 100, -200), face: 'wall' }];
function camera() {
  const camera = new THREE.OrthographicCamera(-500, 500, 500, -500, .1, 10000);
  camera.position.set(1000, 850, 1000); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  return camera;
}
const matrix = (transform: string) => transform.slice(9, -1).split(',').map(Number);

test('zoom moves label anchors without shrinking or enlarging the text', () => {
  const view = camera();
  const before = projectAxisLabels(anchors, view, 800, 640)[0];
  view.zoom = .5; view.updateProjectionMatrix();
  const after = projectAxisLabels(anchors, view, 800, 640)[0];
  assert.equal(before.fontSize, after.fontSize);
  assert.deepEqual(matrix(before.transform).slice(0, 12), matrix(after.transform).slice(0, 12));
  assert.notDeepEqual(matrix(before.transform).slice(12, 14), matrix(after.transform).slice(12, 14));
});

test('date baselines follow the depth direction when the camera orbits', () => {
  const view = camera();
  for (const position of [[1000, 850, 1000], [800, 400, -1000]]) {
    view.position.set(...position as [number, number, number]); view.lookAt(0, 0, 0); view.updateMatrixWorld();
    const label = projectAxisLabels(anchors, view, 800, 640)[0];
    const values = matrix(label.transform);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(view.quaternion.clone().invert());
    assert.ok(Math.abs(values[0] * -direction.y - values[1] * direction.x) < 1e-8);
    assert.ok(values.every(Number.isFinite));
  }
});

test('viewport-based label sizes stay bounded on small and large panels', () => {
  const view = camera();
  const sizes = [200, 640, 1800].map(size => projectAxisLabels(anchors, view, size, size)[0].fontSize);
  assert.deepEqual(sizes, [8, 9, 11]);
});
