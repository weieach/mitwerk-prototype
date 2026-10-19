/**
 * Shared feature and route accents (branch colors, statuses, feature tags), one palette per theme.
 * Dark is the reference. Light is the same hues about 12 points darker and 8% more saturated, so
 * lines and dots hold up on light surfaces. Both UI blues (`--werk-blue`, `--cursor-blue`) are separate.
 */
export const featurePalettes = {
  dark: {
    dock: '#7A9EF7', route: '#FFD65A', assemble: '#25D895',
    handoff: '#FF89CF', pulse: '#FF9558', misregister: '#B39AFF',
  },
  light: {
    dock: '#3870FC', route: '#FFC71D', assemble: '#14AB73',
    handoff: '#FF4CB6', pulse: '#FF6E1B', misregister: '#855DFF',
  },
} as const;

export type FeatureName = keyof typeof featurePalettes.dark;
export const featureNames = Object.keys(featurePalettes.dark) as FeatureName[];

/** Theme-following references. DOM and SVG use them directly; canvases resolve them first. */
export const featurePalette = Object.fromEntries(featureNames.map(name => [name, `var(--mw-${name})`])) as Record<FeatureName, string>;

/**
 * The version card's flowing milestone gradient has its own variant per theme: dark keeps the
 * accents mixed over black; light is a lighter wash of the light accents, with dark ink.
 */
export const inviteGradient = {
  dark: { stop: (name: FeatureName) => `color-mix(in srgb, var(--mw-${name}) var(--milestone-invite-color-strength), black)`, ink: '#fff' },
  light: { stop: (name: FeatureName) => `color-mix(in srgb, var(--mw-${name}) 72%, white)`, ink: '#191a1b' },
} as const;

/** Adjacent hues blend cleanly instead of mixing complementary accents into gray. */
export const inviteGradientStops = (['dock', 'misregister', 'handoff', 'pulse', 'route', 'assemble'] satisfies FeatureName[]).map(name => `var(--milestone-invite-${name})`);

export function paletteStylesheet() {
  const block = (theme: 'light' | 'dark') => [
    ...featureNames.map(name => `--mw-${name}:${featurePalettes[theme][name]};`),
    ...featureNames.map(name => `--milestone-invite-${name}:${inviteGradient[theme].stop(name)};`),
    `--milestone-invite-ink:${inviteGradient[theme].ink};`,
  ].join('');
  return `:root{${block('light')}}:root[data-theme=dark]{${block('dark')}}`;
}

export function installFeaturePalette() {
  const style = document.getElementById('mw-feature-palette') ?? document.head.appendChild(Object.assign(document.createElement('style'), { id: 'mw-feature-palette' }));
  style.textContent = paletteStylesheet();
}
