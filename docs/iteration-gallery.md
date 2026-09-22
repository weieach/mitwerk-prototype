# Iteration Gallery implementation

The left panel implements the Idea 2 album and frontal theater views in React and TypeScript. Three.js renders true 3D wireframe blocks and screenshot planes with an orthographic camera. OrbitControls rotates the album by dragging, pans with right-drag, and zooms with the wheel or existing header controls. Center view restores the initial isometric angle centered on the first in-range frame. Hovering a middle frame inspects it without moving the camera; travel starts only after a dwell at the panel edge, and then Center view follows the highlighted frame. Reset view fits the shared-size blocks at 1.27× the previous overview scale, drops them lower in the viewport, and that fitted scale is 100%. Default scale derives from that block’s dimensions and `frontViewPadding`, not total history length; later blocks may extend beyond the viewport. The frame dropdown sits under the viewport. Rotation instructions stay in a filled row below that dropdown. Center view and Reset view sit on the header zoom row at the far right as individual filled, bordered buttons. The caption under the viewport has no border. Version labels lie on the ground parallel to block width, spaced off the volume; date labels sit outside the left wall and face outward; hover captions stay coplanar with their frame. Frames fill more of the shared envelope. The footer shows in-range/total saved frames and versions beside the date range, collapsing to one number when they match. The existing typography and colors are reused; no external design system is added.

## Capture contract

Read `[frame capture] screenshots/` using this filename pattern:

`[prompt #52] +416-61 · summary-2026-09-22-092300.png`

`[prompt #53] iteration-gallery-prelim-render · +702-16 · summary-2026-09-22-095011.png`

`[push #10] 57 files · +416 -61 · summary-2026-09-22-091613.png`

Off-`main` git branches appear after the tag and before the line delta. The parser also accepts unnumbered legacy prompt/push tags, compact `k`/`m` change counts, `-vN` collision suffixes, and legacy `Screenshot YYYY-MM-DD at HH.MM.SS.png` names. It validates calendar dates, ignores unrecognized or unreadable PNGs with a visible skipped count, and ignores non-PNG artifacts. Filename timestamps use the local capture timezone because filenames contain no offset.

Files are sorted by timestamp and then filename. Each numbered push closes its version; earlier intervening captures belong to that version. Captures after the latest push use the next number. This is a capture-history convention, not a correspondence to the editable Version stream nodes or Git commit hashes.

The Vite catalog caches file discovery, invalidates on folder changes, and the client refreshes every 30 seconds. Production builds embed the manifest and image assets, making the same gallery available without a development API. Rebuild to include new captures in production. Missing directories and empty ranges have empty states.

## Rendering and interaction

- `model.ts`: filename parsing, version grouping, calendar filtering, date ticks and pure playback transitions.
- `geometry.ts`: aspect-preserving image fitting, padded block envelopes, per-frame hit regions, active/inactive chunk boundaries without coupling the data layout to the renderer.
- `tokens.ts`: geometry, opacity, label, motion, zoom and playback values.
- `AlbumScene.ts`: WebGL scene, camera controls, raycast slice selection, projected labels, opacity/lift transitions and GPU resource cleanup. Images are loaded on demand into a bounded texture cache; rendering stops when the scene is idle.
- `AlbumView.tsx`: React lifecycle, frame inspection, reset-view control and an accessible frame selector that also works when WebGL is unavailable.
- `TheaterView.tsx`: image inspection, metadata, viewport controls, timeline and playback.
- `IterationGallery.tsx`: catalog lifecycle, date filtering and view selection.
- `server/gallery-catalog.ts`: discovery, PNG dimension inspection, development routes and build assets.

Each version occupies one equal depth slot. Frames subdivide its padded interior; date ticks use actual first-frame depth, so sparse and dense days occupy different lengths. Every block uses the largest padded envelope required by any saved frame, so mixed screenshot aspect ratios stay the same block size without stretching images. Date filtering never deletes historical geometry: blocks split at range boundaries and inactive parts fade. Version labels lie on the ground parallel to block width; date labels sit on the left wall. Hover captions are meshes on the frame plane. There are no continuous longitudinal ruler lines. Drag gestures never activate frame playback. Arrow keys rotate a focused canvas; Home resets the view. Date filters preserve the current orbit; clicking a frame still opens the existing theater.

## Prototype boundaries

The gallery includes all prompt and push captures. The Project preview/source row has been removed; the total saved-frame count sits beside the date-range dropdown. The folder does not identify target files such as `index.html`, so no fabricated file selector is shown. The attached file is the actual saved PNG, accessible in theater view.

These are recorded images, not archived interactive pages: viewport presets demonstrate framing without responsive reflow. Filenames contain no commit IDs, chat references, token usage or Version stream node IDs. Associated controls stay disabled with explanations; synchronized branch playback awaits that linkage. No capture-specific mappings are hardcoded.

## Run and verify

Use `npm run dev` at `http://localhost:5173/`; the port is fixed. `npm test` covers capture parsing, grouping, ranges, geometry and playback alongside the existing graph suite. `npm run build` type-checks and packages the real gallery assets. The progress-capture browser keeps GPU rendering enabled so captures include the WebGL album.

Use `node scripts/screenshot-progress.mjs --tag prompt --gallery-hover --label "…"` when a hovered-frame capture is requested. It selects an in-range frame nearest the album center through the normal inspection behavior and waits for the image and lift animation.

The album displays one representative image per three in-range versions, rounding up. Evenly spaced version indices include the sequence endpoints when more than one image is shown; each sampled version prefers an in-range push and otherwise its latest in-range capture. Hover adds the inspected image without removing the representatives. Axis titles sit on the same ground and wall planes as their ticks, at the middle of the album depth.

Hovering a block near any viewport edge starts travel only after a shared dwell delay. In Center view the camera then follows the highlighted frame. Leaving the edge or viewport, or beginning a drag, stops travel. The end of the sequence bounds the movement. For an overview capture, pass `--gallery-view reset` to the progress-capture script. For a hovered middle frame, pass `--gallery-hover` or mention hover in the prompt.
