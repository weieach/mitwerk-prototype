import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logoGeometry } from '../src/features/workbench/landing-intro.ts';
import { MULTIPLY_INTRO, leafDepth, multiplyBands, multiplySettleTime } from '../src/features/workbench/landing-multiply.ts';

const asset = (name:string) => readFileSync(new URL(`../src/assets/${name}`, import.meta.url), 'utf8');
const geometry = logoGeometry(asset('logo-shape-part.svg'), asset('logo-shape.svg'));
const viewport = { width:1440, height:900 };
const target = { x:600, y:430, width:geometry.width * 1.5, height:geometry.height * 1.5 };
const leaves = 2 ** MULTIPLY_INTRO.levels;
const distinct = (values:number[]) => new Set(values.map(value => Math.round(value * 1000))).size;

test('the stack doubles from one frame at each split level', () => {
  for (let level = 0; level <= MULTIPLY_INTRO.levels; level += 1) {
    assert.equal(distinct(Array.from({ length:leaves }, (_, index) => leafDepth(index, level))), 2 ** level);
  }
});

test('version 2 opens with a single frame and spreads along the diagonal depth axis, not vertically', () => {
  const opening = multiplyBands(MULTIPLY_INTRO.splitStart - .05, viewport, target, geometry);
  assert.equal(distinct(opening.map(band => band.x0)), 1);
  const spread = multiplyBands(MULTIPLY_INTRO.rippleStart - .05, viewport, target, geometry);
  assert.equal(distinct(spread.map(band => band.x0)), leaves);
  for (let index = 1; index < spread.length; index += 1) assert.ok(spread[index].x0 > spread[index - 1].x0, 'each frame steps right along depth');
});

test('version 2 folds onto the two logo frames, then loops seamlessly', () => {
  const logo = multiplyBands(MULTIPLY_INTRO.collapseStart + MULTIPLY_INTRO.collapseDuration, viewport, target, geometry);
  const scale = target.height / geometry.height;
  assert.deepEqual([...new Set(logo.map(band => Math.round((band.x0 - target.x) / scale * 1000)))].sort((a, b) => a - b), [0, Math.round(geometry.offset.x * 1000)]);
  const period = MULTIPLY_INTRO.loop.period;
  const a = multiplyBands(multiplySettleTime + 1, viewport, target, geometry), b = multiplyBands(multiplySettleTime + 1 + period, viewport, target, geometry);
  a.forEach((band, index) => assert.ok(Math.abs(band.x0 - b[index].x0) < 1e-6 && Math.abs(band.top[0] - b[index].top[0]) < 1e-6));
});
