import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logoGeometry } from '../src/features/workbench/landing-intro.ts';
import { IMPACT_INTRO, impactBands, impactLoopStart, throwMagnification } from '../src/features/workbench/landing-impact.ts';

const asset = (name:string) => readFileSync(new URL(`../src/assets/${name}`, import.meta.url), 'utf8');
const geometry = logoGeometry(asset('logo-shape-part.svg'), asset('logo-shape.svg'));
const viewport = { width:1440, height:900 };
const target = { x:600, y:430, width:geometry.width * 1.5, height:geometry.height * 1.5 };
const width = (band:{ x0:number; x1:number }) => band.x1 - band.x0;

test('a thrown frame eases from a drastic magnification into its slot without overshoot', () => {
  assert.equal(throwMagnification(0, .1), null);
  let previous = Infinity;
  for (let time = .1; time <= .1 + IMPACT_INTRO.throwDuration + .5; time += .01) {
    const magnification = throwMagnification(time, .1)!;
    assert.ok(magnification >= 1 - 1e-9 && magnification <= previous + 1e-9, 'shrinks monotonically and never passes its slot');
    previous = magnification;
  }
  assert.equal(previous, 1);
});

test('version 3 never multiplies: frames arrive one at a time, starting drastically larger', () => {
  const first = impactBands(IMPACT_INTRO.throwStart + .02, viewport, target, geometry);
  assert.equal(first.length, 1);
  const settled = impactBands(IMPACT_INTRO.dropStart - .01, viewport, target, geometry);
  assert.equal(settled.length, IMPACT_INTRO.frames);
  assert.ok(width(first[0]) > width(settled[0]) * 8, 'the throw starts at a drastic scale');
  for (let index = 1; index < settled.length; index += 1) assert.ok(settled[index].x0 > settled[index - 1].x1, 'piled white frames never touch');
});

test('version 3 drops the pile onto the two logo frames, then loops seamlessly', () => {
  const logo = impactBands(IMPACT_INTRO.dropStart + IMPACT_INTRO.dropDuration, viewport, target, geometry);
  const scale = target.height / geometry.height;
  assert.deepEqual([...new Set(logo.map(band => Math.round((band.x0 - target.x) / scale * 100)))].sort((a, b) => a - b), [0, Math.round(geometry.offset.x * 100)]);
  const period = IMPACT_INTRO.loop.period;
  assert.equal(impactBands(impactLoopStart + .01, viewport, target, geometry).length, 0);
  assert.equal(impactBands(impactLoopStart + period - .01, viewport, target, geometry).length, 0);
  const a = impactBands(impactLoopStart + 3, viewport, target, geometry), b = impactBands(impactLoopStart + 3 + period, viewport, target, geometry);
  a.forEach((band, index) => assert.ok(Math.abs(band.x0 - b[index].x0) < 1e-6));
});
