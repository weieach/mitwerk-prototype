# Iteration Gallery implementation

The left panel implements the Idea 2 album and frontal theater views in React and TypeScript. SVG provides the isometric projection, wireframes and accessible slice targets; actual PNGs provide the content. No 3D engine or external design system is needed for this fixed projection.

## Capture contract

Read `[frame capture] screenshots/` using this filename pattern:

`[prompt #52] +416-61 · summary-2026-09-22-092300.png`

`[prompt #53] iteration-gallery-prelim-render · +702-16 · summary-2026-09-22-095011.png`

`[push #10] 57 files · +416 -61 · summary-2026-09-22-091613.png`

Off-`main` git branches appear after the tag and before the line delta. The parser also accepts unnumbered legacy prompt/push tags, compact `k`/`m` change counts, `-vN` collision suffixes, and legacy `Screenshot YYYY-MM-DD at HH.MM.SS.png` names. It validates calendar dates, ignores unrecognized or unreadable PNGs with a visible skipped count, and ignores non-PNG artifacts. Filename timestamps use the local capture timezone because filenames contain no offset.

Files are sorted by timestamp and then filename. Each numbered push closes its version; earlier intervening captures belong to that version. Captures after the latest push use the next number. Source filtering happens after version assignment, so toggling prompt/push frames cannot renumber history. This is a capture-history convention, not a correspondence to the editable Version stream nodes or Git commit hashes.

The Vite catalog caches file discovery, invalidates on folder changes, and the client refreshes every 30 seconds. Production builds embed the manifest and image assets, making the same gallery available without a development API. Rebuild to include new captures in production. Missing directories and empty ranges have empty states.

## Rendering and interaction

- `model.ts`: filename parsing, version grouping, calendar filtering, date ticks and pure playback transitions.
- `geometry.ts`: aspect-preserving image fitting, padded block envelopes, per-frame hit regions, active/inactive chunk boundaries and orthographic isometric projection.
- `tokens.ts`: geometry, opacity, label, motion, zoom and playback values.
- `AlbumView.tsx`: sparse image rendering (first/last plus hovered), all slice outlines, rulers, hover/focus inspection and keyboard activation.
- `TheaterView.tsx`: image inspection, metadata, viewport controls, timeline and playback.
- `IterationGallery.tsx`: catalog lifecycle, source/date filters and view selection.
- `server/gallery-catalog.ts`: discovery, PNG dimension inspection, development routes and build assets.

Each version occupies one equal depth slot. Frames subdivide its padded interior; date ticks use actual first-frame depth, so sparse and dense days occupy different lengths. Mixed image dimensions share a containing envelope without stretching images. Date filtering never deletes historical geometry: blocks split at range boundaries and inactive parts fade. SVG rulers counter-scale for legibility at different panel sizes.

## Prototype boundaries

The source selector chooses all, prompt or push captures of the project preview. The folder does not identify target files such as `index.html`, so no fabricated file selector is shown. The attached file is the actual saved PNG, accessible in theater view.

These are recorded images, not archived interactive pages: viewport presets demonstrate framing without responsive reflow. Filenames contain no commit IDs, chat references, token usage or Version stream node IDs. Associated controls stay disabled with explanations; synchronized branch playback awaits that linkage. No capture-specific mappings are hardcoded.

## Run and verify

Use `npm run dev` at `http://localhost:5173/`; the port is fixed. `npm test` covers capture parsing, grouping, ranges, geometry and playback alongside the existing graph suite. `npm run build` type-checks and packages the real gallery assets.
