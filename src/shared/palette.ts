/** Shared feature and route accents. Blue retains its existing theme treatment. */
export const featurePalette = {
  dock: '#7A9EF7', route: '#FFD65A', assemble: '#25D895',
  handoff: '#FF89CF', pulse: '#FF9558', misregister: '#B39AFF',
} as const;

export function installFeaturePalette() {
  for (const [name, color] of Object.entries(featurePalette)) {
    document.documentElement.style.setProperty(`--mw-${name}`, color);
  }
}
