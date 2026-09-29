import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readTokenUsage } from '../server/token-usage.ts';
import { tokenUsageArea } from '../src/features/iteration-gallery/token-usage.ts';
import type { FramePlane } from '../src/features/iteration-gallery/geometry.ts';

function plane(total: number, depth: number, active = true): FramePlane {
  return { frame: { id: String(depth), tokenUsage: { input: total, output: 0, total, simulated: true } } as FramePlane['frame'],
    x: 10, y: 10, width: 300, height: 200, depth, hitStart: depth - 5, hitEnd: depth + 5, active };
}
test('sample usage is saved once, preserves prior frames and initializes new captures', () => {
  const root = mkdtempSync(join(tmpdir(), 'mitwerk-token-test-'));
  try {
    const first = readTokenUsage(root, ['a', 'b']);
    const next = readTokenUsage(root, ['a', 'b', 'c']);
    assert.deepEqual(next.a, first.a); assert.deepEqual(next.b, first.b);
    assert.equal(next.c.total, next.c.input + next.c.output);
    assert.equal(next.c.simulated, true);
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'data/token-usage.json'), 'utf8')), next);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('selected range accumulates tokens to 100 percent of its total', () => {
  const chart = tokenUsageArea([plane(1000, 0, false), plane(20, 10), plane(80, 20)]);
  assert.equal(chart.total, 100);
  assert.deepEqual(chart.samples.map(bar => bar.ratio), [.2, 1]);
  assert.deepEqual(chart.outline, [{ x: 310, depth: 10 }, { x: 250, depth: 10 }, { x: 10, depth: 20 }, { x: 310, depth: 20 }]);
});
test('empty and zero usage ranges have no invalid geometry', () => {
  assert.deepEqual(tokenUsageArea([]), { total: 0, baseline: 0, height: 0, samples: [], outline: [], segments: [], bars: [] });
  const chart = tokenUsageArea([plane(0, 10)]);
  assert.equal(chart.samples[0].ratio, 0); assert.deepEqual(chart.outline, []);
});

test('uneven frame spacing keeps a shared bottom baseline and monotonic cumulative area', () => {
  const frames = [plane(10, 0), plane(0, 2), plane(30, 20), plane(60, 100)];
  const chart = tokenUsageArea(frames.reverse());
  assert.deepEqual(chart.samples.map(bar => bar.ratio), [.1, .1, .4, 1]);
  assert.deepEqual(chart.samples.map(bar => bar.cumulative), [10, 10, 40, 100]);
  assert.equal(chart.baseline, 310);
  assert.equal(chart.outline[0].x, chart.outline.at(-1)!.x);
  assert.ok(chart.outline.every(point => point.x >= chart.baseline - chart.height && point.x <= chart.baseline));
});


test('branch runs share interpolated boundaries and the same cumulative scale', () => {
  const frames = [plane(10, 10), plane(20, 20), plane(30, 40), plane(40, 60)];
  frames[1].frame.branch = frames[2].frame.branch = 'experiment';
  const chart = tokenUsageArea(frames);
  assert.deepEqual(chart.segments.map(segment => segment.branch), ['main', 'experiment', 'main']);
  assert.deepEqual(chart.segments[0].outline.at(-2), chart.segments[1].outline[1]);
  assert.deepEqual(chart.segments[1].outline.at(-2), chart.segments[2].outline[1]);
  assert.equal(chart.outline[0].depth, frames[0].depth);
  assert.equal(chart.outline.at(-1)!.depth, frames.at(-1)!.depth);
  assert.ok(chart.outline[0].depth > frames[0].hitStart);
  assert.ok(chart.outline.at(-1)!.depth < frames.at(-1)!.hitEnd);
  assert.equal(new Set(chart.bars.map(bar => bar.width)).size, 1);
  assert.deepEqual(chart.bars.map(bar => bar.height), [30, 90, 180, 300]);
});

test('a single-frame branch retains its own area run between surrounding branches', () => {
  const frames = [plane(20, 10), plane(10, 20), plane(30, 30)];
  frames[0].frame.branch = frames[2].frame.branch = 'gallery';
  frames[1].frame.branch = 'webgl';
  const chart = tokenUsageArea(frames);
  assert.deepEqual(chart.segments.map(segment => segment.branch), ['gallery', 'webgl', 'gallery']);
  assert.equal(chart.segments[1].outline[0].depth, 15);
  assert.equal(chart.segments[1].outline.at(-1)!.depth, 25);
  frames[1].active = false;
  const filtered = tokenUsageArea(frames);
  assert.equal(filtered.total, 50);
  assert.deepEqual(filtered.segments.map(segment => segment.branch), ['gallery']);
});
