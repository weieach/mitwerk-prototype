import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logoGeometry } from '../src/features/workbench/landing-intro.ts';
import { turnIntro, TURN_INTRO } from '../src/features/workbench/landing-turn.ts';

const asset = (name:string) => readFileSync(new URL(`../src/assets/${name}`, import.meta.url), 'utf8');
const geometry = logoGeometry(asset('logo-shape-part.svg'), asset('logo-shape.svg'));
const viewport = { width:1440, height:900 };
const target = { x:600, y:430, width:geometry.width, height:geometry.height };

test('opening reads as one gray rectangle covering the viewport, then turns and separates', () => {
  const opening = turnIntro.bands(0, viewport, target, geometry);
  assert.ok(opening.every(band => JSON.stringify(band) === JSON.stringify(opening[0])));
  assert.ok(opening[0].x0 < 0 && opening[0].x1 > viewport.width);
  assert.ok(opening[0].top.every(y => y < 0) && opening[0].bottom.every(y => y > viewport.height));
  assert.equal(turnIntro.illumination?.(0), 0);
  const spread = turnIntro.bands(TURN_INTRO.gatherStart, viewport, target, geometry);
  assert.equal(new Set(spread.map(band => band.x0)).size, TURN_INTRO.frames);
  assert.ok(spread.every(band => band.top[0] > band.top[2]));
  assert.equal(turnIntro.illumination?.(TURN_INTRO.gatherStart), TURN_INTRO.backlitFace);
  assert.equal(turnIntro.illumination?.(TURN_INTRO.revealAt), 1);
});

test('all sheets gather into exactly the two SVG slots and stay there', () => {
  const final = turnIntro.bands(turnIntro.revealAt, viewport, target, geometry);
  assert.deepEqual([...new Set(final.map(band => band.x0))], [target.x, target.x + geometry.offset.x]);
  assert.equal(Math.min(...final.flatMap(band => band.top)), target.y);
  assert.equal(Math.max(...final.flatMap(band => band.bottom)), target.y + target.height);
  assert.deepEqual(turnIntro.bands(30, viewport, target, geometry), final);
});


test('all sheets stay fully flattened through the turn and pause before expanding', () => {
  const turnEnd = TURN_INTRO.turnStart + TURN_INTRO.turnDuration;
  assert.ok(TURN_INTRO.spreadStart - turnEnd >= .29);
  for (const time of [0, 1.2, turnEnd, (turnEnd+TURN_INTRO.spreadStart)/2, TURN_INTRO.spreadStart]) {
    const bands = turnIntro.bands(time,viewport,target,geometry);
    assert.ok(bands.every(b=>JSON.stringify(b)===JSON.stringify(bands[0])));
  }
  const after = turnIntro.bands(TURN_INTRO.spreadStart+.4,viewport,target,geometry);
  assert.ok(new Set(after.map(b=>b.x0)).size>1);
  assert.ok(TURN_INTRO.light.z<0);
});


test('sheets fade during expansion and regain fill earlier in the final morph', () => {
  const t = TURN_INTRO;
  const fullyExpanded = t.spreadStart + t.spreadDuration + (t.frames - 1) / 2 * t.spreadStagger;
  assert.equal(turnIntro.fillOpacity!(t.spreadStart), 1);
  assert.ok(Math.abs(turnIntro.fillOpacity!((t.spreadStart+fullyExpanded)/2)-.5)<1e-6);
  assert.equal(turnIntro.fillOpacity!(fullyExpanded), 0);
  assert.equal(turnIntro.fillOpacity!(t.gatherStart), 0);
  assert.ok(turnIntro.fillOpacity!(t.gatherStart + .6)>0);
  assert.equal(turnIntro.fillOpacity!(t.gatherStart + .95), 1);
  assert.equal(turnIntro.fillOpacity!(t.revealAt), 1);
  for (let time=0;time<7;time+=.01) assert.ok(turnIntro.fillOpacity!(time)>=0 && turnIntro.fillOpacity!(time)<=1);
});
