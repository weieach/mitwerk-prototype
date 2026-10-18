import test from 'node:test';
import assert from 'node:assert/strict';
import { featureNames, featurePalettes, inviteGradientStops, paletteStylesheet } from '../src/shared/palette.ts';
import { palerAccent } from '../src/features/version-tree/tokens.ts';

function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  return { saturation, lightness };
}

test('light accents are a little darker and at least as saturated as their dark counterparts', () => {
  for (const name of featureNames) {
    const dark = hsl(featurePalettes.dark[name]), light = hsl(featurePalettes.light[name]);
    assert.ok(light.lightness < dark.lightness - .08 && light.lightness > dark.lightness - .16, name);
    assert.ok(light.saturation >= dark.saturation - 1e-6, name);
  }
});

test('the palette stylesheet keys accents and milestone gradient stops to the theme', () => {
  const css = paletteStylesheet();
  const [light, dark] = css.split(':root[data-theme=dark]');
  for (const name of featureNames) {
    assert.ok(light.includes(`--mw-${name}:${featurePalettes.light[name]};`));
    assert.ok(dark.includes(`--mw-${name}:${featurePalettes.dark[name]};`));
  }
  // Dark keeps the accents over black; light washes them toward white with dark ink.
  assert.match(dark, /--milestone-invite-dock:color-mix\(in srgb, var\(--mw-dock\) var\(--milestone-invite-color-strength\), black\)/);
  assert.match(light, /--milestone-invite-dock:color-mix\(in srgb, var\(--mw-dock\) \d+%, white\)/);
  assert.match(light, /--milestone-invite-ink:#191a1b/);
  assert.deepEqual(inviteGradientStops, featureNames.map(name => `var(--milestone-invite-${name})`));
});

test('merged-branch accents stay paler for theme-following palette references', () => {
  assert.equal(palerAccent('var(--mw-dock)'), 'color-mix(in srgb, var(--mw-dock), white 45%)');
  assert.equal(palerAccent('var(--contrast)'), 'var(--contrast)');
});
