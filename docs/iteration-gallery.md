# Iteration Gallery implementation

The left panel implements the Idea 2 album and frontal theater views in React and TypeScript. Three.js renders true 3D wireframe blocks and screenshot planes with an orthographic camera. OrbitControls rotates the album by dragging, pans with right-drag, and zooms with the wheel or existing header controls. Center view restores the default oblique angle (12 degrees counterclockwise on the ground plane), horizontally centered on the first in-range frame with the camera and target lifted by 15% of frame height. Hovering a middle frame inspects it without moving the camera; travel starts only after a dwell at the panel edge, and then Center view follows the highlighted frame. Reset view fits the shared-size blocks at 0.95× the base overview scale, centers the block volume vertically with no upward offset, and that fitted scale is 100%. Default scale derives from that block’s dimensions and `frontViewPadding`, not total history length; later blocks may extend beyond the viewport. The frame dropdown sits on a transparent, background-free row under the header, with a border on the dropdown itself. In theater view the back button sits to the left of the heading with a filled gray background. Go to commit and Add frame to chat sit immediately above the frame, aligned to its right edge as text buttons with leading icons; that frame is vertically centered, with its metadata immediately below and no Open saved frame or playback caption row. Its options use `[V11] - Sep 22, 10:07`. Open frame floats at the bottom of the viewport only after a dropdown selection, and opens that selection independently of hover. A tracked-interface dropdown (currently `index.html`) precedes the saved-frame selector in the album and the unlabeled viewport-size dropdown in theater. Navigation instructions live in an accessible info tooltip at the far right of that row. Center view and Reset view sit on the header zoom row at the far right as individual filled, bordered buttons. Version labels lie on the ground to the right of the blocks; date labels sit on the left wall, parallel to that face; hover captions stay coplanar, left-aligned, and scale with the viewport. Frames sit inside the shared block face with padding on each side. The footer shows in-range/total saved frames and versions beside the date range, collapsing to one number when they match. The existing typography and colors are reused; no external design system is added.

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
- `tokens.ts`: geometry, opacity, label, motion, zoom, playback and theater chrome values.
- `AxisLabels.tsx` / `axis-label-layout.ts`: React axis text, plane rotation, camera projection and viewport-based sizing.
- `AlbumScene.ts`: WebGL scene, camera controls, raycast slice selection, projected labels, opacity/lift transitions and GPU resource cleanup. Images are loaded on demand into a bounded texture cache; rendering stops when the scene is idle.
- `AlbumView.tsx`: React lifecycle, frame inspection, reset-view control and an accessible frame selector that also works when WebGL is unavailable.
- `TheaterView.tsx`: image inspection, metadata, viewport controls, timeline and playback.
- `IterationGallery.tsx`: catalog lifecycle, date filtering and view selection.
- `server/gallery-catalog.ts`: discovery, PNG dimension inspection, development routes and build assets.

Each version occupies one equal depth slot. Frames subdivide its padded interior; date ticks use actual first-frame depth, so sparse and dense days occupy different lengths. Every block uses the largest padded envelope required by any saved frame, so mixed screenshot aspect ratios stay the same block size without stretching images. Date filtering never deletes historical geometry: blocks split at range boundaries and inactive parts fade. Version labels lie on the ground parallel to block width; date labels sit on the left wall, turned 90° to run along depth. Actual perpendicular guide lines extend to the shared ruler clearance. The Version heading uses a separate larger title gap. Axis text uses an 8–11 px viewport-based range. Axis text is rendered in React with camera-derived CSS 3D transforms and viewport-based font sizes, so zoom changes position without shrinking the text. Hover captions sit above the frame with a shared gap, remain coplanar, and use white glyph shadows on a transparent texture. There are no continuous longitudinal ruler lines. Drag gestures never activate frame playback. Arrow keys rotate a focused canvas; Home resets the view. Date filters preserve the current orbit; clicking a frame still opens the existing theater.

## Prototype boundaries

The gallery includes all prompt and push captures. The Project preview/source row has been removed; the total saved-frame count sits beside the date-range dropdown. The folder does not identify target files such as `index.html`, so no fabricated file selector is shown. The attached file is the actual saved PNG, accessible in theater view.

These are recorded images, not archived interactive pages: viewport presets demonstrate framing without responsive reflow. Filenames contain no commit IDs, chat references, token usage or Version stream node IDs. Commit/chat actions remain normal-looking, nonfunctional prototype buttons; token usage stays disabled; synchronized branch playback awaits that linkage. No capture-specific mappings are hardcoded.

## Run and verify

Use `npm run dev` at `http://localhost:5173/`; the port is fixed. `npm test` covers capture parsing, grouping, ranges, geometry and playback alongside the existing graph suite. `npm run build` type-checks and packages the real gallery assets. The progress-capture browser keeps GPU rendering enabled so captures include the WebGL album.

Use `node scripts/screenshot-progress.mjs --tag prompt --gallery-hover --label "…"` when a hovered-frame capture is requested. It selects an in-range frame nearest the album center through the normal inspection behavior and waits for the image and lift animation.

The album displays one representative image per three in-range versions, rounding up. Evenly spaced version indices include the sequence endpoints when more than one image is shown; each sampled version prefers an in-range push and otherwise its latest in-range capture. Hover adds the inspected image without removing the representatives. Axis titles sit on the same ground and wall planes as their ticks, at the middle of the album depth.

Hovering a block near any viewport edge starts travel only after a shared dwell delay. In Center view the camera then follows the highlighted frame. Leaving the edge or viewport, or beginning a drag, stops travel. The end of the sequence bounds the movement. For an overview capture, pass `--gallery-view reset` to the progress-capture script. For a hovered middle frame, pass `--gallery-hover` or mention hover in the prompt. For theater view, pass `--gallery-view theater` or mention capturing in theater view.

### Album to theater motion

Opening a frame enters a temporary turning phase. The live WebGL camera smoothly rotates and moves toward the selected frame while other block geometry fades. The hidden theater layout supplies its measured image rectangle, so the frame arrives at the same position and scale. After the 1.1-second transformation, the WebGL view hands off to the frontal image and theater UI fades in over 280 ms. Shared `theaterMotion` tokens control timing; reduced-motion preferences skip both animations. Controls are disabled during the turn.

Use `node scripts/screenshot-progress.mjs --tag prompt --gallery-view transition --label "…"` or mention capturing midway through the transition to freeze the actual animation at its midpoint, including texture readiness, without prematurely showing theater controls.


Theater playback uses a bounded decoded-image cache and keeps the current frame visible until the next is ready. Dragging the image or open surrounding space directly orbits the live camera in two axes; releasing animates from that pose to Reset view. Whole control rows, their padding/margins/gaps, and metadata scrolling are excluded from drag initiation. Theater UI fades out during the handoff, which waits for the matching 3D texture. A click outside the frame without dragging plays the full reverse transition to Reset view; frame clicks share the unimplemented Go to commit placeholder. The explicit Gallery back button uses the same timed reverse transition to Reset view. The centered transport uses an icon-only play/pause button, with speed and loop aligned independently to the right. `PlaybackTimeline.tsx` renders one outer progress rectangle and an overhanging vertical playhead. `timeline.ts` assigns equal width to each version and derives smaller capture marks and pointer-to-frame lookup from the same data; arrow keys and wheel scrolling on the theater frame step through individual frames. The current capture catalog supplies the prototype commit marks, without inventing Git commit metadata.

Vertical date-axis guides fade early during the theater transition using a shared timing token. The timeline retains major/minor ruler marks without printing version numbers inside it; hover titles and accessible slider text retain version context.

The theater skip buttons navigate real push captures within the chosen range. Timeline hover temporarily previews a frame and metadata with a lighter second playhead, then restores the selected frame on leaving; click/drag commits a selection. Both ruler mark sizes are vertically centered and share the same color.

Theater captures select the configured prompt 56 reference. Its catalog dimensions define a stable theater frame size, with a fixed metadata region so previewing longer messages does not resize the image. Consecutive hover targets retain the previous decoded preview until the next is ready. Messages are italic. Prompt messages are quoted and receive an ellipsis at the shared filename summary limit; old filenames cannot distinguish an exact-limit message from truncation. The writer and theater formatter share `src/shared/capture-format.mjs`. Branch metadata appears in an icon tag above the line count.
