import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANDING_INTRO, landingBands, landingPhase, logoGeometry, pathPoints, settleTime } from '../src/features/workbench/landing-intro.ts';

const asset = (name:string) => readFileSync(new URL(`../src/assets/${name}`, import.meta.url), 'utf8');
const geometry = logoGeometry(asset('logo-shape-part.svg'), asset('logo-shape.svg'));
const viewport = { width:1440, height:900 };
const target = { x:600, y:430, width:geometry.width * 1.5, height:geometry.height * 1.5 };
const near = (actual:number, expected:number, tolerance = 1e-3) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

test('frame and stacking offset come from the two logo assets', () => {
  // The verso logomark's shape (final-logomark.svg): two 72-unit frames, the second offset by 24 × 17.
  near(geometry.frame.width, 72);
  near(geometry.frame.topRight, 0);
  near(geometry.frame.bottomLeft, 103);
  near(geometry.offset.x, 24);
  near(geometry.offset.y, 17);
  assert.equal(pathPoints('M0 0h2v3H0z').length, 4);
});

test('the intro collapses every band onto one of the two logo frames at the logo box', () => {
  const time = LANDING_INTRO.collapseStart + LANDING_INTRO.collapseDuration;
  const bands = landingBands(time, viewport, target, geometry);
  const scale = target.height / geometry.height;
  const lefts = [...new Set(bands.map(band => Math.round((band.x0 - target.x) / scale * 1000) / 1000))].sort((a, b) => a - b);
  assert.deepEqual(lefts, [0, Math.round(geometry.offset.x * 1000) / 1000]);
    near(Math.min(...bands.map(band => band.top[2])), target.y);
  near(Math.max(...bands.map(band => band.bottom[0])), target.y + target.height);
});

test('phases advance from playing to revealed to settled, then bands loop full-width', () => {
  assert.equal(landingPhase(0), 'playing');
  assert.equal(landingPhase(LANDING_INTRO.revealAt), 'revealed');
  assert.equal(landingPhase(settleTime), 'settled');
  const looping = landingBands(settleTime + 3, viewport, target, geometry);
  for (const band of looping) { near(band.x0, viewport.width * LANDING_INTRO.margin); }
});

test('looping bands never overlap their neighbors as the bulge travels', () => {
  for (let time = settleTime; time < settleTime + 8; time += .25) {
    const bands = landingBands(time, viewport, target, geometry);
    for (let index = 1; index < bands.length; index += 1) {
      const above = bands[index - 1], below = bands[index];
      assert.ok(below.top[0] > above.bottom[0] && below.top[2] > above.bottom[2], `bands ${index - 1}/${index} overlap at ${time}`);
    }
  }
});
