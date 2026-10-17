import test from 'node:test';
import assert from 'node:assert/strict';
import { createXRManifest, xrTokens } from '../src/features/iteration-gallery/xr-export.ts';
import type { Capture } from '../src/features/iteration-gallery/model.ts';
const date = (day: number) => new Date(2026, 8, day, 12).getTime();
const frame = (id: string, day: number, width: number, height: number, kind: Capture['kind'] = 'prompt', number = 1): Capture => ({ id, filename: `${id}.png`, url: id, timestamp: date(day), width, height, kind, number, branch: null, summary: id, added: null, removed: null });

test('XR export preserves screenshot aspect ratios inside a shared padded meter-based envelope', () => {
  const result = createXRManifest([frame('wide', 1, 1600, 900), frame('portrait', 1, 900, 1600, 'push')], 'all', date(2));
  assert.equal(result.coordinates.units, 'meters');
  assert.equal(result.blocks[0].size[0], xrTokens.albumWidthMeters);
  for (const item of result.frames) {
    assert.ok(Math.abs(item.size[0] / item.size[1] - item.pixelSize[0] / item.pixelSize[1]) < 1e-10);
    assert.ok(item.size[0] < result.blocks[0].size[0]);
    assert.ok(item.size[1] < result.blocks[0].size[1]);
    assert.ok(item.image.startsWith('screenshots/'));
  }
});
test('both axis sets are world geometry and perpendicular to chronological depth', () => {
  const result = createXRManifest([frame('one', 1, 1200, 900, 'push', 1), frame('two', 2, 1200, 900, 'push', 2)], 'all', date(3));
  assert.ok(result.axes.guides.some(guide => guide.axis === 'date'));
  assert.ok(result.axes.guides.some(guide => guide.axis === 'version'));
  for (const guide of result.axes.guides) assert.equal(guide.points[0][2], guide.points[1][2]);
  assert.equal(result.axes.labels.find(label => label.id === 'date-title')?.rotation[1], -Math.PI / 2);
  assert.equal(result.axes.labels.find(label => label.id === 'version-title')?.rotation[0], -Math.PI / 2);
});
test('range export retains disabled history and marks only in-range representative frames', () => {
  const result = createXRManifest([frame('old', 1, 1200, 900, 'push', 1), frame('new', 10, 1200, 900, 'push', 2)], 'today', date(10));
  assert.equal(result.blocks.length, 2);
  assert.equal(result.frames[0].active, false);
  assert.equal(result.frames[0].showAtRest, false);
  assert.equal(result.frames[1].active, true);
  assert.equal(result.frames[1].showAtRest, true);
});
