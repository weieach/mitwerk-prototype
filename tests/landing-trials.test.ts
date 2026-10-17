import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logoGeometry } from '../src/features/workbench/landing-intro.ts';
import { TRIAL_INTRO, flattenIntro, flatScene, unfoldIntro } from '../src/features/workbench/landing-trials.ts';

const asset = (name:string) => readFileSync(new URL(`../src/assets/${name}`, import.meta.url), 'utf8');
const geometry = logoGeometry(asset('logo-shape-part.svg'), asset('logo-shape.svg'));
const viewport = { width:1440, height:900 };
const target = { x:600, y:430, width:geometry.width * 1.5, height:geometry.height * 1.5 };
const lefts = (bands:{ x0:number }[]) => new Set(bands.map(band => Math.round(band.x0 * 100))).size;

test('flatten trial: many separated frames flatten into one, then become the logo', () => {
  const f = TRIAL_INTRO.flatten;
  const spread = flattenIntro.bands(f.flattenStart - .01, viewport, target, geometry);
  assert.equal(lefts(spread), TRIAL_INTRO.frames);
  for (let index = 1; index < spread.length; index += 1) assert.ok(spread[index].x0 > spread[index - 1].x1, 'spread white frames never touch');
  assert.equal(lefts(flattenIntro.bands(f.flattenStart + f.flattenDuration, viewport, target, geometry)), 1);
  assert.equal(lefts(flattenIntro.bands(f.logoStart + f.logoDuration, viewport, target, geometry)), 2);
});

test('unfold trial (reverse): one frame unfolds into many, then becomes the logo', () => {
  const u = TRIAL_INTRO.unfold;
  assert.equal(lefts(unfoldIntro.bands(u.unfoldStart - .01, viewport, target, geometry)), 1);
  assert.equal(lefts(unfoldIntro.bands(u.unfoldStart + u.unfoldDuration + .5, viewport, target, geometry)), TRIAL_INTRO.frames);
  assert.equal(lefts(unfoldIntro.bands(u.logoStart + u.logoDuration, viewport, target, geometry)), 2);
});

test('trial loops alternate spread and single frame seamlessly', () => {
  assert.equal(new Set(flatScene(1, viewport, geometry).depths).size, 1);
  for (const intro of [flattenIntro, unfoldIntro]) {
    const a = intro.bands(intro.settleTime + 1, viewport, target, geometry), b = intro.bands(intro.settleTime + 1 + TRIAL_INTRO.loop.period, viewport, target, geometry);
    a.forEach((band, index) => assert.ok(Math.abs(band.x0 - b[index].x0) < 1e-6 && Math.abs(band.top[0] - b[index].top[0]) < 1e-6));
  }
});
