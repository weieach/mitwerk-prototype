import test from 'node:test';
import assert from 'node:assert/strict';
import { simulationAdvanced } from '../src/features/iteration-gallery/playback-selection.ts';

test('entering Playback with an active simulator preserves the clicked prompt', () => {
  // Gallery, turn animation, then Playback: the newest frame has not changed.
  for (const active of [false, false, true]) {
    assert.equal(simulationAdvanced('latest', 'latest', true, active), false);
  }
  // Subsequent manual selections also leave the simulator cutoff unchanged.
  assert.equal(simulationAdvanced('latest', 'latest', true, true), false);
});

test('Playback still follows the simulator when work is added or removed', () => {
  assert.equal(simulationAdvanced('older', 'newer', true, true), true);
  assert.equal(simulationAdvanced('newer', 'older', true, true), true);
  assert.equal(simulationAdvanced('older', undefined, true, true), false);
  assert.equal(simulationAdvanced('older', 'newer', false, true), false);
});

test('a change in the gallery is consumed before opening a chosen frame', () => {
  assert.equal(simulationAdvanced('older', 'newer', true, false), false);
  assert.equal(simulationAdvanced('newer', 'newer', true, true), false);
});
