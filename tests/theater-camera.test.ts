import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from 'three';
import { frameCameraTurn } from '../src/features/iteration-gallery/theater-camera.ts';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

for (const depth of [400, 10000, 100000]) for (const zoom of [.5, 1, 2]) {
  test(`selected frame does not detour across a ${depth}-unit gallery at ${zoom}× zoom`, () => {
    const camera = new OrthographicCamera(-600, 600, 400, -400, .1, 1000000);
    const pivot = new Vector3(180, -130, -depth * .6);
    const lifted = pivot.clone().add(new Vector3(0, 24, 0));
    camera.position.copy(lifted).add(new Vector3(-depth, depth * .65, depth * 1.6));
    camera.lookAt(lifted.clone().add(new Vector3(140, -80, 0)));
    camera.zoom = zoom;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const original = camera.clone();
    const start = lifted.clone().project(camera);
    const target = [-320, 480, 220, -380] as const;
    const end = new Vector3(-.2, 160 / 600, 0);
    const turn = frameCameraTurn(camera, lifted, pivot, target, depth * 2);
    // Forward and reverse both stay on the same path, including the hover lift.
    for (const step of [...Array.from({ length: 101 }, (_, index) => index), ...Array.from({ length: 101 }, (_, index) => 100 - index)]) {
      const progress = step / 100;
      turn(progress); camera.updateMatrixWorld();
      const projected = new Vector3().lerpVectors(lifted, pivot, progress).project(camera);
      near(projected.x, start.x + (end.x - start.x) * progress);
      near(projected.y, start.y + (end.y - start.y) * progress);
      assert.ok(Number.isFinite(projected.z));
    }
    near(camera.position.distanceTo(original.position), 0);
    near(Math.abs(camera.quaternion.dot(original.quaternion)), 1);
    // Normalizing zoom into the frustum must preserve the entire starting image.
    const corner = lifted.clone().add(new Vector3(180, 130, 0));
    near(corner.clone().project(camera).distanceTo(corner.clone().project(original)), 0);
    turn(1);
    near(camera.position.distanceTo(pivot.clone().add(new Vector3(0, 0, depth * 2))), 0);
  });
}
