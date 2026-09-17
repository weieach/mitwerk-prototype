# Version tree implementation

The screen is split into equal halves. The left half is intentionally blank. The right half contains the version-tree canvas and its navigation controls.

The implementation uses TypeScript, React, SVG, and local CSS. There is no external design system, component library, icon package, or CSS framework.

- `model.ts` defines version data and immutable graph actions.
- `layout.ts` derives station positions and connectors from parent relationships, using shared isometric geometry.
- `tokens.ts` holds route colors, line weights, station size, and zoom limits.
- `presentation.ts` derives the selected branch, horizontal sibling connectors, station fill state, and endpoint marker. Shared design rules are recorded in [design-system-rules.md](design-system-rules.md).
- `IsometricGrid.tsx`, `VersionCard.tsx`, and `VersionTreePanel.tsx` are reusable rendering components.

The canvas starts with one empty version. Add branch creates an empty version to its right on the same row. Add commit creates an empty version directly below; existing commits on that line shift down. Node details include save type, references, skills, changed files, prompt counts, and a summary when data is available.

Drag the background or scroll to pan. Use the canvas controls or Ctrl/Command + scroll to zoom. The graph is saved in the browser and restored on refresh. These controls do not create Git commits or run agents.

Version positions are calculated rather than stored. Geometry tests cover growth to 164 nodes, repeated commits, nested branches, lattice alignment, and connector clearance around cards.

Run `npm run dev` for the live server, `npm test` for graph tests, and `npm run build` for TypeScript and production-build checks.
