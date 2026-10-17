# Design system rules

This file is reserved for project-wide design-system rules requested by the user. Update it whenever a request changes a shared rule. Implement values as shared tokens and behavior as reusable graph-derived logic, never as exceptions for particular node IDs, version labels, or screenshots.

## Scope

- The left panel contains the Iteration Gallery (requested 2026-09-22), replacing the earlier blank-panel rule. The right panel remains the Version stream.
- Use local components and CSS; do not add an external design system.
- Preserve existing design outside the requested changes and bug fixes.

## Version stream panel modes — 2026-09-22

- Place a Test visual / Commit history switch in the Version stream header, using the existing control styling.
- Commit history now derives from the screenshot catalog. Group captures by the same push/version boundaries as the Iteration Gallery; each push closes a version and later prompts form the next work-in-progress version. Display actual summaries, prompt lists, branch metadata, capture links and saved line deltas. Join capture summaries to local Git commits; connectors follow actual parent hashes, including all merge parents. Use local branch refs and reflogs to recover branch ownership and fast-forward activity. Preserve recorded version numbers even when the catalog has gaps.
- Test visual is an editable sandbox. Adding commits, branching, deleting, reverting and restoring affect only its graph. Commit history permits selection, branch navigation, collapse and zoom, but no graph edits.
- Enforce edit permissions in shared state logic as well as controls. Persist both graphs and mode independently from the legacy saved tree. Sandbox changes must never write to the canonical graph file, capture folders, gallery data or Git.
- Preserve Test visual across switching, refreshes and reloads. Refresh Commit history from the capture catalog, retaining valid selection; never replace Test visual during a history refresh. Keep the common graph components and layout. The version stream opens on Commit history and hides the Test visual / Commit history dropdown. Pressing T reveals that dropdown and switches the panel to Test visual. Test visual uses the same panel border as Commit history.

## Active branch — 2026-09-17

- The graph has one currently active branch, independent of version selection, like `git branch`. Persist it with the graph. Switching it from the canvas control checks out that branch: it becomes the active branch and its last commit is selected.
- The default active branch — and the branch named `main` — is the longest root-to-tip path. Ties keep an existing `main`, then first-seen order. Other branches number in creation order.
- Derive the active path from the root through that branch's last commit. Place every station on that path on one shared vertical column.
- Draw the active path as one straight vertical line in the shared `activeBranchColor` token, including through a branching group. This is the only exception to the rule that fork alternatives leave on an isometric slope. Other alternatives at that fork still peel off with the shared fork-divergence geometry.
- Stations on the active path use that same connector color. Off-path alternatives keep their own branch color from the shared route palette: Docked `#7A9EF7`, Route `#FFC629`, Assemble `#00A66A`, Hand-off `#EA66B7`, Pulsed `#ED6A2C`, Misregister `#9A85F0`. The current branch stays `activeBranchColor` black. No two branches on the same level share a color; assign from that palette and skip a swatch already used on that row.
- Each info card has a vertical overflow control at the top right. It opens a floating panel to switch to that card's branch, delete the current node, or delete future nodes. Delete current removes only that selected station and reparents any later versions to its parent. Delete future removes every version after it and keeps the station. On an endpoint with no later versions, show only Delete current endpoint. Do not empty the graph.
- Place each version number to the left of its station, vertically centered, always in black at `versionLabelFontWeight` (bold). Write `V1` / `V2.1` with no space after `V`. Counter-scale the label with `versionLabelZoomCompensation` so its on-screen size stays closer to `versionLabelFontSize` at low zoom; at `versionLabelLowZoom` (40%) and below, multiply by `versionLabelLowZoomScale` so the text is slightly smaller. Do not sit a label on the stem or under a starting station; that hid V1. Do not repeat the number on the card. Do not color the number with the branch swatch.
- A canvas control immediately left of the endpoint jumper lists every branch. The open control names the active branch; choosing another branch switches it. Derive the list from graph structure and skip branches whose endpoints are hidden by collapse.

## Branch selection and connectors — 2026-09-17

- Derive the selected branch from the selected version's `branchId`.
- Highlight the path from the root through that branch's last commit, including commits after the selected version. Selection of an earlier version on that branch must not truncate the highlight or move the branch-end marker.
- When the selected path includes a branching group, connect its same-level alternatives with one continuous horizontal line, following the supplied reference. Draw each sibling group once, rather than overlapping one line per sibling.
- Unselected branching groups use a shared fork junction. Fork wiring follows the "Fork divergence" section below, which supersedes the earlier split/lane description.
- Default wiring is independent of selection and stays visible beneath the selected horizontal route. Gray it using the shared inactive-route color and opacity tokens; restore branch color when selection is cleared. Do not replace, move, or hide the default routes on selection.
- Selection still marks the selected branch's own line as active for color. Overlap order is version order plus the current branch on top, not selection. Same-row ancestors stay grayed. Paths are unchanged; only color and shared version-order layering move.
- Routes approach endpoints from above and end at their centers. Do not dip below an endpoint and come back up.
- Render selected connectors above unselected connectors.
- Metadata must not obscure a horizontal connector. Move cards on a horizontal-connector row below the line using shared geometry, with sufficient clearance for other routes.

## Fork divergence — 2026-09-17

- Draw every alternative at a fork as one full line from the preceding station to its own station, in its own branch color. The lines overlap along the shared stem. Paint order matches version order: later versions sit underneath, `Vx.1` is immediately under the current (checked-out) branch, and the current branch is on top.
- The stem is shared for a minimum distance (`forkSharedStemRows`) before the count appears at the junction. Divergence never begins above the count.
- Arms peel one by one off the shared stem. No two connectors originate at the same horizontal Y, including opposite sides. Divergent points run top to bottom in displayed version-number order (`V2.1`, then `V2.2`, …). Empty unfinished versions are left out of that sequence and peel after the numbered arms. The first peel is at `forkDivergeStartRows` (one grid) below the count; each next arm leaves immediately below it at `forkDivergeRows` (one lattice grid, no skipped slot) and runs parallel beneath the previous. A station that stays on the stem does not consume a peel slot.
- Every arm leaves on the same isometric slope. Near alternatives take one diagonal to above their station; alternatives beyond `forkDepartureUnits` cap the diagonal, run horizontally, and land on a `forkLandingUnits` diagonal.
- Row spacing is derived from the longest arm plus `forkTerminalRows`, so each arm still arrives vertically from above. Collapsed levels route from the count using the same approach geometry.
- These are shared tokens in `geometry`; do not special-case alternative counts, node IDs, or screenshots.

## Version stations and endpoints — 2026-09-17

- Fill a station's center black if it has later versions (any child, whether a commit or a branch). Leave leaf stations open with a white center. Selection alone must not fill a leaf station.
- End connectors at station centers with rounded caps. Never append a connector tail below a leaf, including a one-node tree.
- When the graph has more than one node, show one small black, upward-pointing triangle below the last commit on the selected branch. It is separated from the station by a gap and has no connecting segment.
- Hide the triangle for a one-node tree.
- Connector width equals the side of one isometric grid triangle (`gridTriangleSide` = `2 * gridRise`). This supersedes the inner-circle diameter rule. Station size stays on its own tokens.
- A canvas control to the right of zoom lists every branch endpoint (the last commit on each `branchId`), left to right. Arrow buttons and the middle button all select that endpoint and zoom to 100% centered on that station. The middle button reads `Endpoint k/N` with no outside caption. Derive the list from graph structure; skip endpoints hidden by collapse.

## Node and connector appearance — 2026-09-17 revision

- Use a single branch-colored station ring, without an inner black outline or an extra selection ring. Separate the station from its connector with a narrow canvas-colored gap.
- Restore the thin, pale center stripe on connectors. Ring thickness, station clearance, stripe width/color/opacity, and circle/connector sizes are shared tokens.
- These appearance changes preserve selected-branch detection, routing, descendant fills, and endpoint-marker logic.

## Prototype node content — 2026-09-17

- Start with one filled-in example using the reusable `filledVersionTemplate` in `model.ts`, titled "Implemented landing page layout", including two planning-reference file entries (`versiontree-plan-1.png` and `DESIGN.md`), prompts, summary, and sample code-change counts.
- File chips share the remaining card width and ellipsize their names. Derive the chip icon from file kind and name: pictures (`isPictureFile`) use the picture icon, skills use spark, code uses the code icon, and other references use the file icon. Do not special-case a node ID.
- Adding a branch or commit fills the source node with that template if its content is empty. Newly added nodes remain empty until extended themselves.
- Preserve existing populated content, version identity, and graph relationships. Clone template arrays for each node; never use node-specific content exceptions.
- Reference entries and change counts are prototype metadata, not uploaded files or actual repository diffs. Station fill continues to depend on descendants, independently of whether metadata is populated.

## Version levels and collapse — 2026-09-17

- Display labels derive from commit depth and left-to-right position. A single version on a level is `Vx`; two or more alternatives on that level are `Vx.1`, `Vx.2`, etc., including the original version. Node IDs stay stable when labels change.
- Count sibling alternatives at each fork, including the original alternative. Show the circled count starting at **two** alternatives; this supersedes the previous three-alternative threshold.
- The count sits exactly at the shared junction where the parent stem diverges. Center the parent above its alternatives and reserve room for the junction. Pack each fork from its own sibling count and shared geometry, not from descendant span. Later levels fan around their parent and may extend past ancestor siblings; they must not widen earlier forks.
- When the first versions fork with no preceding station, place an origin station on the stem above the count. The origin-to-count stem is `originStemRows` (three grids). It has no info card and is not a selectable version.
- Keep that junction fixed when selection changes; the selected horizontal route is drawn as an additional path from the junction to the alternatives' row.
- Hover or keyboard focus on a count fades in a small downward caret to its right, using shared count-hint tokens. Counter-scale the caret with the same zoom compensation as version numbers so it stays readable at low zoom. The caret is decorative.
- The count toggles the level's stations and cards. Preserve data and selection; leave later levels visible and connect them through the collapsed count. Do not hide the station on the current (checked-out) branch. Expanding restores the level. Counts remain available in both states and support keyboard activation.
- Progress screenshots stay in the idle diagram state. Turn on hover, focus, or an open action menu only when that component changed in the prompt (`interact=count` or `interact=menu` from `screenshotInteractFromPrompt`). The default full-diagram capture uses `screenshotZoom` (55%) and centers the tree (`frameScreenshotTargets`); do not auto-fit the scale to the viewport. Frame most stations and cards (`screenshotNodeTargets`) so the capture includes the tree, not only one card. Do not depend on a real pointer hover in headless capture.
- Use shared count diameter/font tokens. Keep graph relationships, node population, and selected-branch logic independent of collapse state.
- When adding to a level with a count, automatically frame the level and its count together rather than scrolling only to the newest node. At the minimum zoom limit, keep the count visible and allow horizontal scrolling to reach farther alternatives.

## Canvas inset and header actions — 2026-09-17

- Keep shared left inset on the canvas (`originX`, `padding`, `stationLabelReserve`) so the map — including version labels — is not flush with the canvas’s left edge. Frame that label reserve with stations and cards; do not special-case a node or screenshot.
- Header actions next to the panel title show a short label beside the icon. The grid control is not a selected or pressed toggle; only its label changes. It reads Hide grid when the grid is visible and Show grid when it is hidden. The fit control reads Fit all. Fit all never goes below the 25% minimum scale. At that view the diagram sits further right, using leftover horizontal room. In commit history the station pitch starts shorter than the shared row gap and grows, in lattice steps, so an expanded commit message still clears the next card. Side branches keep their own columns and leave the parent sideways. The latest side branch reuses the column of the earlier side branch that left the same parent, so it lines up with that branch instead of opening a further column.
- On load, paint the stream at the default overview scale first. After that frame, zoom to the current branch’s last commit at 100%, using the same framing as the endpoint jumper. Progress screenshots keep the default full-diagram capture and skip this intro zoom.

## Revert and restore — 2026-09-17

- Every branch endpoint and every non-endpoint station shows Add to chat, with the same plus icon as Add frame to chat. The control keeps its existing click and does not add a reference. Enter prototype uses the shared arrow icon on a black padded button. It stays hidden until the push frame, whether reached by scrolling or by selection, has been held for `theater.enterDelayMs` (1s), then the shape expands and the label fades in. After Exit prototype, that button returns at full size with white content and does not play the entrance again. A version with exactly one prompt keeps its push capture as a frame; versions with more prompts leave the push on the gutter node. The missing-codebase toast dismisses after 5 seconds. The frame-action row sits `theater.actionGap` (8px) above the frame. A push with no saved codebase keeps that quiet until Enter prototype is clicked, then a toast says “No saved codebase for this push.” The gallery footer does not list skipped files. Derive the station from `isBranchEndpoint` / `branchTip`. A reverted station still shows Restore change.
- Revert keeps later versions in the graph. Derive the reverted set from descendants of the reverted-to station (`futureNodeIds`) and persist it with the graph (`revertedIds`).
- A reverted node’s title uses the shared `revertedTitleColor` token and strikethrough. The rest of the card stays at full strength. Do not fade the whole card. The station and incoming connectors use the shared `revertedRouteColor` token; connectors also use `revertedRouteOpacity`. Version numbers stay black.
- That node’s card action is Restore change, with the restore icon. Restore is the primary card button. Restore brings that node back, plus any reverted ancestors so the path to it is live. Later descendants stay reverted until restored.

## Compact cards on other branches — 2026-09-17

- Nodes that are not on the current (checked-out) branch use an abbreviated info card: save label, title, and file chips only. Hide the overflow menu and everything below the chips (change stats, details, line counts, add branch/commit).
- Selecting that node — by its station, card, or any other select action — shows the full card. Deselecting or leaving the current branch returns it to the abbreviated form. Current-branch cards stay full.
- Derive compact vs full from the checked-out path and selection (`isCompactVersionCard`). Use `compactCardHeight` when framing abbreviated cards. Do not special-case node IDs.

## Merged branches and interim versions — 2026-09-24

- An uncaptured Git commit between saved versions receives a dotted label from the previous saved version (`V11`, then `V11.1`, then `V12`). Saved version numbers stay as recorded. Apply this from graph order in `assignInterimVersionLabels`; do not special-case a commit or version.
- A branch is merged when a later commit on another branch joins it, or a recorded merge names it as the source. The first commit of a branch does not count as merging its parent. Merged branches use a paler mix of their shared route-palette color (`mergedBranchPale`, 0.45 of the way toward white) at full opacity (`mergedBranchOpacity` is 1), including when they lie on the path into the checked-out branch. The checked-out branch stays `activeBranchColor`. A branch's first edge uses that new branch's color. Only the edge that joins a merged branch back into another branch keeps the merged branch's color.
- Connect a merged branch's stations that share a column with one vertical stem, including across rows where history detoured through another merged branch. The column it left also stays connected, in that column's own color, from the last commit before the branch until the commit that receives it. The edge that joins a merged branch into another branch keeps the merged branch's color through that last segment.
- Those vertical continuations of a merged side branch are solid strokes, including after the branch has been merged back onto another lane. Elbows that leave or rejoin stay solid. The column a merged branch left stays a dotted stem.
- Solid routes paint above dashed routes. The selected branch paints above every other branch, whether its own segments are solid or dashed.

## Implementation locations

- `src/features/iteration-gallery/`: shared gallery tokens, filename-derived version model, isometric geometry, album and theater components. `server/gallery-catalog.ts` discovers screenshots and publishes the same catalog for development and builds.

- `src/features/version-tree/tokens.ts`: station diameters, connector width (`gridTriangleSide`), ring and stripe styling, fills, opacity, triangle dimensions/gap, count-hint caret size/gap/fade, version-label size/weight/color/zoom compensation/`stationLabelOffset`, `activeBranchColor`, per-level unique branch colors, reverted title color (`revertedTitleColor`), reverted stations and incoming connectors (`revertedRouteColor`, `revertedRouteOpacity`), merged-branch strength (`mergedBranchOpacity`), and the default full-diagram capture zoom (`screenshotZoom`).
- `src/features/version-tree/layout.ts`: lattice geometry, card offsets, row spacing, inactive-route clearance, canvas left inset (`originX`, `padding`, `stationLabelReserve`), compact vs full card heights, origin stations for root-level forks, fork divergence tokens (`forkSharedStemRows`, `originStemRows`, `forkDivergeStartRows`, `forkDivergeRows`, `forkDepartureUnits`, `forkLandingUnits`, `forkTerminalRows`) with `forkApproach`, version-label formatting, and `screenshotNodeTargets` / `frameScreenshotTargets`.
- `src/features/version-tree/presentation.ts`: selected branch, full selected path, terminal detection, sibling connectors, branch endpoint, the ordered endpoint list for traversal, and the checked-out spine.
- `src/features/version-tree/model.ts`: `activeBranchId`, `longestBranchId`, current-node and future-node deletion, revert/restore (`revertedIds`, `versionCommitAction`, `versionCommitActionLabel`, `isPrimaryCommitAction`, `isBranchEndpoint`, `restoreNodeIds`, `isRevertedRoute`), the path from root to that branch's last commit, compact-card state (`isCompactVersionCard`), picture-file detection (`isPictureFile`), the reusable filled-version template, and screenshot interact flags derived from the prompt.
- `VersionTreePanel.tsx` and `VersionCard.tsx`: render these shared decisions; do not independently infer branch or terminal state.

## Iteration Gallery — 2026-09-22

- Rename the former Preview Panel to Iteration Gallery. Reuse the Version stream's typography, colors and simple controls; add no external design system.
- Read all recognized PNG captures from `[frame capture] screenshots/`. Derive timestamp, capture type/number, summary and optional line counts from filenames, and dimensions from image headers. Never maintain a screenshot-specific fixture list.
- A push closes a version containing the prompt frames since the previous push. Frames after the latest push form the next, unfinished version. This is the prototype grouping rule; capture version numbers are not mappings to the independently editable Version stream graph.
- Give every version an equal depth slot. Space its frames within the padded slot. Keep image aspect ratios. Every enclosing block uses the same shared envelope: the largest padded fit required by any saved frame. Different screenshot aspect ratios must not produce different block sizes. The depth axis is chronological, the version ruler is evenly spaced, and date marks align to the first saved frame of each day, so their intervals vary.
- Render translucent wireframe blocks with padding on every side. Keep out-of-range chunks in place but disabled. Default to Last 7 days; support Today, Last 3 days, Last 30 days and All time. Interpret date ranges as local calendar days through the current instant.
- Render evenly spaced representative in-range images at stronger opacity at rest, following the sampling rule below. Keep intermediate slice outlines available for browsing. Hover or keyboard focus lifts and highlights a frame and displays its version, date and summary; click or Enter/Space opens that frame in theater view.
- Date changes transition disabled opacity, without changing version identity. Respect reduced-motion preferences. Use shared tokens for depth, spacing, padding, lift, opacity, zoom, labels, transition and playback timing.
- Theater provides previous/next, play/pause, playback speed, once/loop/ping-pong modes and a scrubber, restricted to the chosen date range and source. Stop playback when its sequence changes. Return to the gallery without losing filters.
- Viewport presets and custom dimensions preserve the requested viewport aspect ratio and contain saved images without cropping. These are static captures: resizing cannot reflow historical pages.
- Show only real metadata. Commit navigation and chat attachment use normal-looking placeholder buttons with no action until connected; token usage remains unavailable. Do not infer commit IDs, related files or token costs from screenshots.

## Iteration Gallery 3D interaction — 2026-09-22

- Render the album with Three.js/WebGL and an orthographic camera, using the existing filename-derived frame dimensions, padded block geometry and version/time spacing.
- Drag the viewport to orbit the album in 3D. Right-drag pans; scroll and the header zoom controls share the same zoom state, using `webgl.zoomSpeed` (0.55) so wheel zoom is slower than the OrbitControls default. Provide Reset view to restore the default oblique angle at 100% zoom.
- Distinguish a drag from a click using a shared movement threshold, so rotating does not open theater view. Raycast the block slices to inspect and open frames at any viewing angle.
- Keep filters, disabled chunks, first/last images, hover lift and theater playback. Respect reduced motion. Centralize camera, control, opacity and texture-budget settings in gallery tokens.
- Support keyboard rotation and a labeled frame selector. If WebGL is unavailable, keep frame selection and theater playback usable with an explanatory message.
- Dispose scene resources on unmount; load textures only for displayed frames and keep the cache bounded. Preserve Version stream behavior and styling.

## Iteration Gallery rulers — 2026-09-22

- Do not draw continuous date/version baselines parallel to the blocks’ chronological depth. Draw one extended perpendicular guide per date or version label instead.
- Version labels sit on the ground plane to the right of the blocks, past a long tick plus label-gap so they match the shared ruler clearance. Date labels sit on the left wall at that day’s depth — parallel to the wall, not the ground — above the top edge, with ticks rising from the wall. The current hover or dropdown selection adds a shorter featured date/version pair at that frame’s depth on the same planes. Hovered-frame captions are coplanar with the frame, left-aligned to it, quoted, 0.75× the previous caption size, wrapped to the frame width, and sized from the frame height and current viewport so they stay large and sharp as zoom changes. Frame planes are inset from the shared block face by the common padding token. All of these rotate with the album.
- Extend the actual guide geometry along with label clearance, using `rulerTickLength`; labels sit beyond the line ends by `rulerLabelGap`. Derive guide positions from frame dates and the shared block envelope.
- Render axis text as React DOM overlays with CSS 3D transforms projected from the album camera. In oblique views, date labels are rotated a quarter turn on the wall so their baseline follows chronological depth, and Version labels lie on the ground. In frontal views, apply the camera-driven rotation described below. Use compact shared `axisText` viewport-size bounds (8–11 px, 9 px at the reference viewport) and projection compensation to keep text crisp and legible across zoom distances; orbiting must update anchors and orientation together.
- When a progress capture explicitly requests gallery hover, use the normal frame-inspection state on an in-range frame nearest the album center. Wait for its texture and lift transition before saving. Ordinary captures remain idle.

## Gallery controls and front framing — 2026-09-22

- Remove the Project preview / capture-source row. Show all saved captures. Beside the date-range dropdown, show `x/y versions` followed by the number of `prompt` captures inside the selected date range, such as `7/16 versions (80 prompts)`.
- In theater view, put the back button on the left of the gallery heading with a small gap, using the shared fill and border. Place Go to commit and Add frame to chat immediately above the frame, aligned to its right edge, as text-only buttons with leading icons; do not show an Open saved frame control. Vertically center the frame group in the remaining theater area. That group’s height is fit-content. Frame actions stay directly above the frame and the metadata block stays directly below it, in that same group, with `theater.metadataGap` (16px) between the frame and the version row. Shrink the frame to keep that group inside the panel. The metadata block fits its content, up to `clamp(20px, 20vh, theater.metadataHeight)`. Do not show a playback caption row for frame index or viewport-reflow notes. Center view and Reset view are separate buttons with fill and border on the header zoom row, at the far right. Put the saved-frame dropdown on a transparent, borderless row directly under the header, with no bar background; the dropdown control itself has the shared control border. Format options as `[V11] - Sep 22, 10:07`, using local dates without an A/P suffix. Start with a selection placeholder. Show Open frame as a separate floating button near the bottom center of the viewport only after an explicit dropdown selection; it always opens that selection, independently of hover, and disappears if the selection is outside the current range. Place the tracked-interface dropdown before the saved-frame selector in the album, and before the unlabeled viewport-size dropdown in theater; it currently offers only `index.html` from shared interface options. Put an info icon at the far right of the same album row. Show the drag/zoom/pan instructions in its tooltip on hover, keyboard focus or click; dismiss on pointer leave, blur or Escape. Do not display a permanent instruction panel over the viewport. Give the gallery footer extra bottom padding. Do not repeat the footer frame/version counts in a caption row.
- Enlarge the default album by framing the front block instead of fitting the entire chronological depth. Keep the front face horizontally centered and raise the camera and target by `frontViewLift` times the frame height; later blocks may extend outside it and remain accessible through orbit, pan and zoom.
- Derive camera scale and target from the shared block envelope and the `frontViewPadding` token. Appending history must not shrink the blocks. Center view restores this front-centered composition; Reset view fits the blocks at `overviewFitScale` and targets the exact center of the block volume, with no upward offset; the camera lift applies only to Center view. Ruler guides may participate in the fit radius, but label positions must not pull the look-at sideways off the blocks.

## Gallery sampling, navigation and ruler titles — 2026-09-22

- Keep Date and Version titles on the same wall and ground planes as their ticks, aligned with the middle of the album depth. Measure axis-title spacing from each ruler's value-label rail, not the block edge. Both titles share the current Date-to-values base gap (`axisTitle.valueGap`, 138 world units at 100%). Match the projected on-screen gap for Date and Version across camera angles. The visible gap grows gently as gallery zoom decreases, using an inverse quarter-power curve (`zoomGapPower`: 0.25). At 50% zoom the gap is about 19% larger than at 100%, keeping the low-zoom spacing restrained. This replaces the Version-only frontal clearance multiplier. Keep title depth centered on the album and leave value labels and guides unchanged. Include the base title extent in Reset fitting.
- At rest, display `ceil(in-range version count / 3)` representative images, at least one for a nonempty range. Sample version indices evenly from first to last using floor rounding: 12 versions select V1, V4, V8 and V12. Within each sampled version prefer the latest in-range push frame; use its latest in-range capture when no push exists. This replaces the first/last-only image rule.
- Center view focuses the first in-range frame at the larger scale (or the first historical frame when the range is empty). Reset view restores the default oblique angle, fits the blocks at `overviewFitScale` (1.2× the base full fit), and centers the block volume vertically without a camera lift. That fitted scale is the new 100% baseline; the zoom control always reads 100% after Reset view. Both use shared geometry and camera tokens.
- Hovering a frame in the middle of the panel only inspects it. Edge travel starts after the pointer stays inside the edge band on a block for `delayMs`. Then the camera advances toward the chronological end at the shared `edgePan.speed` (32); speed grows with proximity to the edge. In Center view, follow the highlighted frame only while that travel is armed. Stop on leaving the edge or viewport, dragging, or reaching the end. Do not alter frame selection or dates.
- Frame image outlines use `frameOutlineOpacity` so the inner borders stay readable against the block faces.
- Once every representative image in the album has loaded or failed, queue the album's other in-range captures from latest to oldest. Decode them in the background, `webgl.prefetchConcurrency` (2) at a time, so hovering shows the capture immediately instead of fetching it. Decoded captures persist across gallery remounts and range changes; changing the range reorders only the remaining queue. The GPU texture budget (`textureCacheSize`) is unchanged; a warmed image becomes a texture only when it is shown.
- A requested reset-view capture uses the same Reset view behavior as the button. Normal startup remains centered on the first frame.

## Highlighted gallery frames — 2026-09-22

- Keep highlighted captions coplanar and left-aligned with their frame, with their bottom edge a shared `hoverCaptionGap` (6) above the frame's top edge. Lift the caption together with the hovered frame. Render no background rectangle; use a strong white glyph shadow/halo controlled by `captionShadow` tokens. Quote the summary in straight double marks at `hoverCaptionScale` (0.375×, half the previous caption) and wrap so the plate is no wider than the frame. Hover captions contain only the quoted summary; keep version numbers on their axis labels.
- Feature the inspected or dropdown-selected frame as a pair of axis labels at that frame's depth: date on the wall using the compact local date, version on the ground as `Vn`. Featured ticks and label clearance use `featuredTickScale` (0.5× the standing ruler). Ink marks the featured pair; muted marks the standing ticks. The featured version label uses a strong white text shadow. Hide a standing tick only when it occupies the same face and depth. The pair follows hover while the pointer inspects a frame, then remains on the dropdown selection.
- Use the same compact bracketed version/date format in the saved-frame dropdown.
- Apply shared `padding` to the frame's horizontal, vertical and time-axis clearance inside the block; do not change version spacing or introduce frame-specific exceptions.
- While a frame is hovered, darken that frame's containing block stroke to ink at `hoverEdgeOpacity` and thicken it slightly to `hoverEdgeWidth` (1.5 px). Other blocks keep the muted `edgeOpacity` stroke at `edgeWidth` (1 px). Derive the container from shared album geometry, not a specific frame.
- A requested capture with selection, hover and reset view should include a valid dropdown selection, its floating Open frame action, and an in-range highlighted frame while using the normal Reset view camera.

## Gallery-to-theater transition — 2026-09-22

- Opening a saved frame keeps the live 3D album mounted while the camera turns to a frontal view of that frame. Interpolate camera orientation, position and framing with the shared `theaterMotion` timing; fade surrounding blocks as the selected frame settles into the measured theater image rectangle. Do not hardcode a frame or viewport size.
- Hide and disable album controls during the transformation. The frame finishes its rotation first, the timeline enters second, and other theater controls, metadata, frame actions, back button and footer fade in after the timeline settles. Keep the selected image continuous across the handoff; honor reduced motion with an immediate transformation and no UI fade.
- A mid-transition capture uses `--gallery-view transition` to freeze the same animation at the shared capture progress, wait for the selected texture, and save the rotating blocks with theater UI still hidden. This deterministic capture state is restricted to screenshot mode.

## Theater playback and return — 2026-09-22

- Decode upcoming frames in a bounded look-ahead cache. Keep the displayed image and its metadata visible until the requested image is decoded; start its playback interval only when it is ready. A failed load pauses playback and retains the last good frame. Keep one persistent image element across playback changes.
- Clicking outside the rendered frame, without dragging, plays the full reverse transition and lands on Reset view. The open gap between the prompt metadata and the playback controls is dismissible space and uses that same click exit. Dragging the theater frame or open surrounding space still orbits the live camera during the gesture; releasing starts the shared timed transition from that pose to Reset view. The explicit Gallery back button uses the same reverse transition to Reset view.
- Retain the album scene in theater view. Reverse from the currently displayed frame, even after playback or scrubbing, and land on Reset view; wait for its texture before handing off from the theater image. Preserve filters and honor reduced motion.
- Keep frame actions immediately above the frame and aligned to its right edge, outside the image, using text and a leading shared icon without a button background or border. Go to commit selects that frame’s version in the version stream and frames it at 100%, the same way the endpoint jumper does. Add frame to chat accepts clicks without performing an action or dismissing theater. Token usage remains disabled. The isometric grid covers every part of the canvas that is shown, including the fit-all offset.

## Theater transport and version ruler — 2026-09-22

- Keep previous/play/next centered relative to the theater panel; align speed and loop controls to the right independently. Use the shared triangle play icon and pause icon, retaining accessible labels.
- Represent progress with a fill clipped separately inside each version rectangle. Draw a narrow vertical playhead, vertically centered and extending slightly above and below that rectangle. Do not draw an additional inset track or rounded thumb. Size the ruler, minor marks and playhead through shared timeline tokens.
- Allocate equal timeline width to each version in the filtered sequence. At most `timeline.visibleBlocks` (20) version blocks are visible at once; further blocks extend the track and scroll horizontally. The track’s scroll box fits the playhead height, sits a little above the theater footer, and the transport controls sit one row-size unit above that track. It hides the scrollbar, and does not draw a focus outline when clicked. Subdivide each version by its saved captures (the prototype's commit/frame records); do not fabricate Git commits. Separate outlined version blocks identify versions without visible version numbers inside the timeline; version metadata remains available through hover titles and slider accessibility text, and one smaller mark identifies each saved frame. Scrubbing resolves against those same positions; keyboard arrows still move one frame at a time.
- Scrolling on the theater frame steps the current capture: down goes to the next frame, up to the previous. Use the shared `theater.wheelStep` threshold so one notch or a short trackpad flick moves one frame. Clamp at the ends of the filtered sequence, pause playback, and do not change frames from metadata, controls, or while a drag-to-exit gesture is active. Prevent the page from scrolling while the pointer is over the frame.

- During theater transitions, vertical date-axis guides fade over `theaterMotion.verticalAxisFadeMs` (180 ms), ahead of the full block rotation. Tag guides by axis face so this applies to all vertical guides without affecting block edges or horizontal rulers; reverse the same fade on return.

## Gallery default ground-plane angle — 2026-09-22

- Present the album with a slight counterclockwise ground-plane rotation instead of a symmetrical isometric angle. Use the shared `webgl.groundRotationDegrees` token (12 degrees, viewed from above) in the common camera framing routine for initial load, Center view and Reset view.
- Apply the equivalent inverse camera orbit so blocks, frames and rulers retain their common coordinates. Keep the existing elevation, framing size and free-orbit interaction.

## Theater push navigation and timeline preview — 2026-09-22

- The double-triangle transport buttons jump strictly to the previous or next `push` capture in the filtered sequence, skipping prompts and other captures. Disable a direction when no push exists there. Playback and keyboard timeline stepping still include all saved frames.
- Center saved-frame ruler marks vertically, using the shared line color and `timeline.minorTickHeight` within `timeline.height`. Full-height rectangular version outlines replace the former major separator marks.
- Hovering the timeline adds a lighter preview playhead while retaining the selected playhead and progress. Preview the nearest saved frame and its metadata using the same version-based position mapping as scrubbing. Hover does not alter selection; leaving restores the selected image and metadata immediately. Clicking or dragging commits the new selection.
- Suspend playback advancement while previewing and resume it on leaving if it was playing. Decode preview images before display, ignore stale loads, and keep the selected image mounted beneath the preview for a continuous return. Clear preview state when the filtered sequence changes.

## Stable theater presentation and capture reference — 2026-09-22

- Theater progress captures feature prompt 56, selected through capture kind/number metadata using `theaterReference`. Expand the capture date range to All time if necessary. This is an explicit capture preference; ordinary theater navigation still opens the user's chosen frame. If the reference is absent, fall back to the first available capture. The contained frame uses the full available width; its height follows that width and the viewport proportion.
- Use that same reference image's dimensions as the shared theater size baseline, resolved from the full catalog independently of filtering. Keep the viewport rectangle's height constant across selected and hovered frames at a given panel size. Contain images without stretching/cropping. Reserve a tokenized metadata height with overflow scrolling so longer messages or branch tags cannot resize the frame. Resizing the panel or choosing a viewport preset may adjust the fit.
- Moving between timeline hover targets retains the last decoded preview and its information until the replacement is decoded; never briefly restore the selected frame between hover targets. Restore selection only when the pointer leaves or preview is explicitly cleared. Clicking a ready preview hands it directly into selection.
- Show the version as a bordered tag on its row with the date. The version number is bold. The shared `BranchTag` and the green/red line counts sit in that same left-aligned group, immediately after the version tag. Move the prompt or push number to the start of the next line, such as `Prompt #63: "In reset view..."`. Keep that line in roman type. Theater and the gallery share one tracked-interface menu, with the file icon inside the control in muted ink. The theater toolbar shows the viewport as a reduced aspect ratio such as `480:271`. Previous, play, and next use the same icon size as the timeline start and end controls. Hovering a playback button or the timeline shows a black rectangle with slightly rounded corners and no arrow, and only while the pointer is on that control. The double triangles read Jump to last push and Jump to next push. The timeline label names the version under the pointer. Playback speed is a dropdown using `theater` speeds. The default 1× plays at the previous 2× rate, and the other steps are faster by that same factor. A push lead, such as `Push #10:`, is bold. A prompt lead stays regular weight. A frame that belongs to a push uses a 2px black outline. The frame-action row sits `theater.actionGap` (12px) above the frame. Play, pause, and those skip marks use a solid fill. Clicking a version title expands the full title, and the card grows to fit. Clicking that caption does not dismiss theater; empty space on the row still does. The tag border uses the branch color; the name and icon stay black ink. The prompt sits `theater.metadataRowGap` plus `theater.summaryGapScale`’s extra 2px below that group. Omit the tag when branch metadata is absent. Render additions in `theater.addedColor` and removals in `theater.removedColor`. Enabled play/pause controls use the shared black ink color. The playback block sits `theater.playbackFooterGap` (4px) above the footer.


## Direct theater orbit and prompt captions — 2026-09-22

- Dragging the displayed frame or open theater background controls horizontal and vertical camera angles directly from pointer displacement. Use shared drag-threshold and angle/sensitivity tokens, pointer capture, and cancellation handling. After release, interpolate from the released pose to Reset view with the shared `theaterMotion` timing; do not leave the camera at the drag angle.
- Reserve complete control regions, including their own padding and margins, from exit gestures. This includes viewport controls, frame action rows, playback/timeline controls, the header/footer, and the version row. Empty space on the prompt row and the branch row dismisses theater with the same click transition as the open surround. Do not reserve the open layout gap between metadata and playback. An existing gesture may cross reserved rows without being interrupted. Clicking the timeline must not draw a focus outline around the blocks.
- Use the shared `theater.focusBackground` (`#fff`) for the theater surface, matching paper. Do not add a shadow on the frame container (`theater.frameShadow` is `none`).
- Fade theater UI out as the gesture takes over. Keep the DOM frame visible until its 3D texture is ready, then hand off to the same frame. A click without a drag on the frame uses the same Go to commit navigation as its text action. A click without a drag outside the frame plays the full reverse transition to Reset view.
- Wrap prompt summaries in straight double quotation marks. Add `...` inside the closing quote when the saved summary reaches the capture filename length limit. Share the limit with the filename writer. Legacy filenames lack original-length metadata, so reaching the limit is treated as truncation; shorter prompt summaries have no ellipsis, and push/commit summaries remain unquoted.


## Version stream history captures — 2026-09-22

- Version stream progress captures default to Commit history, independently of the user's saved dropdown preference. The capture script passes `treeMode=history`; only an explicit `--tree-mode test` debug capture overrides it. Wait for history data and layout before recording. Frame the latest `historyCaptureVersions` nodes so a growing history remains readable.
- The screenshot catalog is the read-only source; sandbox operations cannot change its frames or derived history. Empty/error/loading states must not display the former seeded demo as real history. Git history augments the capture catalog through a read-only endpoint and a static build snapshot. Capture files are references, not changed source files. File chips omit capture-folder images. Hide the reference row when nothing remains, except on the current unpushed work-in-progress card, which still says “No references yet”. Commit history reports each commit's Git shortstat: how many files changed, with additions in `#1f8a4c` and removals in `#d12b2b` on the next row. Do not label that count as saved frames. The branch tag sits to the left of that version label, outside the card, with a solid white fill and a branch-colored border. The name and icon stay black at regular weight. No commit hash and no bracketed repeat. Version labels are lowercase. Add branch and commit actions stay visually enabled in Commit history; clicking them shows “Project isn't connected” and does not edit the graph.


## Git-backed Commit history — 2026-09-22

- Use Git commit parents and branch refs as the structural authority for Commit history. Match saved push summaries to normalized Git subjects, using timestamp proximity for repeated subjects; retain uncaptured commits between saved versions so branch work is not lost.
- Keep real branch names and distinct lanes. Use local reflog commit events to identify where work happened and branch-creation/fast-forward events to preserve historical context. Actual merge commits have edges from every parent. Fast-forwards move refs without inventing a merge commit or fork; display their recorded merge event in commit details.
- Keep saved version labels on matched captures and short Git hashes on uncaptured commits. Unpushed captures attach to their recorded branch tip; unmatched push captures are explicitly described as unlinked captures. Source screenshots remain available as references, and Test visual remains independent.
- Git-backed history uses its own branch-lane geometry with the shared spacing/grid/card tokens; do not flatten every historical branch onto the active sandbox spine. Preserve the existing Test visual routing.


## Theater focus surface and portable XR albums — 2026-09-22

- Theater focus fades the gallery surround and header to a shared light-gray surface token. Keep saved screenshot colors unchanged and restore the gallery surface on exit; respect reduced motion.
- XR exports reuse the production catalog, version grouping, sampling, block padding and axis geometry. Export relative screenshot paths and meter-based transforms in JSON, with copied source images and reusable rendering code. No screenshot-specific geometry exceptions.
- Export both perpendicular axis guides and their text anchors as world-space data. Render XR labels as real 3D planes visible to both eyes, rather than DOM overlays. Preserve image aspect ratios inside the padded block envelope.
- Keep export generation separate from the app state. Range exports retain inactive historical chunks; representative frames and hover highlights use shared album rules. Bundle the installed rendering dependency and license for a portable local viewer.

## Frontal gallery axis labels — 2026-09-24

- Version labels stand upright except near overhead views (see the elevation rule below). As the camera turns toward the album front, date labels turn outward by 90 degrees from the wall. Apply the same behavior to axis titles and featured labels; keep tick anchors and guide lines unchanged; both titles use the shared value-relative spacing rule above.
- Derive orientation from camera yaw relative to the frame front, independently of zoom, pan and elevation. Use shared `axisFacing` angle tokens: begin at 30 degrees from frontal and finish at 12 degrees, interpolating smoothly across that band. Reverse the rotation when orbiting away. Rear views retain the existing readable reverse faces.
- Upright version labels sit above their ground anchor. Keep the existing viewport-based font sizing and projection compensation. This is camera-driven geometry, with no version- or screenshot-specific exceptions.

## Upright version values and overhead inspection — 2026-09-24

- Version values and their title stand upright on the ground at ordinary camera elevations, regardless of frontal yaw. Between `topView.startDegrees` (55°) and `fullDegrees` (75°), smoothly lay them onto the ground for overhead reading. Keep ground anchors, spacing and font-size rules.
- Over that same elevation band, crossfade the wall dates into a left-side ground ruler. Mirror each date guide outward to the left with the same length and clearance as the version guides on the right. Include both daily dates and the featured frame date/time; remove dates from hover captions. Use `topView.dateFadeMs` (240 ms), respect reduced motion and reverse the crossfade when orbiting down.
- Overhead captions face the camera fully, remain above the frame in screen space and align their left edge with the projected left block edge. Use the existing transparent text/white-shadow treatment. Derive the pose from the camera and frame geometry, updating during orbit without regenerating text textures every frame.


## Segmented theater timeline — 2026-09-24

- Render one square-cornered outlined rectangle per version, including versions outside the selected date range, separated by push-node rectangles at `timeline.gapScale` (0.5× `blockGap`). Reuse `versionDepth` for equal block widths. Inset saved-frame marks with `timeline.inlinePadding` (6), slightly inside the shared album `padding`. Do not use a continuous outer border or rounded track.
- Out-of-range version blocks stay visible at `timeline.disabledOpacity` (0.5) for marks and progress, with the border separately lighter at `timeline.disabledBorderOpacity` (0.28), and reject the playhead, preview, and scrub. Album chunks keep the lower shared `disabledOpacity`. Playback and keyboard stepping stay inside the selected range. Do not label the range under the timeline. A cleared hover must not match disabled marks, which use index `-1`.
- Saved-frame ruler marks use `timeline.minorTickHeight` (16) and stay vertically centered inside each block.
- Clip progress fill to each block so the push-node separators keep their own fill. Keep centered saved-frame marks inside each rectangle. Selected and hover playheads use the same segment-derived coordinates as scrubbing and keyboard playback. A separator targets the push closing the immediately preceding version; missing or out-of-range pushes are unavailable.
- Timeline block borders stay the shared outline, including versions from other branches. The theater branch tag border uses that branch's version-stream color. The branch name and icon stay black, and the tag shows the branch name.
- The footer version count and the selected range's prompt total stay on one row.


## Overhead date ruler and compact captions — 2026-09-24

- Derive the left date ruler by folding date-wall coordinates onto the ground: negative wall height becomes leftward X, the shared block floor supplies Y, and capture depth Z stays fixed. Reuse date tick positions, label clearances and the featured-frame date; do not invent evenly spaced dates. A date tick uses the first frame of that local day that is drawn in the album. A push omitted from its version block does not place the label, and a frame that is not in the album never falls back to the start of the blocks.
- Keep overhead hover captions camera-facing, above the frame and aligned with the block's projected left edge, with only the quoted summary. Use `hoverCaptionScale` 0.25 (two-thirds of the previous size) at every viewport/zoom scale.


## Overhead axis titles and version notation — 2026-09-24

- In top view, place Date and Version beyond the last block using shared `topView.titleEndGap`, derived from the actual block bounds. Blend from their ordinary midpoint positions through the existing elevation band.
- Left-align Date and its values on the left numeric rail; right-align Version and its values on the right numeric rail. At lower elevations keep existing centered label alignment.
- Use shared `formatVersion` notation `v#` for all Iteration Gallery version labels, including featured axis labels, saved-frame choices and timeline accessibility text. Version stream notation is unchanged.
- The gallery canvas keyboard shortcut T provides a straight overhead view fitting the blocks, both numeric rails and the end titles; Home retains Reset view.


## Summary-only hover captions — 2026-09-24

- Omit the version tag from hovered-frame captions at every viewing angle; date and version remain on their respective rulers. Keep the quoted summary, existing text size and camera-facing/left-aligned placement.
- Strengthen the white glyph halo through shared `captionShadow` tokens: blur radius 6, stroke 2, five passes and padding 12 to contain the broader shadow. Preserve the transparent background.


## Theater timeline entrance — 2026-09-24

- The segmented timeline represents the blocks from the side and participates in the gallery-to-theater transformation. The frontal frame gains its border over the last `theaterMotion.frameBorderMs` (180ms) of the rotation, and that border is complete before the timeline starts. After `theaterMotion.rotateMs` completes, the timeline enters over `theaterMotion.timelineMs` (320ms): fade from transparent to opaque and slide down from `timelineOffsetVh` (5vh above its final position). Hold the frame in its final position throughout this second stage. Hand off to theater only after the timeline settles.
- Use the existing rotation clock and easing, not an independent timer. Keep the timeline inert throughout the entrance and begin the existing fade for playback controls and the rest of the theater UI only when the timeline finishes. Reduced motion completes the entrance immediately.
- `--gallery-view timeline-transition` captures the normal motion halfway through the timeline entrance, featuring the standard theater reference frame. Freeze only in screenshot mode; other transition captures retain their original midpoint.


## Cold-load theater sequencing — 2026-09-24

- Apply the same frame → timeline → remaining UI sequence to the first theater entrance after opening or refreshing the site and to later entrances. Wait for the selected frame texture before starting the clock, so cold image loading cannot collapse or reorder the stages.
- Keep the default landing view unchanged. The sequence applies when entering theater; reduced motion settles both stages immediately. The midpoint timeline capture freezes after the frame is fully frontal and before the other theater elements appear.

## Push nodes and archived prototypes — 2026-09-24

- Timeline separators retain the derived gap width and timeline height, and use `timeline.pushMinWidth` (2.5px) where space permits, following the fill rule below. They use a white `timeline.pushBackground` at rest and `pushHoverBackground` only while hovered or focused, with a `v# · push node` tooltip. Clicking selects that push node and parks the playhead on the rectangle. The push is not a frame inside the version block. Do not substitute a prompt when a push is missing or outside the selected range.
- Add the same target after the final version, absolutely positioned outside the timeline's measured end; do not shrink or rescale existing blocks. Derive targets from capture kinds and version groups, not ordinal assumptions. Support keyboard activation.
- Push-frame metadata no longer repeats Enter prototype. That action is the bold control beside Add frame to chat. Clicking it opens the archived prototype in the full-screen overlay. Exit prototype uses the same text-and-icon control as Full screen, sits on that action row, and is the only control aligned to the left. It is not part of the full-screen overlay. While the prototype builds, a loading overlay covers the frame. Resolve the push number to its commit in `data/push-shas.json`, stage that tree from Git, build on demand, and display an interactive iframe in the existing theater frame. Exit prototype restores the screenshot. Stop playback while entering; changing frames closes the prototype. Missing archives and build failures must be explicit.
- Build immutable archived source with the host's available tooling, bypassing archived configs, package scripts and hooks. Snapshot the gallery catalog at that push's time. Run the result in a sandbox with ephemeral storage and read-only archived assets; never write to current project data or the source archive. Cache rebuildable output outside version archives.

- Push nodes are the gutter rectangles between version blocks. They stay white and take `timeline.pushHoverBackground` only while hovered. Selecting one places the playhead on that rectangle in theater and the gallery. A push capture is not a gallery frame and does not add a mark inside its version block. Progress captures that mention a push node select `capturePushVersion` (v16). The action to the right of Add frame to chat is a bold Enter prototype until that prototype is open, then it becomes Full screen. Enter prototype opens the full-screen overlay. Exit prototype is the left-aligned control on that same row. Building a prototype covers the frame with a loading overlay. The playhead paints above the push rectangles. The caption gap under the version row uses `theater.summaryGapScale` (1.75).
- Push frames offer Full screen to the right of Add frame to chat. Expand the current screenshot or archived prototype in an aspect-preserving modal over a dark scrim. The preview viewport dropdown and its aspect-ratio label appear only after a push prototype is open. In prototype mode the gray bed is a full-width sibling of the action row and the metadata, using `theater.frameBed` (`#F4F4F4`). Its height stays fixed at the static frame height. The prototype frame keeps the selected viewport size inside that bed. In that mode, dragging either side of the frame resizes it and switches the viewport to Custom size. The close button sits outside the frame above its top-right corner; Escape and scrim clicks also close, restoring focus. Background controls and theater orbit gestures remain inactive while open. Use shared fullscreen spacing and scrim tokens.


## Theater timeline fill and alignment — 2026-09-24

- Fit up to `timeline.visibleBlocks` (20) equal-width version slots to the available theater timeline width; additional versions scroll horizontally with hidden scrollbars. Derive push-gutter widths and version widths together; a push button must never grow over a neighboring block's border. Prefer `timeline.pushMinWidth`, capped by `maxGapFraction` for very dense timelines.
- Reserve space for the final floating push inside the viewport while keeping it outside the version track. Use `timeline.edgePadding` for endpoint playheads; do not clip playhead overhangs or tooltips.
- Draw block borders without changing the coordinate space used by marks. Center each prompt ruler on its calculated position, using the same geometry for progress, hit testing, and selected/preview playheads. Recalculate on panel resize.


## References and theater navigation — 2026-09-24

- Attach files from the reference catalog by their prompt number. Version cards collect references from their captured prompts. Theater prompt captions show that prompt's references; push captions collect references from prompts in that version. Reuse the file-chip component and preserve links to the original files. Theater references stay in one horizontally scrollable row, using `theater.referenceChipWidth` to truncate long filenames without clipping the row. Capture screenshots are not planning references.
- Keep timeline start/end buttons at the far left/right of the playback row, with distinct tooltips. They select the first/last saved frame in the current date range, including push captures, and smoothly move the playhead and reveal its position. Tooltips read `Jump to timeline start` or `Jump to timeline end`, including the current range, e.g. `Jump to timeline start (last 7 days)`. Disable each action when the playhead is already on that end of the range, and disable both for an empty range. Every playback button uses `theater.playbackEnabled` (`var(--ink)`) while enabled and `theater.playbackDisabled` (`var(--faint)`) while disabled. Keep playback transport centered. Keep speed and loop controls on the interface (`index.html`) dropdown row at every panel width; render one set only. Use Phosphor fill `caret-line-left` and `caret-line-right` icons for timeline start/end controls.
- Clicking a captured commit card or its circular node selects its matching push frame in theater using capture metadata. Test visuals and commits without push captures do not navigate the gallery. Preserve the chosen date range when opening an older push. Explicit seeks animate using `timeline.seekDurationMs`; scrubbing and playback remain immediate, and reduced-motion preferences skip the animation.
- Preserve the shared block/gutter sizing and ruler coordinates when the timeline scrolls, with the final floating push reachable at the end and no visible scrollbars.

## Commit-card hover — 2026-09-25

- Hovering a version card smoothly strengthens its border without changing card size or moving its contents. Preserve the active branch border color. Use shared `cardHoverBorderInset` and `cardHoverTransitionMs` tokens for the inset stroke and transition; respect reduced-motion preferences.

## Gallery label overlap — 2026-09-29

- Stack date and version labels by capture timestamp, newer above older, independent of projection and rendering order. Hovering any visible label brings it above the other labels and draws a white outline using shared `axisText.hoverBorderWidth`, `hoverBorderColor`, and `hoverBorderGap` tokens. The hovered label has an opaque white background, including the clearance inside its outline, using `axisText.hoverBackground`; it obscures labels underneath without changing its size or position. On pointer exit remove the background and restore chronological layering. Invisible labels must not intercept the pointer.

## Top-view token usage — 2026-09-29

- Store simulated input, output, total, and simulation status per capture ID in `data/token-usage.json`. Initialize new captures once; preserve existing values across refreshes, range changes, and builds. Expose these objects with the capture catalog, and label the visualization as simulated.
- Draw one continuous cumulative area across active frames, rising from a shared lower edge rather than mirrored around a centerline. Connect chronological frame values linearly, starting at 0% before the first frame and reaching 100% of the selected range’s total at the last frame. Place the 0–100% scale beyond the ending block. Exclude inactive frames from the area and its total; preserve their disabled blocks. Use reusable data-derived geometry and shared `tokenUsage` tokens.
- Fade the area and scale in only near a complete top view (87–89 degrees elevation), and fade out on orbit away. “See token usage” rotates 90° clockwise so later frames extend right, centering and fitting the entire active block range with space for labels. Center view while viewing token usage restores this active-range framing. Keep labels upright as the camera turns. Preserve the range and respect reduced motion. Empty or zero-usage ranges render no filled area.

## Push preview images — 2026-09-29

- Every push node displays the last prompt image within its version, including its image dimensions. Preserve the push ID, date, message, version grouping, timeline position, and archive lookup number. A version without prompt captures keeps its own push image; never borrow from a different version.
- Archived prototypes must serve their allowlisted screenshot and reference assets within their sandbox asset namespace, preserving read-only isolation from the live project.
- A pending archived build displays “Building prototype…” in both the theater frame and fullscreen overlay. Closing an overlay during its build cancels the waiting UI request and restores a usable Enter prototype action. Build failures and timeouts are visible and retryable. Stage runtime files asynchronously, excluding unrelated historical documentation and captures; do not run archived build scripts.

## Token area segments and anchored titles — 2026-09-29

- Use light gray for the cumulative area, with subtle branch-color tints for contiguous branch runs. Keep visible equal-width cumulative bars in the corresponding branch color. Reuse the gallery/version-stream branch palette; a branch change never resets the selected range’s cumulative total.
- Align the area’s start and end to the actual first and last active frame planes, retaining their natural in-block padding instead of filling to block or hit-region edges. Interpolate the cumulative boundary between adjacent branch runs so segments meet without gaps or double-counting.
- In token view, float Date and Version titles at one shared fixed pixel inset from the panel’s left edge. Keep their vertical positions on the corresponding numeric-label rows, independent of zoom; blend back to normal projected placement when leaving token view. Colors, bar widths, tint strength and inset belong to shared tokenUsage tokens.

## Gallery control placement — 2026-09-29

- Replace the gallery heading with the shared file dropdown, displaying **Gallery:** followed by the file name. Cap its width with `controls.fileMaxWidth` and ellipsize long names. Keep one accessible native selector in the panel header across gallery and theater views.
- Use Phosphor fill `crosshair-simple` for Center view and `corners-out` for Reset view, retaining accessible names and tooltips.
- In the gallery viewport, keep See token usage visible independently of frame selection, floating above Open frame. Change it to Exit whenever camera orientation enters token view; Exit returns to the ordinary reset framing. Open frame remains conditional on a selected saved frame.
- Place the saved-frame dropdown at the viewport’s bottom right. Use shared control insets, gaps and maximum widths; on narrower panels lift the action stack to avoid overlap. These controls follow the existing theater-transition visibility and do not intercept canvas drags outside their bounds.

## Visualizer navigation refinements — 2026-09-29

- Restore the panel title as Iteration Visualizer. Put the plain file dropdown directly to its right, retaining its maximum width. Center and Reset use regular (unfilled) Phosphor icons without a button background or border.
- Place the saved-frame selector at the right end of the date-range footer, on the same row. Keep its selection and Open frame behavior unchanged; hide it during theater as before.
- Tighten the date/version hover isolation to a 1px white outline and 1px clearance. Reduce the reserved title-overlay clearance in token view so nearby numeric labels remain visible.
- Token view maps the primary mouse drag to panning, preserving the top orientation; ordinary gallery view restores rotation. Do not add automatic edge travel while token view is active.
- Animate camera azimuth, elevation, target and scale together into and out of top view. Exit/Reset from token view returns smoothly to gallery framing, including the turn away from the top, while reduced motion completes immediately.

## Consolidated camera control and floating buttons — 2026-09-29

- Show only the unfilled Reset view icon. Single-click resets framing; double-click centers using the existing Center view behavior. Delay pointer single-click by the shared double-click window so a double-click cancels the pending reset. Keyboard activation resets immediately. Expose the double-click action in its tooltip.
- Floating See token usage / Exit and Open frame buttons use white backgrounds. Raise the token button by `controls.tokenLift` (24px) while preserving Open frame’s position. Increase the title/file-dropdown gap to `controls.headerGap` (14px). Keep these values in shared control tokens.


## Shared responsive control sizing — 2026-09-29

- All page action buttons and dropdowns share the date-range selector’s height, including playback, card actions and canvas controls. Use the responsive `--control-height` and `--control-font-size` tokens in `src/control-tokens.css`; keep spatial diagram nodes, clickable card headings, timeline push blocks and resize handles governed by their geometry.
- Halve header and bottom-row vertical and inline padding through shared responsive row tokens. Row heights follow their control height and padding rather than a fixed minimum. Titles and supporting row text scale with the control font.
- Raise See token usage / Exit using `controls.tokenLift` (48px). Add regular Phosphor chart-line / return icons, retaining white floating-button backgrounds.


## Fixed-height divided control rows — 2026-09-29

- Headers and bottom rows have zero vertical padding and fixed responsive heights, preserving their previous total heights through `--header-row-height` and `--footer-row-height`. Inner groups and controls stretch to fill the row. Keep responsive typography.
- Use one shared `--row-padding-inline` value for row and control horizontal padding, doubled from the previous spacing. Replace individual dropdown outlines with shared thin vertical dividers between titles, selectors and actions. Preserve focus indicators.
- Version stream floating controls use the same inline token for left/right/bottom offsets and inter-group spacing. Remove their inner padding and match their controls to footer dropdown height. Spatial diagram controls retain their graph-derived dimensions.


## Docked version controls and header edges — 2026-09-29

- Version stream view controls occupy a fixed bottom row outside the scrollable canvas. Share the gallery footer height, control sizing, horizontal padding and divider tokens; do not overlay graph content. Preserve upward-opening branch menus.
- Panel headers have zero right padding so their final action reaches the panel edge. Add a leading divider to the header action group, including before the gallery minus button.


## Shared reset button and branch navigation — 2026-09-29

- Both panels use `ResetViewButton` with the regular Phosphor corners-out icon, no visible text, and the shared `controlTokens.doubleClickMs` delay. Single-click fits/resets; double-click cancels the reset and centers. Keyboard activation fits/resets immediately.
- Version stream double-click targets the current active branch endpoint, independent of the selected card or endpoint pager. Reveal collapsed content before navigating.
- Put the active branch dropdown immediately after the Version stream title; its menu opens downward. The Grid toggle keeps its label as Grid, with a closed-eye Phosphor icon while enabled and an open eye while disabled, exposing its pressed state.


## Version stream scale placement — 2026-09-29

- Place Version stream zoom out, percentage/reset and zoom in in its header immediately before Fit all, matching the gallery’s control order, shared sizing and dividers. Keep the remaining center-selection and endpoint controls right-aligned in the bottom row.


## Compact headers and Grid placement — 2026-09-29

- Grid stays at the bottom-left of Version stream; remaining footer controls stay right-aligned.
- Use the reusable `AdaptivePanelTitle` to measure full title plus sibling controls against available header width. Show Visualizer or Stream only when the full title cannot fit; restore the full title when space returns. Compact titles use `--compact-title-weight` (500), preserving full accessible names.
- Both panels use the gallery’s text minus (−) and plus (+) symbols. Header zoom and reset controls share `--zoom-padding-inline`, 80% of regular row padding.


## Token colors, wireframes and reset — 2026-09-29

- Keep the chronological branch palette across the full catalog when filtering ranges. Historical branch colors appear only when their frames are in the selected range; do not include out-of-range tokens in the cumulative total. Strengthen branch tints and bars with shared `tokenUsage.branchTint` / `barOpacity` tokens so short branch runs remain visible.
- In token view, draw block wireframes above the area and bars, blending to shared token outline opacity/width. Preserve inactive-block dimming and restore ordinary depth testing on exit.
- Reset while in token view re-centers and fits the selected time range at the token-view orientation. Exit explicitly returns to the gallery orientation.

## Full-width selectors and token-view controls — 2026-09-29

- Header and footer selectors fill their available space. Reuse `RowSelect` with a native select for keyboard/menu behavior and a flex presentation using space-between for content and chevron. Date-range counts belong inside that selector, with shared control typography.
- All leftmost row elements use `--header-padding-left` once; remove double row-plus-control padding. Date range and saved frame share `--selector-padding-right`. Keep responsive compact-title measurement based on intrinsic selector content rather than stretched width.
- Halve active, hovered and disabled version-block outline opacity through shared tokens. Token percentage labels use a larger `tokenUsage.labelGap` (44 scene units) and extend rightward from their anchor.
- Remove the simulated-usage annotation from the viewport. Show a small Token usage heading above Exit while token view is active. Token and Open frame actions share `controls.floatingWidth`, `floatingPaddingInline` and `floatingPaddingBlock`; both remain white.

## Application shell — confirmed 2026-09-25

- The main application uses navigation, a central conversation/work surface, and an on-demand reading window. The Iteration Gallery and Version stream remain together inside that window and at `?view=history`.
- Dialog is a task. Builder means creator (current user, another person, or Mit), not execution owner. Direct colleague messages may have no task association.
- Input and Output are permanent compact attachment cards at the top right of the conversation. Selecting a file opens the reading window. Closing or switching files must preserve drafts.
- Inbox filters are All, Mits, Co-workers. Use identity, latest message and attention state in each entry.
- Palette authority is the `#mitwerk-overview` section of `Brand/mitwerk-light-dark-design-system.html`: Werk Blue #1D4AB9, Mit Sky #E4ECFF, Workshop Text #191A1B, Panel White #FAFAFA, Steel #65676C, Rail #E7E7E7. Its outer HTML demo styling is not the product palette.
- Keep the incumbent Neurial Grotesk, restrained density, fine borders and compact corners. Color is implemented through shared `--mw-*` tokens. Preserve graph-specific branch colors and interactions.
- No Stage Brief or Grill Me flows are introduced merely because older references include them.
- Initial implementation is a locally persisted frontend demo, with explicitly simulated AI responses. No real colleague messages or external model calls.

## People and projects — 2026-09-27

- Home summarizes attention across projects and messages. Projects is a multi-project directory; a selected project owns its tasks, instructions, shared files and members.
- Human colleagues have a Co-workers directory alongside Mits. Inbox provides New message; the directory supports name/role search, messaging and starting a shared project.
- Creating a project selects people and creates a separate project record. Direct messages remain independent of projects. Builder continues to mean creator.
- Files can be queued, removed and sent with or without message text. Sent/received file cards open the existing reader. Local demo replies are explicitly triggered and labelled; no actual messages or invitations are sent.

## Mit creation and customization — 2026-09-28

- Mits supports Create Mit, editable identity/role and working instructions, skills/tools, and permission/review triggers. Persist each profile under a stable ID; rename active task references without rewriting historical messages.
- Save returns to the Mit profile, from which users can start a task in a chosen project or directly in Inbox. Custom Mits appear in the conversation selector.
- Reject blank names/roles and duplicate names. Cancel/back protects unsaved edits; drafts survive navigation within the app.
- Show external tool connection state honestly. This frontend stores configuration and demonstrates its use in sample responses; it does not execute tools or enforce runtime permissions. Task completion remains a human decision.

## Single Mits navigation entry — 2026-09-28

- Use the main Mits navigation entry for managing AI teammates. Do not repeat a Your Mits list in the sidebar.

## Floating conversation context and reader switching — 2026-09-28

- Task metadata, Input and Output use matching cards in a reserved floating rail to the right of a conversation; metadata no longer spans the thread as a horizontal strip.
- Opening an attachment collapses the cards and opens the full reading window. A narrow content bar switches between the conversation’s available attachments, with the current item visibly selected. Preserve preview/history controls.
- Closing the reader restores the cards and the existing conversation draft. On small screens the cards occupy a bounded scrolling area above the thread.

## Project cards and compact reader selector — 2026-09-28

- Projects uses a responsive card grid, with previews derived from actual project tasks, member indicators and per-project archive/restore actions. Active and Archived views are separate; archive retains project data and removes its shortcut from the active sidebar and Home.
- Reading resources are selected through a labelled dropdown in the reader title row. Remove the separate file-tab row; retain preview/history and reading controls.

## Mention Mits from the composer — 2026-09-29

- Remove the Active Mit dropdown. Typing @ searches Mits, with existing project collaborators ranked first and others labelled Add to project.
- Selecting a suggestion inserts the mention. Sending adds the mentioned Mits to that task and its project using stable IDs; repeated mentions do not duplicate membership. Unsent drafts do not add members.
- Support multiple Mit mentions, keyboard selection and Escape dismissal. The project Co-workers view includes its Mits. Current responses remain explicit local simulations.

## Two header levels maximum — 2026-09-29

- The reading experience has at most two top-level header rows: workspace navigation and one unified reading-control row. Place resource selection, Preview/Iteration history and window controls together; do not add a separate toolbar row.
- In narrow reading panes, use a compact mode dropdown instead of wrapping mode tabs onto another row.

## Personal workspace and project task navigation — 2026-09-29

- Supersedes earlier human collaboration navigation: the current product includes the current user and Mits only. Remove Co-workers, colleague discovery/invitation, human Inbox filters and human membership pickers from the UI. Preserve existing saved records without destructive migration. Builder still means creator.
- Keep a single Projects section in the lower sidebar. Its heading opens the project directory; each project name expands its tasks, and each task opens its conversation. Include a project overview link; all tasks use equal indentation. Archived projects stay out of this section.
- Workspace-history scope information is available through an information button in the unified reader header, rather than a persistent notice row. It must still explain that captures are not yet linked to individual outputs.
- File selectors reserve sufficient inline space for their leading icon and trailing disclosure indicator, including when embedded in the application shell.

## Flat tasks — 2026-09-29

- All tasks are peers within their project. Remove subtask creation, parent navigation, child lists and subtask badges or indentation.
- On loading saved workspaces, discard legacy parent links while preserving task IDs, project membership, messages, drafts, status and attachments. New tasks are always independent.

## Full navigation toggle and task options — 2026-09-29

- Navigation is either fully expanded, including names and project task lists, or completely hidden. The side-panel control on the left of the breadcrumb opens and closes it. Narrow screens use a full sidebar drawer with a dismissible backdrop; selecting a destination closes it. Do not force an icon-only rail.
- Mit customization lives in a three-dot options menu in the Task details card header. Keep its profile destination and remove the full-width button from task metadata. Support keyboard access, Escape and focus-out dismissal.

## Sidebar search, inbox and new chat — 2026-09-29

- Search and Inbox are icon buttons beside the sidebar workspace name. Inbox uses a bell and an unread dot. Hidden navigation exposes these actions in the workspace top bar.
- The bell toggles the sidebar between standard navigation and an Inbox feed, preserving the main conversation. Group attention items under Priority and other conversations under Recent; show task title, project/Mit and latest message excerpt. Selecting an item opens its task.
- Replace Home in sidebar navigation with New chat, which opens a fresh project-independent conversation with a Mit and focuses the composer. The first sent message supplies its task title; existing drafts remain intact.

## Compact sidebar inbox — 2026-09-30

- Each Inbox item has at most two lines: a task title and one truncated latest-message excerpt. Remove the separate project/Mit metadata row; retain that context in the hover title and the opened conversation. Preserve Priority/Recent groups, unread dots and selected state.

- Sidebar chrome: omit the chevron beside MitWerk and the bottom Interactive prototype status label. Retain brand-button collapse behavior and the user/settings row.

## Immersive New chat — 2026-09-30

- A new, unsent project-independent chat is a focused launch surface: hide the task heading, status, date divider and context rail (Task details, Input, Output). Center the welcome and composer with room to attach files and mention Mits.
- Sending the first message transitions to the existing task conversation and restores its context cards. Empty named project tasks keep their existing layout; drafts and queued attachments remain usable on the launch surface.

## Inline task status interaction — 2026-09-30

- Replace the task-card native select with a compact current-status button. Expand four status choices within the card, using existing status colors and a check for the current value. Choosing a status collapses the choices and gives the card a brief subtle color response.
- Support Tab, arrow keys, Home/End and Escape; restore focus to the trigger after selection. Close on focus leaving, disable changes during runs and honor reduced motion.

## Reading resource icon strip — 2026-09-30

- Replace the reader resource dropdown with a single horizontal strip of compact resource icons (image thumbnails when available). Each has an accessible name and hover title; highlight the active resource and allow horizontal scrolling instead of wrapping when space is tight.
- Remove the separate prototype Preview surface and preview/history mode switch. Prototype resources open the existing Iteration Gallery and Version stream directly; documents and images retain their readers. Workspace history scope information remains available via its information button.

## Single-line conversation heading — 2026-09-30

- Place task title, status, Mit participants and details action in one header row. Let the title truncate with its complete hover title rather than adding a second metadata row.
- Adapt to the actual conversation-heading container width, including reader-divider resizing: wide panes show status/Mit labels; narrow panes retain the status glyph, Mit avatar and additional participant count. Preserve full status and participant names as hover titles and accessible labels.

## Reader resource order — 2026-09-30

- Place prototype resources first in the reader icon strip; preserve the relative order within prototypes and all other resources. Keep this order stable when selecting a different resource.

## Image resources and gallery — 2026-09-30

- Represent image resources with a dedicated image icon rather than a miniature thumbnail in the reader bar. Two or more images in the current resource scope share one gallery icon with a count.
- Opening the gallery shows a responsive thumbnail grid below the reader bar. Selecting a thumbnail opens that image; All images returns to the grid. Opening an attachment directly still opens the chosen image. Prototype resources remain first.

## Project asset collections — 2026-09-30

- Library contains Skills and Plugins only. Project files belong in project details → Assets, replacing separate Knowledge and Output tabs with task-based collections.
- Collections gather each task’s inputs, outputs and message attachments, deduplicate within the collection, and expand to open individual assets in the reader. Empty projects show an empty state. Project reader navigation includes only that project’s resources.

## Composer shape and attention emphasis — 2026-09-30

- Use a shared 18px composer radius in new chats and existing conversations.
- Home’s Needs your attention heading retains the original plain section-heading style with an inline muted count. The blue banner, leading border and filled count badge were reverted on user request.

## Collapsible workspace bar and compact reader — 2026-09-30

- The workspace breadcrumb bar can be fully hidden with its collapse control; a small top-edge control restores it without reserving a full row. Preserve keyboard focus when toggling.
- Keep the reader resource header compact: 42px minimum height, 4px vertical padding and 30px resource buttons.

## Conversation opening — 2026-09-30

- Start existing conversations directly with messages, without a date banner or horizontal separator. Keep individual message timestamps.

## Project identity colors — 2026-09-30

- Distinguish projects with the approved palette: Route yellow (#ffc629), Assemble green (#00a66a) and Misregister purple (#9a85f0), repeating in that order. Apply restrained color to project folder marks, cover accents and sidebar dots; keep text neutral.
- A shared helper assigns colors from the full saved project order, so Home, Projects, sidebar and project detail agree and filtering/archiving does not change identity. Background tints blend palette tokens with the active page surface for both themes.

## Kanban task movement — 2026-09-30

- Omit trailing navigation arrows from Todo cards; clicking the whole card opens its conversation. Dragging a card onto a status column updates its saved status and timestamp. Highlight the destination during dragging, with no status change on cancellation or same-column drop.
- Todo columns fill the board height, use the lighter sidebar gray (`--todo-column`), and have no border. Their headers have no padding, with a slightly larger margin under the title, and each count is a circle. A card leads with a smaller project name and folder icon. The task title is 0.7rem at semibold weight (`--todo-title-size`, `--todo-title-weight`). Only a Ready for review card names its Mit, with a smaller mark and a short gap above that row. An empty column centers its message. The Todos page has no subtitle.
- The main sidebar group separates the header, navigation, and project list with `--sidebar-group-gap`. Navigation items stack with a 2px gap.
- Alt + Left/Right moves a focused card between adjacent status columns with a confirmation announcement. Running tasks cannot be moved.

## Sidebar project disclosure — 2026-09-30

- Show only the project color dot and name; omit the leading disclosure chevron. The project-name button still toggles its task list and exposes aria-expanded.

## New chat creation timing — 2026-09-30

- New chat opens a reusable composer draft, not a saved task. Create the task only on the first sent message or attachment; repeated visits reuse the unsent draft.
- Remove legacy unnamed New chat placeholders only when they have no project, messages, assets or nonblank draft. Preserve intentional named tasks and all user content.

## Stable sidebar width — 2026-09-30

- Inbox and regular navigation share the same responsive sidebar width. Switching the bell changes sidebar content only, without widening the desktop sidebar or mobile drawer.

- The workspace-bar restore control sits at the upper-right edge. When the reader is open, reserve space beside its actions to prevent overlap.


## Reading-window panel refinements — 2026-09-29

- Keep the gallery and stream inside the merged reading window. Floating gallery actions share a 144px width and 16px/6px inline/block padding; the token button label and Token usage heading use 60% opacity. The Token usage heading uses the meta font size. Version statistics sit on a soft, strong shadow in the page background color.
- Saved-frame selection reserves 30% of the gallery’s top control row and uses “Select frame” as its placeholder, in the muted color while that placeholder is showing. The Iteration Visualizer title fills the header, with the date range and Select frame at content width on the right. Version statistics sit directly under the See token usage button. The tracked file menu sits at the left of the bottom row, with gallery zoom and reset to its right. Downward carets in both reading panels use `--selector-caret-size`, the tracked-interface caret. The gallery info tip uses commas between actions, the sidebar background, regular text color, and sits 8px below its button.
- Version stream center and endpoint controls occupy the top row beside the panel title. The center control keeps a single divider, and its icon uses the same color as the endpoint arrows. Endpoint arrows use the zoom-icon size. Each arrow button is square, with its width equal to the row height, and the dividers beside the endpoint label run the full row height. The title keeps “Version stream” whenever that label fits, with a min-width equal to the full label, and its heading fills the header. The branch menu sits at the left of the bottom row and opens upward. Grid sits immediately left of zoom out, with zoom and fit to their right. That footer row has no padding of its own. Stream fit uses the same reset control as the gallery. Zoom out and zoom in glyphs use the smaller zoom-icon size inside their buttons.
- Ordinary active gallery block outlines use 0.75px strokes at 30% opacity in gallery and token views; preserve the existing hover emphasis and inactive dimming.
- The stream title heading consumes remaining top-row space. The endpoint field stays with its navigation arrows at the right of that row.


## Prototype landing and full-interface captures — 2026-09-29

- Open “Explore a clearer profile panel” with its Profile panel resource expanded on initial load and refresh. Resolve this launch destination by stable task/asset IDs against existing saved data; retain Home as a fallback if that task is missing. Expand its project in navigation. Do not reset saved workspace data.
- Progress captures show the full prototype shell, including navigation and the workspace bar, rather than the isolated version panels. Preserve gallery/theater/token capture states inside that shell. `c home` captures the new default landing state; the explicit `?view=history` route remains available for direct panel access.

## Version control in the workspace bar — 2026-09-29

- Replace the workspace-bar local-demo label and avatar with a Version control button. It opens the prototype reading window (Iteration Gallery and Version stream) on the task that owns that resource.
- When that version-control screen is already open, replace the button with expand/restore and close. Those window controls stay in the workspace bar when another attachment is open. Do not put a resource-icon strip in the workspace bar.
- Remove the separate unified reader header row. The reading surface begins at its content.

## Conversation chrome — 2026-09-29

- The sidebar lists projects that contain tasks. Empty projects stay in the Projects directory and on Home. Do not add a Project overview link under a project; the project name still expands its tasks, and the Projects heading still opens the directory.
- The workspace bar stays visible. Remove its collapse and restore controls.
- Workspace-bar reading controls are expand/restore and close. Remove the source label, the workspace-history information button, and the resource-icon strip.
- A conversation has no title row. The chat name is the last breadcrumb segment and updates with the task title. Status, participants, and the heading’s task-details toggle are not repeated there; task details remain in the context card. `c chat "Title"` captures that conversation with the reading window closed.


## Merge milestones in version stream — 2026-09-29

- Read reachable branch/remote history in parent-safe date order; exclude stash-only and index bookkeeping commits by selecting branch/remote refs rather than all refs.
- Real merge commits receive a whole-number milestone even without a push capture. Later saved versions advance as needed, and WIP follows the final milestone. Keep capture.version unchanged as the source lookup key so push-frame navigation still finds its saved frame. Other uncaptured commits retain dotted labels.
- Preserve actual Git parents. If consecutive milestones on parallel histories have no ancestral connection, a merge may additionally carry a dashed chronological connection from the previous milestone. Use this display dependency for vertical placement without rewriting Git metadata or ancestry.

## Shared interface foundations — 2026-09-29

- Apply the version panels’ neutral surfaces, text hierarchy, compact controls, fine borders and card hover treatment to the imported navigation, conversations, directories, forms and Todos board. Preserve existing icons, layout behavior and semantic project/status colors.
- Both interfaces consume shared control, row-padding, card-padding, radius and typography tokens in `src/control-tokens.css`. The imported interface bridges its surface variables to the panel foundations through `workbench-system.css`; retain theme-aware contrast for dark mode. Selection and primary actions use the panel’s neutral accent rather than a separate blue interface style.
- `c to-dos` (or `c todos`, or `c todo`) captures the full prototype shell on the Todos board with its reading window closed.

## Incoming collaborator branches — 2026-09-29

- Summarize a remote branch’s uncaptured contribution to a merge as a floating origin station with its Git ref name and no version number or commit card. Discover local and remote refs from Git; do not infer collaborator names from screenshots or special-case version numbers. Captured contributions retain their full history.
- Place that origin level with the milestone immediately preceding the merge, in a separate lane. Connect it to the merge using horizontal and vertical segments. Omit the long diagonal routes from the summarized contribution’s older ancestors.
- When a chronological connection is present, align this imported merge with the preceding milestone and use that chronological stem in place of the old side approach. Keep the original Git parent hashes separately from the projected display parents, and preserve subsequent merge and WIP numbering.


## Product sample workspace — 2026-09-29

- Use the shared prototype profile (`firstName: User`, `lastName: Example`) for identity, initials, greetings, task creators and user messages. Historical captures and Git metadata retain their original contents.
- The former Mobile app sample project is now MitWerk product prototype. Its three sample conversations cover 3D version blocks, commits/branches/frames, and theater playback/navigation, with matching reference documents. Keep stable task and asset IDs so navigation and reader behavior continue to work.
- Upgrade bundled sample conversations once in existing saved workspaces. Preserve custom titles, appended messages, drafts, task statuses and unrelated projects. The default task remains `panel`, now titled Implementing 3D version blocks; its opened resource is Iteration Visualizer.

## Unavailable actions and interface type — 2026-09-29

- Mits, Library, and sending from any chat field do not navigate or add a message. Each shows one notice: “This isn't available yet.” The notice is fixed to the bottom of the screen and enters from below. It dismisses on its own except during a capture that asks for the toast.
- The sidebar user mark uses the same muted color as the other navigation icons on a light line-colored disc. The name stays in the primary text color, with no workspace subtitle.
- Remove the composer caption under every chat field, including the new-chat launch.
- The imported workbench and the version panels do not set letter-spacing. Do not keep a tracking token for titles, labels, or mono text.
- `c chat and version side by side` opens the default conversation with the version-control reader beside it, unexpanded. `w/ toast triggered` leaves the unavailable-action notice visible.

## Sidebar and workspace bar — 2026-09-29

- New chat, the other navigation items, and each project row share one button: ink text, the same padding, height, radius and icon-to-text gap. Their type size is the sidebar section size, and their icons use `--sidebar-nav-icon-size`, slightly smaller than the former 18px navigation icons. Sidebar conversation rows use that button with no icon; the title’s left padding lines it up with the project name.
- The project name and its conversation titles use one size, halfway between the former 12px project title and the former 11px conversation title (`--sidebar-section-size`). The Projects heading is the smaller meta size.
- The workspace bar’s inline padding is the same row padding as the reading-panel title.
- The sidebar surface is a lighter gray than the panel fill (`--sidebar`). The sidebar brand is the MitWerk logo image. The main sidebar group is a column of the header, the navigation, and the project list, separated by the header row’s former bottom margin (`--sidebar-group-gap`). The sidebar shell keeps its top padding and gives its former inline padding to the main group and the user row. The user row has no extra top space. Project navigation is a column of the Projects header and each project group, and each project group is its own column. The sidebar user mark uses a light line-colored disc.


## Theater return and sidebar navigation — 2026-09-29

- Place the Gallery return action as a bordered, clickable chip inside the theater’s content toolbar, below the Iteration Visualizer header. Reuse shared surface, control-size and padding tokens. Its padded toolbar area remains excluded from drag-to-exit, and clicking preserves the existing reverse transition.
- The Projects heading is one row: clicking the label or its upward-right arrow opens the project directory. The arrow has no extra control padding. The heading uses the meta type size and keeps a margin of two row-size units below it. Each project row leads with a Phosphor folder icon, matches the sidebar nav buttons, and still expands and collapses its conversations. Sidebar conversation rows have no icon. Each project group and its conversation list are columns with a 2px gap (`--sidebar-list-gap`). Each conversation button’s left padding equals the nav padding plus the shared icon and its gap, so the title starts where the project name starts. Conversation lists have no left border.
- The sidebar’s top padding is the shared row padding minus one row-size unit. The user row has no top border. The user mark is a light disc and shows the name only.
- A conversation’s message column has a maximum width of 80 characters, a larger top margin, and a shorter message line height (`--message-line-height`). A message you send has no avatar or name, sits on the right, and is at most 70% of that column; its time is right-aligned under the text. Mit messages stay on the left and keep the avatar, name, and Mit label. The time for every message is its own row under the text. `w/ page scrolled to top` captures that conversation at the start of its messages.
- New chat, Mits, Todos and Library are one navigation group with a 2px stack gap (`--sidebar-nav-stack-gap`) and share one icon-and-text button with the project rows. The current page still uses the active treatment.

## Unified Phosphor icons and subdued block outlines — 2026-09-30

- Use the installed Phosphor icon family for every interface icon, superseding the instruction to preserve imported icons. Use regular outline icons by default, with filled transport/stop icons where a solid silhouette communicates playback. Keep accessible names on controls; decorative icons stay hidden from assistive technology. Centralize semantic mappings and sizing in reusable icon components. Diagram geometry, status indicators and avatars are not interface icons.
- Sidebar navigation and project icons share `--sidebar-nav-icon-size`. Hovering the Projects heading changes only its up-right arrow color; the label and row background remain unchanged.
- Gallery version-block outlines use 18% opacity in both gallery and token views. Preserve hover emphasis, disabled scaling and existing geometry.

## Frame annotations and to-do handoff — 2026-09-30

- Annotations belong to stable saved-frame IDs, retain frame metadata, and persist locally separately from Git and screenshot history. New frames support the same behavior; sample content is isolated from rendering logic.
- A branch-colored bookmark (dark gray on main) slides out above the frame after the shared Enter prototype delay. Empty bookmarks show a muted New annotation placeholder; populated bookmarks show the annotation count. Pause playback and pin the presented frame when opening annotations.
- Annotation dialogs are confined to the Iteration Visualizer panel and blur only that panel, show the referenced frame, and support creating, listing, editing and deleting notes. Theater and close actions dismiss only the annotation dialog; they never return to Gallery. Use panel-scoped focus containment, Escape dismissal, focus restoration and reduced-motion support. Save requires nonblank text; delete is a red text action beside Save.
- Mark as to-do publishes the same persisted annotation to Todos. Editing, unmarking and deleting reflect there immediately. First activation offers Start new chat or Continue recent chat. Preserve existing drafts and append the note with its source frame once; remember that destination for later visits.
- Sending annotation context runs an explicitly labeled local sample flow and moves its to-do through In progress to Ready for review. It does not call a live agent or modify source files. Other unsupported sends retain their existing behavior.
- Capture cues may name a prompt frame (`frame 240`) and request its annotation overlay, overriding the ordinary theater reference frame.

## Panel-scoped annotations and prompt transport — 2026-09-30

- Annotation overlays cover only the Visualizer bounds; the navigation and Version stream stay clear and usable. Returning from annotations opens the referenced frame in Theater.
- Bookmark backgrounds use the frame branch’s shared route color, with a tokenized dark gray for main. An empty tab uses the plain Phosphor speech icon; populated tabs use the dotted speech icon and count. Annotated frames carry the same colored, clickable bookmarks above their image plane in the 3D album.
- When the frame action buttons wrap, Enter prototype becomes the first action. Detect the actual available action width, preserving the bookmark at the frame edge.
- Playback’s previous/next arrows move to the adjacent prompt in the selected time range, skipping push captures. Push frames remain accessible through timeline push blocks.

## Compact annotation bookmarks and frame picker — 2026-09-30

- 3D annotation bookmarks use shared compact width/height tokens. Show a centered count when a frame has more than one annotation; retain the branch background and readable contrasting text. Dispose count textures with their bookmarks.
- Select frame lists saved frames newest to oldest by timestamp. Annotated entries have a filled Phosphor bookmark aligned at the right edge, independent of label length. The rich listbox supports keyboard navigation, selection, Escape and outside dismissal.

## Workspace view tabs and subdued bookmarks — 2026-09-30

- Every opened chat has Chat and Version control tabs beneath the breadcrumb. The row shares its height, inline padding and typography tokens with the breadcrumb. The selected tab uses a browser-tab treatment; one fullscreen toggle sits at the far right, and the former header close action is removed.
- Chats open full-width by default. Exit fullscreen shows Chat on the left and Version control on the right. In split view, selecting a tab chooses which pane the fullscreen action will expand. Switching tabs while full-width displays the chosen pane. Preserve chat drafts and the current chat when opening its version control.
- 3D bookmarks rise with their hovered frame and gain a small additional animated lift. Theater and gallery use the shared subdued branch accent; main uses a light gray accent lighter than the Enter prototype action. Count text remains dark for contrast.
- Push captures do not support annotations: hide the annotation tab and omit their gallery bookmarks and picker indicators. Prompt annotations remain unchanged.
- `c chat & version side-by-side` is equivalent to `c chat and version side by side`.

## Annotation overlay refinement and compact workspace tabs — 2026-09-30

- Annotation overlay content is vertically centered inside the Visualizer’s available body area, with a separate Theater return action. Use shared surface, border, radius, typography and spacing tokens for previews, lists and input fields, and the same primary button class as other workspace actions for Save. The sketches define functionality rather than literal styling.
- Overlay entrance first fades in the panel-local blur, then reveals the frame, then quickly reveals the surrounding controls. Keep timings in gallery annotation tokens, defer focus until the controls appear, and skip motion under reduced-motion preferences.
- After saving an annotation as a to-do, confirm that it is saved and offer Stay here or View all tasks. The latter opens the existing Todos dashboard; saving alone does not navigate away.
- Workspace tabs have reduced vertical padding from shared row tokens, no leading space before Chat, and the sidebar background. Version control uses the regular Phosphor Circuitry icon.

## Chat context panels, task origin and resource tabs — 2026-09-30

- Chat context panels have a plain title row outside the bordered body, without leading icons. Task details contains status and Attach to-do context only; no creator/date rows, overflow menu or collapse caret. Omit empty Output panels.
- A conversation's origin is independent from its agent. Regular chats (including sidebar-created chats and the 3D blocks sample) have no task details, completion controls or Over to you section. To-do chats retain these controls. Review sections use shared inline padding.
- Attach to-do context adds a removable, one-line icon chip above the composer text, labeled “To-do: …”, with ellipsis overflow. The composer grows to contain the chip; sending includes its full context, not the shortened display. Preserve the unsent message. Annotation to-do handoff uses the same chip.
- Each expanded project has a muted New chat... row that opens a blank project conversation, without the global New chat welcome page. These are ordinary chats, not to-dos.
- Input and Output resources open independent, closable browser-style workspace tabs beside the persistent Chat and Version control tabs. Keep open resource tabs scoped to their conversation, deduplicate repeated opens, and keep drafts when switching or closing tabs.
- Agent output timestamps use the shared message-time-gap token for increased separation; the following agent output also gets additional separation using message-output-gap. Context titles, chips and tabs reuse shared spacing, surface, type and icon tokens.

- Capture shorthand `c / chat` is equivalent to `c chat`.

## Sidebar resizing and chat-panel refinement — 2026-09-30

- The first breadcrumb reads Projects and opens the project directory.
- The sidebar has a draggable boundary, with keyboard resizing, bounded width and locally remembered sizing. It remains independent of the version-panel splitter and respects available viewport space.
- Only task-origin conversations have a right-aligned status dot in the sidebar. Reuse the existing to-do, in-progress, review and complete colors. Regular chats have no status dot.
- The review section title is Ready for review. Floating chat context panels now enclose their title row within the panel border, retaining plain text titles and the simplified task-details body.
- Todos has no Version control header action. Its main page-title row starts at the same vertical offset as New chat in the sidebar, derived from shared sidebar/header spacing tokens. Column inline padding is slightly larger via a shared token.
- New chat opens a temporary conversation without inserting a persisted conversation or sidebar row. Remove the project-level New chat... starter rows and unused blank New chat records created by the previous iteration. Preserve conversations with messages, files, to-do origin or unsent drafts.

## Annotation message presentation — 2026-09-30

- Use the shared, slightly darker light-gray main-branch bookmark accent for theater tabs and 3D bookmarks; other branches retain their subdued accents.
- Center annotation overlay content 10vh above the previous body center, allowing scrolling when the panel is too short. Create, edit and list headings share the Version stream header size; their speech and close icons follow that size.
- The annotation field has no visible label above it (retain its accessible name), with slightly reduced vertical padding. Save and the to-do checkbox label use the same body text size.
- Existing annotations use right-aligned, wrapping message surfaces with status and time metadata. Reveal each message in sequence using shared motion timings, with a taller scroll container. Honor reduced-motion preferences and keep editing available by mouse and keyboard.

## Chat composer and role labels — 2026-09-30

- Input and Task details share a compact header and body height; file lists scroll within that body. Context panel headers have no dividing line. The Input plus action has no padding or hover background; only its icon dims.
- Resource tabs have equal outside inline padding matching Chat, including their close control. The tabs row uses the breadcrumb background.
- Remove Share a file text and the mention hint from all composers, retaining file attachment and typed mentions. Task chats show Attach to-do only while no context is attached. Its keyboard-accessible dropdown combines unfinished tasks and annotation to-dos, newest first, without duplicating annotation-backed chats. Remove the task-details attachment action.
- Opening a Todos card automatically attaches that task's context in its destination composer, including repeat visits to annotation-linked chats. Preserve unsent draft text. Context chips remain removable.
- Agent message bylines have no avatar and always read Mit, followed by a colored role tag derived from that message's author. Shared palette colors distinguish roles, including deterministic colors for additional roles. Align output and timestamps with the avatar-free byline.

## Context headers, retained task details and unified tag color — 2026-09-30

- Only floating-panel header rows share a height. Task details, Input and Output bodies size to their content; file lists have a shared maximum scroll height. Empty Input shows its header alone. Increase title-to-count spacing with the shared count-gap token.
- Task details shows the task name below its header. Attaching a different to-do updates the displayed name and live status, keeping a separate persisted source link. Removing or sending the composer context leaves that link intact. Status changes apply to the displayed source task.
- Attach to-do uses the regular Phosphor check-square at the same shared size as Attach file. Text-action hover uses a background change instead of an underline.
- Sidebar top padding equals the breadcrumb row height. Sidebar bottom padding derives from the composer bottom spacing and border, matching the Attach file control's bottom clearance.
- Mit role tags share one palette hue and consistent text color, using different light accent strengths for roles and a lighter shared border.

## Theater context and compact version control — 2026-09-30

- Main-branch annotation bookmarks use a light gray accent shared by theater and the 3D gallery. Their bottom padding extends beneath the frame action row, keeping content aligned with Go to commit.
- Gallery and theater share the same header, including the saved-frame selector. Selecting a frame in theater updates its selected frame and playhead without leaving theater.
- Add frame to chat attaches a removable thumbnail context chip to the current chat, preserves its draft, and immediately shows Chat and Version control side by side. Keep attachments per conversation, deduplicate by frame identity, and retain frame references in sent messages.
- Below the shared compact-reader breakpoint, show only the Visualizer by default instead of stacking panels. A regular Phosphor arrows-left-right button beside the title switches to Version stream and back with a brief transition; retain each panel's state and respect reduced motion.
- Annotation text fields use a subtle inset focus treatment, without an external black outline. Text fields fit their sheet width, constrain vertical resizing, and remain inside the scrolling overlay body.

## Composer density, context rows and tab surfaces — 2026-09-30

- Reduce composer corner radius and top padding through shared tokens. Give Attach to-do a padded hit area while balancing the composer bottom space and its inline offset to retain its position. Use the regular Phosphor check-square-offset icon, sized like Attach file.
- Frame context does not suppress Attach to-do: any chat holding a frame can add a to-do, in addition to ordinary task chats. Frame and to-do chips stack above the message field and grow the composer naturally. Suppress the picker only when to-do context is already present.
- Completed task chats use a regular Phosphor check-circle in the sidebar instead of a status dot; preserve their completion color.
- Floating context headers and input/output file rows share one height token. Bring counts slightly closer to their titles. Input plus and the resource-row arrow share an icon-size token. Task details has no top body padding, with the task title below its status dropdown and the same font size as file names.
- Open workspace tabs have white surfaces against the sidebar-colored tab row. Add a 2px top inset and small top corner radii, retaining the row's existing height. Tabs fill the remaining height with no vertical padding.

## Active tabs and version-panel alignment — 2026-09-30

- Attach to-do text and icon share the muted Attach file color. Increase workspace tabs' top inset to 4px without changing the row height.
- Place the single fullscreen toggle inside whichever workspace tab is selected, including resource tabs. Active tabs have slightly stronger left, top and right borders. Chat surfaces use a soft downward shadow from a shared token.
- Compact version-panel switching sits immediately beside the title, with a small shared gap and no intervening divider. Header/footer control icons use one muted color across Visualizer and Stream. Saved-frame and date-range carets share the selector size token.
- Gallery version/range counts sit just below the Visualizer header, aligned with its title's left padding. Keep the count derived from the selected range, and remove its former position beneath token usage.

## Expandable task summary and quiet tabs — 2026-09-30

- Task details places a subdued task summary above Status with a divider below the text. Collapse long summaries to two lines with an ellipsis. Clicking the panel's non-control area or its keyboard-accessible heading expands the full text in place; clicking again collapses it. Keep status controls independent and reset disclosure when the displayed task changes.
- Ready for review has no inline margin. Its gray subtitle is a separate line directly below the heading.
- Sidebar completion icons and status dots share a fixed, centered indicator slot and row alignment. Input plus and resource arrows use the same slightly smaller action-icon token.
- Workspace tabs have no borders, including the active tab. Retain their inset, white surface and corner treatment; increase the text-to-fullscreen gap using a shared token.

## Quieter workspace chrome and spacing — 2026-09-30

- Agent bylines use shared smaller gaps below the header and between Mit and its role. Add 4px above only the topmost composer context chip, and slightly increase composer bottom clearance.
- Only the selected workspace tab has a white surface and a left/top/right border. Inactive tabs are transparent; tabs and the chat panel have no shadow. Breadcrumb and tab rows have no bottom border. Fullscreen hover keeps its background unchanged and only dims its icon.
- Sidebar brand-row center aligns with the breadcrumb's bottom edge using half of the header-height token as top padding. Archive the unused Workspace onboarding sample project from the active project list.
- Version-panel heading groups use space-between. Move the range statistics further below the header with a shared offset, retaining their header-aligned left inset.

## Task status overlays and completion feedback — 2026-09-30

- Restore the bottom divider on the workspace tabs row. The breadcrumb remains borderless.
- Task status choices open in a top-layer overlay anchored to the trigger, without expanding or being clipped by the floating context panel. Position within the viewport; support outside dismissal, Escape and keyboard navigation.
- Task summaries have shared vertical padding above their divider.
- Completed tasks reuse the Ready for review section layout, with “Marked as complete” and an “Undo” action. Omit the revisit helper sentence; Undo restores In progress.

## Default split chats and flush tabs — 2026-09-30

- Opening any chat, including default launch, sidebar chats, new chats and to-do handoffs, shows Chat and Version control side by side, with Chat selected. Keep fullscreen switching available and preserve explicit chat-only capture requests.
- Attach to-do and its picker entries use the regular Phosphor list-checks icon at the shared attachment size.
- Tabs fill the row with no top inset. Draw the active tab's outline independently of its content box, with side edges outside it; the first tab shares the sidebar boundary rather than adding a second inset line.


## Reliable tab edges, selectors and compact panels — 2026-09-30

- Preserve all three selected-tab outline edges, including at the tab scroller boundaries. Layer the outside left edge above the sidebar seam. Every tab-row button keeps its background unchanged on hover and dims only its contents; resource close controls have a shared larger separation.
- Native row selectors cover their entire visible row without overflowing it or scrolling the page when focused.
- Version control switches to one panel when either proposed panel cannot fit its shortened header plus controls. Derive that minimum from rendered header content rather than only a viewport breakpoint; retain the panel switch and both panels' state.
- The sample Iteration Visualizer resource (inline card and Output entry) opens prompt frame 240's image in a separate browser window/tab. Resolve the image from the capture catalog using sample asset metadata. The Version control tab remains the entry to the live visualizer.


## Todos hierarchy and compact panel inset — 2026-09-30

- In one-panel version control, title groups use equal outside left and right padding from the header inset token, including the panel-switch control.
- Todos has a short explanatory subtitle and a larger shared gap before its columns. Columns have slightly rounder corners; their count badges have a larger circle and smaller numeral.
- All task cards show the project name above the task text. Associated frames appear below the text, using the same icon size, type size and spacing as project labels. Omit chat-continuation helper lines.
- Render task text at Neurial Grotesk Medium (500) using the supplied local font face, with shared typography tokens.
- Demo annotations on prompt frames 225 and 252 add two notes per frame, one of each pair marked as a to-do. Keep sample content and project metadata separate from rendering logic, seed once, and respect edited or deleted notes.


## Todos copy, completion and clean chat context — 2026-09-30

- Todos uses the explanatory copy “Your to-dos from annotating projects. Click on a to-do to execute with agent.” Task text is slightly smaller through the shared size token, retaining Medium weight. Completed task text is muted and struck through.
- Annotation source labels read “Prompt #N (vN)”. Keep project and source labels otherwise consistent.
- Submitted annotation prompts show the user's note as prose and the associated frame as a chip. Preserve full reference metadata separately, without including the reference filename or URL in the message text. Older annotation envelopes receive the same clean presentation without deleting stored context.
- Workspace tabs use a shared icon-to-label gap one pixel larger than the base row unit.


## Task-card spacing and primary type — 2026-09-30

- Task cards within each Todos column share a slightly tighter 8px gap, including annotation-backed cards. Add a subtle divider below each project label with shared row-unit padding.
- Increase primary-button text by 1px through a shared token, retaining existing button heights and padding. Apply the increase to workspace actions, annotation primary actions and the Version stream's primary card action; preserve the larger starting size of annotation Save.


## To-do card actions and density — 2026-09-30

- Remove project-label dividers and slightly reduce vertical card padding through a shared token. Keep the existing inline padding and card gaps.
- Every to-do card exposes a Phosphor three-dot menu at its upper right on hover or keyboard focus (always available on touch). Edit and Delete open independently of card navigation; menus escape column clipping and support keyboard dismissal/navigation.
- Edits update the backing task or frame annotation. Deleting a to-do removes its task designation while preserving existing conversations and the original frame note; confirm that scope in the delete dialog.


## Compact to-do navigation dialog and action typography — 2026-09-30

- The to-do chat destination dialog contains only its header and two full-width, vertically stacked buttons. Omit button icons and explanatory/body text. Use a half-width (270px maximum) dialog and the shared card-title size for its smaller heading.
- Primary and secondary action buttons both receive the same 1px text-size increase through a shared action token. Keep their existing control heights, and keep paired navigation actions identical in type size.


## Single-line project labels and centered card actions — 2026-09-30

- Project labels in to-do cards stay on one line and truncate with an ellipsis, keeping the folder icon and reserved action space intact. Retain the full project name in the label tooltip.
- Three-dot card triggers have zero inner padding and center the icon in both directions within their shared square size.


## Narrow-screen navigation layering and motion — 2026-10-01

- Below the sidebar overlay breakpoint, the tabs row belongs to the main interface's stacking context, beneath the navigation scrim and sidebar. Preserve desktop tab-border layering.
- The sidebar slides horizontally from the left using a shared 220ms motion token, in both opening and closing directions. Keep its contents mounted through the transition, make collapsed navigation inert, and disable motion for reduced-motion preferences.


## Send and icon-button consolidation — 2026-10-10

- Send uses the same reusable `IconButton` component and shared `.mw-icon` styling as other workspace icon actions, including sizing, corner radius, colors, hover, keyboard focus and disabled treatment. Do not maintain a separate filled send-button style.
- Send keeps its arrow-up icon, accessible label, form submission and existing enabled conditions. The working-state Stop action uses the same component with its filled-square icon and existing stop behavior.
- Figma uses the shared Icon button variants with swapped Send/Stop icons; Send is a usage example, not a separate component family.

## Figma overlay component consolidation — 2026-10-12

- Dialogs and overlay menus with a shared structural shell belong to one reusable component family, with purpose and state expressed as variants. Preserve distinct content, interaction states and existing instance links when consolidating.
- Workspace dialogs share the Dialog family; stacked action, selection and suggestion popovers share Overlay menu. Structurally distinct annotation and fullscreen-preview surfaces retain their own families.

## Figma sidebar and responsive component layout — 2026-10-12

- Full UI frames use instances of the shared Sidebar component, with navigation selection expressed as a page variant.
- Content rows and labels fill available width in their auto-layout containers. Preserve fixed icon and control geometry; keep multiline content wrapping, and use ending truncation for constrained single-line labels instead of clipping or overflowing adjacent controls.
- User chat messages and agent replies use reusable Figma components in full UI frames. Expose message content and timestamps as text properties; agent replies support text-only and output-card variants. Message bodies wrap rather than truncate.
- Full UI frames reference the expanded Figma component library. “MitWerk · Current design system” is a plain editable reference board, without component masters or instances; shared icon masters live in the icon library.

## Dark mode switch — 2026-10-12

- A dark mode switch sits beside Search in the sidebar header (and beside Search in the workspace bar when navigation is hidden). It shows a moon in light mode and a sun in dark mode, exposes its state with `aria-pressed`, and stays in sync with the Settings Appearance control.
- The theme is one app-wide state (`src/shared/theme.ts`), stored in `localStorage` and applied as `data-theme` on the document root before first render. Light remains the default, so progress captures stay in light mode. An explicit `c dark mode` capture applies this same theme for that frame only.
- Every surface derives from the root tokens in `src/index.css`; `:root[data-theme=dark]` supplies the MitWerk dark palette. The workbench `--mw-*` bridge and the reading panels both read those tokens, so do not add per-component dark colors. Semantic project, status and branch-route colors are unchanged.
- Theme roles beyond surfaces are tokens too: `--contrast` (checked-out branch, stations, version labels), `--on-pale` (text on pale bookmark accents), `--token-area`, `--timeline-push-hover`, `--grid-line` and `--shadow-color`. TS design tokens reference these as `var(--token)`; WebGL and canvas code resolve them with `resolveColor` and repaint when the root theme changes. Embedded prototype frames keep their own white background.
- Gallery captures are never tinted by the theme: a mapped capture plane renders its texture with a white material color, and only blank planes use `--paper`. Their resting translucency is the theme token `--gallery-capture-opacity` (light .72, dark .94), so captures are not dimmed against the dark page. Hovered captures remain fully opaque.

## Flicker-free 3D viewport resizing — 2026-10-12

- Resizing the 3D gallery (dragging the reading-window or panel divider, or any layout change) must not flash. Resizing the WebGL renderer clears its drawing buffer, so the gallery redraws synchronously inside its resize handler, before the browser paints, rather than waiting for the next animation frame. Resizing never rebuilds the scene or reloads capture textures.

## Side panel toggle — 2026-10-14

- The workspace bar always leads the breadcrumb with the shared side-panel icon. It opens hidden navigation and closes the open panel; its accessible name and `aria-expanded` follow that state. The brand button still collapses navigation. Narrow screens keep the drawer and backdrop.

## Figma theme modes and gallery images — 2026-10-14

- The expanded Figma library uses Light and Dark modes in the shared MitWerk / Foundations collection. Full UI frames and component previews inherit those semantic tokens; keep one set of component masters and state variants across both themes. Dark colors are values of the same semantic variables under the Dark mode, never separate dark component masters or theme variants. Any dark showcase contains instances of the main library and is labeled as a mode preview. Local paint and effect styles are supporting library assets, not a separate component system.
- Bind surfaces, text, borders, selected navigation, Todos columns, pale-accent foregrounds and overlay foregrounds to their semantic roles. Pale bookmarks retain dark text and icons, and fullscreen scrims retain their translucent black treatment in both themes.
- Insert images captured from the actual local 3D gallery into the split and fullscreen gallery viewports, with captures matched to each theme and panel width. Keep surrounding controls and labels editable, and do not tint the captured prototype textures. Version-stream connectors remain empty in these Figma screens.

## Designed selection menus — 2026-10-14

- Selectors never open the operating system's native picker. Every selector in the Iteration Visualizer, theater and Version stream (date range, saved frame, tracked interface, playback speed, loop mode, preview viewport and stream mode) opens the shared designed menu: `SelectMenu` in `src/components/SelectMenu.tsx`, styled once by `.select-menu` in `src/control-tokens.css`. `RowSelect` is a button trigger for that menu, not a transparent native `<select>`.
- The menu is a listbox in the top layer (Popover API), rendered beside its trigger rather than portaled to the document body, so it escapes clipped panels and stays interactive inside modal dialogs such as fullscreen theater. It opens below its trigger and flips above when there is more room there, matches the trigger width (or a caller's minimum width) and stays inside the viewport.
- Keyboard behavior: arrow keys on the trigger open it; arrows, Home and End move the highlight; Enter or Space chooses; Escape closes and returns focus to the trigger; Tab or an outside click closes it. The current value is bold and the highlighted row uses `--fill-hover`.


## Dark workspace and playback — 2026-10-17

- The local app follows Figma “hifi temp” (576:18134) and “hifi temp - playback” (603:8717). Dark is the default when no theme preference is saved; explicit light preferences and capture overrides still work. This supersedes the earlier light-default rule.
- Default launch and chat navigation show chat beside Version blocks, with the sidebar collapsed and the Version stream hidden. Keep the full gallery/stream workspace accessible at `?view=history`. The brand toggles navigation; the workspace bar contains Live server, Version blocks, Idea stream and Chat actions. Counts derive from task data.
- Remove workspace tabs and breadcrumbs. Shared `PanelHeader` renders a conversation title or a Version blocks pill with a Gallery/Playback label, header actions and per-panel fullscreen control. In playback the pill returns to the gallery. Resource readers retain a title and restore action.
- Panel surfaces use the shared workspace background, 6px gutter, 16px radius, 44px heading and 52px footer tokens. Chat/gallery split defaults to 39/61 and remains resizable. Use the existing semantic dark palette, typography and dynamic content, never screenshot-specific assets or node exceptions.
- Gallery date range defaults to Last 30 days and sits in its footer; playback moves it to the header beside the saved-frame picker. The tracked-interface selector uses the folder icon and homescreen label.
- Playback has speed and loop controls at the upper right, a contiguous frame toolbar with a neutral annotation trigger and Add frame to chat, then the image, version/prompt/date, italic prompt summary, and muted branch metadata. The version badge is metadata; the old Go to commit toolbar action is omitted. Transport uses regular outline icons; timeline, annotations, frame attachment, saved prototype entry and gallery transitions preserve their behavior.
- Below 600px, show one workspace pane at a time to keep content readable; Chat and Version blocks in the workspace bar switch the visible pane.
- Figma files are reference-only for this update.

## Chat composer and To-do drawer — 2026-10-17

- Chat uses the hifi temp message layout: right-aligned rounded user messages, plain agent replies, timestamps, and reusable version-output cards with a linked preview. The bundled gallery conversation follows the reference's shorter exchange; migration preserves edited or added conversation content and drafts.
- Every chat shares a capture-context row, collapsible To-do drawer and composer. Clicking the full To-do drawer header toggles its expanded state. The expanded list shows real saved items with completion checkboxes and local creation timestamps; no duplicated placeholder tasks.
- The composer's bottom row has attachment, model label, keyboard-accessible Prompt / To-do switch and the shared Send action. To-do mode saves trimmed text in that chat's drawer, opens the drawer and clears the text without sending an agent prompt. Blank submissions are disabled. Prompt mode preserves normal chat submission. Switching modes preserves the draft; queued prompt attachments remain queued when text is saved as a to-do.
- Drawer items, completion, open state, mode and capture labels persist per chat. New-chat drawer state carries over when its first prompt creates the conversation. Drawer scrolling is bounded so input remains available on short screens. Colors, sizes and radii use shared semantic composer tokens for both themes.
- `c homescreen` aliases `c home`; `c homescreen w dark mode` captures the full default split workspace in dark mode.

## Prompt source and workspace panel controls — 2026-10-17

- `docs/prompt-log.md` is the designated verbatim prompt source. Numbered entries start with `## Prompt #N` and fenced plain text; preserve spelling, line breaks and links. The capture script logs the full input before shortening its filename, keyed to the same screenshot counter. The shared parser loads full text into the development and production catalogs; playback renders it without truncation. Historical entries without full text retain the filename summary, without inventing missing text.
- The panel is named Version blocks. Gallery and Playback are buttons in a shared view switch with pressed and disabled states. Entering Playback pans to the latest visible frame by timestamp, then uses the existing frame rotation and timeline entrance; Gallery reverses the transition. Honor reduced motion and prevent repeated navigation during transition.
- The title pill has equal 14px inline padding. Restore the pre-Figma filled playback transport icons while keeping the current layout and behavior.
- Workspace links toggle panels on and off independently. Only the text of currently displayed panels is underlined; icons and badges are never underlined. Each button exposes `aria-pressed`. Live server uses the gridded globe; Idea stream uses a Git-branch icon and opens the existing Version stream graph (user clarification), not Todos. Live server remains explicitly unconnected until a target is configured.
- On narrow screens, focus one enabled panel at a time and reflect its actual visibility in the workspace links. Closing the final panel leaves the workspace bar available to reopen it. Existing Todos remain accessible from navigation.

## Adaptive gallery quality and single view label — 2026-10-17

- Gallery captures retain their original source pixels. Drawing-buffer resolution scales with the panel's CSS width and device pixel ratio: wider panels receive up to 1.5× supersampling, capped at 3× density, 12 million pixels and hardware texture dimensions. Recalculate on panel/window resize, retain cached textures and redraw synchronously. Use up to 16× hardware-supported anisotropic filtering with mipmaps to preserve detail on tilted image planes.
- The Version blocks view switch displays only its current Gallery or Playback label, following hifi temp: SF Mono (system monospace fallbacks), 11px, 1.45 line height, 60% ink opacity, without an underline. This supersedes the two-button switch. Clicking the label switches views with the existing camera transition and a 200ms sequential text slide/fade; the outgoing word leaves before the incoming word appears. Reserve label width to prevent header movement, preserve keyboard focus and honor reduced motion.

## Gallery zoom ownership — 2026-10-17

- The live gallery camera owns zoom. Wheel and pinch gestures update it directly; React receives a readout only, never echoes that delayed value into the camera. Footer zoom buttons issue commands against the live camera value, with shared limits and step tokens; reset commands return to 100%. Camera transitions retain ownership while animating. Pan/orbit changes must not republish unchanged zoom or rebuild captions unnecessarily.

## Idea stream inside Version blocks — 2026-10-17

- Idea stream is a right-hand column inside the Version blocks reading window, using its shared resizable split. It is no longer a separate workspace panel. Opening Idea stream also opens Version blocks when needed, preserving fullscreen state and the outer Chat/reader split. Both workspace links reflect visibility; closing Version blocks closes both columns, while closing Idea stream preserves the current playback frame.
- While Idea stream is open, the left column is constrained to Playback. From Gallery, pan to the latest visible frame, then use the existing frame rotation and timeline transition. Opening from Playback keeps the current frame. Gallery return controls and orbit-to-gallery are unavailable until Idea stream closes. Existing graph push actions navigate the adjacent playback column.
- Nested columns use the shared reader minimum width and draggable/keyboard-accessible divider. Below their combined minimum width, the reader scrolls horizontally rather than hiding one column; playback header controls wrap within their own column. The legacy `?view=history` compact panel behavior remains unchanged.
- `c idea stream w playback side by side` captures the full prototype shell with the paired reader expanded, Commit history on the right, and Playback settled on the latest visible frame on the left.

## Right-facing, newest-first gallery — 2026-10-17

- Default and Reset cameras view the album from the left so the screenshot faces slope upward toward the right, matching the supplied reference. Keep screenshot pixels readable, never mirror their textures. Reflect shared block/frame depth, chunk boundaries and hit regions so the newest frame is nearest the front; preserve chronological data, playback order, version identity and equal version spacing. Center/startup now focuses the latest in-range frame, falling back to the latest historical frame. When only one representative image is needed, sample the newest eligible version.
- Version values, featured labels, ticks and the Version title live to the left of the blocks. Move the date wall to the right so its overhead rail stays separate; update both standing and featured guides and include these extents in Reset fitting. XR exports use the same geometry, with chronological progress toward +Z.
- Edge exploration moves back through older blocks from the new front. Token view retains oldest-to-newest accumulation and left-to-right time, with 0% at the bottom and 100% at the top; derive it from timestamps rather than spatial depth. Playback transitions retain the existing live camera handoff.
- Mirror the shared MitWerk logo SVG horizontally within its existing viewBox, so all logo instances use the same updated asset.

## Gallery reset, fullscreen and drawer reuse — 2026-10-17

- Remove the standalone Reset view button from the Version blocks footer. Single-clicking the zoom percentage resets zoom to 100%; double-clicking it resets the full gallery camera view. Defer pointer single-click to avoid firing both actions; keyboard activation resets zoom and Shift+Enter resets the view. Keep Home on the gallery canvas as a camera-reset shortcut.
- All fullscreen controls use the chat header's shared regular Phosphor corners-out/corners-in glyph, including workspace and frame-preview entry/exit. Fit/reset actions remain distinct from fullscreen behavior.
- The chat Send button has a circular semantic ink background and paper foreground in both themes, with a visible disabled treatment. Use the same treatment for To-do submission.
- Drawer checkbox clicks only toggle completion. The separate keyboard-accessible text button appends the item's full text to the current chat draft on a new line, switches to Prompt mode and focuses the end of the input. Preserve existing draft text, queued attachments, the to-do itself and its completion state; do not submit automatically.
- `c home w todo drawer` opens the drawer in the default split workspace capture using saved items or the normal empty state, never fabricated tasks.

## Milestone-led Idea stream — 2026-10-17

- Idea stream records design decisions alongside the real Git graph. Keep all Git/capture identities, parent relationships, branch navigation and saved-frame links intact. Command/commit messages are hidden initially, including for a previously selected node, and disclosed only by clicking its station. Clicking again closes the disclosure. Milestones remain visible independently of selection.
- Users can add a milestone from any expanded station, edit its note with the pencil, or remove it. Store notes locally by stable node ID separately from the immutable Git graph. Seed the seven requested decisions as content in `idea-stream.ts`; version labels locate that initial content only and never control layout. Preserve edited notes and intentional deletions across reloads. Long note/message bodies scroll within bounded cards so neighboring stations stay clear.
- Collapse consecutive runs of at least two nodes without milestones into an outlined count circle and “versions” label, with no decorative rail or endpoint dots. Derive runs from consecutive same-branch parent/child or chronology chains; retain external fork/merge connections, chronological anchors and imported branch origins on the folded representative. Remap display connections through the collapsed representative without mutating original ancestry. Clicking the count restores every station; the Fold control restores automatic folding. A new milestone splits its run automatically. Geometry comes from shared Idea stream tokens.
- Opening the historical Idea stream frames its latest milestone, with room for its note in narrow columns. Milestone controls navigate the always-visible decisions in chronological order. Test visual retains its existing editing and sibling-fold behavior.
- Version blocks now defaults to All time, superseding Last 30 days. Early captures remain available as the calendar advances; explicit date filters still work. The V1–V9 images were present in the catalog but outside the previous 30-day window.
- `c home w idea stream` captures the full home workspace with Chat alongside the paired Playback/Idea stream reader. Preserve the outer split instead of expanding the reader.

## Adaptive date ranges and playback navigation — 2026-10-17

- On launch, select the smallest listed date range containing at least ten distinct visible versions, using the same filtering and push-frame policy as the displayed version count. Fall back to All time when fewer than ten exist. Recompute while the range remains automatic; a user's explicit selection (or capture override) takes precedence and survives catalog refreshes. This supersedes the fixed All time default. Opening an older push outside the selected range expands to All time so its frame remains available.
- Playback's timeline supports horizontal panning by dragging with the middle mouse button anywhere on the blocks or push separators. Suppress browser autoscroll and frame selection during this gesture; finish cleanly on release, cancellation or lost pointer capture. Vertical mouse-wheel movement scrolls this region horizontally, while horizontal trackpad gestures retain their direction. Normalize pixel/line/page wheel units and leave modifier-key zoom gestures alone. Left-button scrubbing and keyboard frame navigation retain their behavior.
- Idea stream Fit all can scale below the normal manual zoom floor to fit the complete graph in the available panel. Compute both horizontal bounds in the same shifted coordinate space and include zoom-compensated branch labels in Fit all. Capture Fit all uses that same framing logic.
- Archived prototype previews run with their saved push date, alongside their frozen catalog and isolated storage. Historic relative date filters must not expire simply because the deployment is viewed later. Timers and explicit date parsing stay native; no archived source files are modified. Rebuild the Vercel output to apply this bootstrap to every packaged archive.
- `c home & gallery w time range dropdown` captures the home Chat/Gallery split with the shared date-range menu open. An explicit recapture replaces the previous image in place without creating another prompt number or changing its recorded prompt text.

## Chat frame links and first branch labels — 2026-10-17

- Chat version cards resolve their version number, image and stable frame ID from the shared capture catalog. Their arrow and preview open that exact prompt frame in Playback, including from Gallery or a closed reader; expand an excluding date range to All time. Preserve Idea stream visibility. Refresh only unchanged bundled sample messages, keeping edited exchanges, later messages, drafts and drawer items.
- Idea stream uses only the reference’s circled count for folded runs, leaving real graph connectors and branch colors unchanged. Show each branch label once at its first recorded station or imported origin. If that first station is folded, place the label beside its folded representative and restore it to the first station on expansion. Derive ownership from the complete graph, never version-specific exceptions. Test visual retains its editing presentation.

## Restored commit cards and compact chat controls — 2026-10-17

- Idea stream station clicks disclose the original shared VersionCard, including commit heading, references, file/prompt statistics, line changes, details and actions. Keep milestones always visible and command cards hidden until selected; preserve read-only Git history behavior and use the same component as Test visual rather than a separate simplified message box.
- Playback shows added and removed lines on the branch-name row in the original `+… −… lines` format, retaining the shared addition/removal colors and compact counts from capture metadata. Long prompt text scrolls within the summary so the version and branch/change rows stay visible.
- Chat version output is one content-height card with its preview inside the left side, label in the middle and navigation arrow on the right. Preserve image aspect ratio and exact-frame navigation; use one button rather than nested interactive controls.
- The model selector and Prompt / To-do switch use the same shared text-size token. The model opens the shared keyboard-accessible dropdown, with a filled background while expanded; list the verified cross-provider catalog while keeping selection separate from actual provider connectivity.
- Capture-context pills are fully rounded through a shared radius token, including their editing inputs. `c chat and idea stream` captures Chat beside the combined Playback/Idea stream reader.

## Idea stream subpanel and compact branch lanes — 2026-10-17

- Version blocks owns one shared header spanning Playback and Idea stream. Put Idea stream navigation in that header and begin both content columns underneath it; the nested divider starts below the shared header. Retain the standalone history/Test visual header outside the embedded reader and keep its controls accessible.
- Assign historical branch lanes from branch lifetimes and ancestry, reusing the nearest available lane after a merge. Successive branches leaving the same parent lane have the same horizontal reach; concurrently active and nested branches retain separate lanes. This supersedes only aligning the latest side branch. Never special-case branch colors, names or version IDs.
- Hide uncaptured imported branch-origin decorations (the current burgundy route, origin dot and tag) in Idea stream. Preserve original Git parents, merge metadata, captured nodes and milestones; hide only the synthetic incoming route from the presentation, bounds and labels. Other graph modes retain their existing origin display.
- Idea stream’s footer contains its grid, fold and zoom controls, with no branch dropdown or standalone Fit all icon. Single-click its zoom scale to reset to 100%; double-click or Shift+Enter to Fit all. Reuse the shared ZoomScaleButton timing so double-click does not also fire the single-click action. Version blocks retains the shared fullscreen action.

## Milestone navigation and markers — 2026-10-17

- Historical Idea stream uses a “Milestone x/x” selector. Previous/next wrap through nodes with nonempty milestone messages in chronological order, selecting and focusing each at reading zoom without opening its command card. The middle button recenters the current milestone; an empty stream shows “Milestone 0/0” with disabled controls. Test visual retains endpoint navigation.
- A milestone station uses a filled trophy glyph matching the canvas background instead of a circular node, with no button background fill. Notes and station interactions retain their shared behavior. Adding/removing a milestone updates navigation, markers and automatic folding immediately.
- Fold every connected run of at least two consecutive same-branch versions without milestones, including runs immediately before or after a milestone and runs containing merge/chronology junctions. Preserve and remap all external Git connections and origins; never fold across a milestone or intervening branch. Keep multiple external chronology anchors separate rather than dropping them. Expanding restores original stations and ancestry.
- Chat version cards have zero top, bottom and left padding. Their thumbnail reaches the full content height inside the card border, cropping with object-fit: cover without distorting pixels; keep the shared minimum preview height, right padding and exact-frame button behavior.
- Fullscreen and existing corner-style fit controls use the shared regular Phosphor FullscreenIcon renderer and header glyph size, including legacy graph reset controls. Fullscreen and fit behaviors stay distinct.
- A home capture requesting a zoomed-in milestone focuses the latest available milestone at 100% using the same framing helper as milestone navigation, with Chat and the shared Playback/Idea stream reader visible.

## Drawer motion and historical to-dos — 2026-10-17

- The shared chat drawer animates its intrinsic height with a 440ms decelerating opening and 300ms closing, using shared drawer motion tokens. Reverse transitions smoothly; keep contents mounted and make collapsed contents inert and hidden from assistive technology. Respect reduced-motion preferences. Fade the heading to 65% after expansion, restoring it on collapse.
- To-do timestamps use 50% opacity and local creation time, with calendar-relative date labels (Today, Yesterday, N days ago) and a saved version suffix such as “(v30)”. Compute labels from persisted ISO timestamps and refresh while the app is open; calendar-day arithmetic must handle DST and year boundaries. Resolve the version from capture history at creation, preserve it thereafter, and omit unknown versions rather than inventing one.
- Seed three past-dated sample to-dos once in the bundled gallery conversation, retaining existing items, completion, composer mode and drafts. Persist their generated dates; reloads must not regenerate or duplicate them. Other conversations retain empty drawers until used.

## Drawer ordering and milestone cutouts — 2026-10-17

- Display pending to-dos first and completed to-dos last, newest creation time first within both groups. Derive display order without mutating saved item order or IDs. Animate checkbox-triggered moves from each row’s current visual position, including interrupted animations, using shared timing and easing tokens; honor reduced motion and preserve focus on the checkbox.
- Drawer text hover/focus gently shifts and fades in its underline using shared motion tokens. Completed text retains its strike-through. Relative timestamps include the clock only for Today and Yesterday; older days retain their relative date and version suffix.
- Inserting a to-do into a nonempty draft preserves the draft and appends a newline (if needed), `------`, a newline, `Execute this todo: `, a newline, then the to-do text. An empty draft receives only the text. Switch to Prompt without submitting or changing the to-do.
- Milestone trophies are canvas-colored cutouts with transparent button backgrounds, centered exactly on the branch station using the shared graph/card offsets and glyph size, independent of the bordered circular-node offsets.
- A capture requesting a to-do added to the chat field opens the drawer and inserts its newest pending item through the normal draft action without submitting it.

## Browser feedback: thumbnail, header controls, model selector and drawer count — 2026-10-17

- Increase the shared message preview dimensions by 1.5×: 144px wide and a 90px minimum card height, with a 45% width cap for narrow panels. Keep the thumbnail flush to the card edges and allow content to grow vertically.
- Fullscreen glyphs inherit the shared header button ink color at full opacity, including within the reader; generic muted reader icons must not override them.
- Give the model trigger 7px vertical / 10px horizontal padding and its popup 8px padding on every side. Use the shared accessible selector with provider labels and persist the selection per chat. Keep the filled active state. This remains a prototype preference, not an API connection.
- The model catalog is verified 2026-10-17 against [OpenAI](https://developers.openai.com/api/docs/models), [Anthropic](https://www.anthropic.com/claude/fable), and [Google](https://ai.google.dev/gemini-api/docs/models). Offer GPT-6 Astra, GPT-6.1 Sol, GPT-6 Luna, Claude Fable 5.1, Gemini 3.8 Flash and Gemini 3.5 Flash-Lite. Keep the catalog and sources together for future refreshes.
- The To-do drawer header includes an outlined circular count of unfinished items, including zero, in both collapsed and expanded states. Derive it from completion state; update it immediately and provide an accessible live description. Use shared size/type tokens and let multi-digit counts grow without clipping.

## Vertical Idea stream and composer refinements — 2026-10-17

- Historical Idea stream now presents versions in one chronological vertical column, changing branch colors halfway between neighboring stations. Derive order, color ownership, folds and labels from graph data; preserve all original Git ancestry and keep the divergent `layoutGitHistory` implementation available for future use. This supersedes compact divergent lanes in the default Idea stream only; Test visual keeps its existing layout.
- Milestone trophies have circular branch-colored backgrounds, centered on their station using the shared 36px milestone diameter; the 28px trophy remains canvas-colored. Branch colors remain consistent across routes, markers and labels regardless of selection.
- Prompt / To-do pills share 7px vertical and 10px horizontal padding. The attachment icon matches the field placeholder foreground at full opacity. Align the unfinished to-do count to the header's right edge using a 14px minimum diameter and 9px type, allowing larger counts to grow.
- Version output cards retain the preview, text and arrow without an additional logo beside the label. Push-frame Enter prototype actions render immediately with no entrance delay or animation; disable them while checking availability or building, and retain the missing-archive feedback.

## Footer navigation and borderless playback actions — 2026-10-17

- Put Center selected version and Milestone previous/current/next controls in Idea stream's footer, alongside its existing view controls. Keep Version blocks' shared header and fullscreen control. Footer controls may wrap in narrow panes without clipping; Test visual retains its standalone header navigation.
- Playback's frame-action row has no border or right padding and a 0.4rem bottom margin. The annotation action is fully rounded with shared 6px vertical / 12px horizontal padding and a 13px icon.
- All dropdown panels have zero outer padding through the shared dropdown-panel token. Preserve padding within option rows. Model options show only model names, without company suffixes; selections and keyboard behavior are unchanged. This supersedes the earlier 8px model-popup padding rule.
- Saved-frame selectors stretch through their wrapper chain to fill the header's content height in both Gallery and Playback.

## Recent Idea stream and reference images — 2026-10-17

- Keep the latest three chronological versions individually visible, even without milestones; automatic folding applies to older eligible runs. On opening Idea stream, disclose the latest non-WIP commit and frame the recent versions plus that disclosure. Derive the default from Git/capture metadata and WIP titles, never version numbers. Explicit user selection and capture framing take precedence after launch.
- Idea stream commit cards omit the details/line-change row. Their prompt-count button has no arrow and navigates to the node's matching saved push in Playback; disable it if no matching push exists. Test visual retains its detail controls.
- Idea stream reference images appear as shared 84px square thumbnails, with all references available. Clicking one appends the original image as chat context without submitting or changing draft text; avoid duplicate attachments by URL. Nonimage references keep their file treatment.
- The shared reader heading consumes spare width; date-range selectors stretch through their wrappers to fill the header just like saved-frame selectors.
- New annotation-mode reference images use `visual_ref/annotation/[prompt #N] [annotation] <original filename>`. Ordinary references and historical filenames remain in place. The catalog, local server, production build and archived-prototype reference serving support this designated subfolder without permitting arbitrary paths. The save-reference command copies without overwriting existing files.


## Main branch and draft milestones — 2026-10-17

- Idea stream's `main` branch uses the semantic contrast color: white in dark mode and black in light mode. Apply it consistently to routes, stations, trophy backgrounds and branch labels; other branches keep their palette colors, independent of selection.
- Only finished commits receive commit cards. WIP stations always offer milestone creation/editing and a prompt-count line underneath using the shared commit-statistics styling, without a commit card. Draft milestone notes persist locally against stable capture-version identity and transfer to the eventual Git commit. Include them in Milestone x/x navigation only after that version is finished; preserve edits and intentional deletions through reloads and identity changes.
- Gallery / Playback view-switch labels use shared 10px inline padding. Composer Prompt / To-do pills use 5px vertical and 10px horizontal padding, superseding their previous 7px vertical padding.


## Completed frames and compact stream controls — 2026-10-17

- Gallery and Playback publish only completed prompt captures. Use the recorded completed-prompt counter as the publication boundary; a prompt-log entry or a new PNG alone must not expose the running prompt. Re-read the catalog when that boundary advances, retaining the latest completed prompt and existing push frames. Legacy catalogs without a completion counter remain readable.
- Message version cards use a shared 20px image/content gap and a subtle fill lighter than the user bubble, derived by mixing its surface with 10% white. Keep previews flush with the outer card edges.
- Header date selectors preserve the intrinsic width of their selected label, including padding and chevron; do not truncate the time range. Gallery / Playback switch labels use 6px inline padding.
- Milestone trophy circles retain branch fill and receive a 2px black border in both themes. Fold count circles use 26px diameter and 16px type; folded timeline segments use an 80px gap. Derive these from shared Idea stream tokens, preserving node order, expansion and Git ancestry.


## Filled gallery labels and date collision spacing — 2026-10-17

- Gallery hover captions and featured frame-axis labels use the same flat page-color background as the top-left version counter: 94% fill with shared 2px block / 4px inline padding. Remove text halos and blurred backing; retain existing typography, plane alignment and theme colors.
- Detect date-label overlap from measured text and projected bounding boxes at the current camera, zoom and viewport size. Move crowded dates in whole text-row increments, preferring upward placement and using downward rows near the top edge. Recompute from original anchors to avoid cumulative drift or camera feedback; restore baseline positions when space permits. Keep chronological ordering deterministic, wall/overhead rails independent during crossfade, and axis titles fixed. Do not modify frame positions, timestamps or version-axis spacing.

## Flat prompt previews and drawer hover — 2026-10-17

- Gallery prompt previews render in screen space, horizontally centered at 25% of the gallery viewport height, independent of frame perspective and camera zoom. Use the inspected frame's full prompt with summary fallback, normalize whitespace, and cap at 50 characters including `...` when truncated. Preserve the shared version-counter background and padding. Hide previews during Playback transitions and token view; leave axis labels and their collision spacing unchanged. This supersedes plane alignment for prompt previews only.
- Drawer heading text starts at 65% opacity and brightens to full opacity on hover or keyboard focus over the shared 180ms hover timing. Expanded, idle headings dim to 50% after the drawer opens. Clip hover fill to the header's shared 12px upper corners without clipping the composer's dropdowns. Respect reduced-motion preferences.

## Idea stream hover actions and return to Gallery — 2026-10-17

- Playback remains switchable while Idea stream is open. Switching to Gallery closes the Idea stream subpanel and returns through the existing Gallery transition; opening Idea stream still enters Playback.
- Only the latest chronological unpushed capture receives persistent Add milestone and prompt-count controls. Historical commits whose titles contain WIP do not qualify. Derive this distinction from capture metadata and chronology, never display labels.
- Hovering an unfolded station reveals its Add milestone action with a shared 180ms opacity entrance. Retain it within a circular radius of 5% of browser viewport width around the station's rendered center, independent of graph zoom, and while interacting with the action or editor. Keyboard focus also reveals the action. Respect reduced motion.
- Milestone cards omit the pencil glyph; clicking their text opens the existing editor. Their 17px text and 12px block / 14px inline padding scale together with the graph, without fixed-screen compensation or global control-height constraints.
- Fold labels share branch-label typography and zoom compensation. Keep both their text and the number centered vertically on the fold station; count glyphs use explicit unit line-height.

## Gallery pill navigation and simplified commit cards — 2026-10-17

- Clicking the Version blocks title pill in Playback returns to Gallery, including when Idea stream is open. Reuse the existing return transition and close Idea stream; animate the mode label toward Gallery as the return begins. Respect the shared reduced-motion behavior.
- Idea stream commit cards omit file-change counts, their separator, the overflow menu and Add branch. Retain the prompt-count navigation and a single Add to chat action using the shared filled secondary-button style formerly used by Add branch. Other graph modes retain their existing controls.
- Fold-count numerals share the version-label font size, weight and zoom compensation. Apply the compensation only to the numeral so the circle retains its shared diameter and centered text.

## Playback controls and chat milestones — 2026-10-17

- Add frame to chat and New annotation share 11px text and 13px icons. Speed and loop selectors live on the playback transport row, centered in the space between Next prompt and Jump to timeline end; keep the central transport centered. The upper toolbar is reserved for live-prototype viewport controls.
- Header date-range and saved-frame dropdowns use the same shared 171px preferred width and matching shrink constraints in both standalone and combined readers.
- Every chat version output has the shared Add milestone action immediately below it. Reuse Idea stream's editor, save to the version's stable capture identity, and synchronize open views and tabs. Existing notes are editable, cancellation preserves them, and storage failures stay visible. Unresolved versions wait for catalog identity before allowing edits; saving a draft milestone does not publish it before its commit.
- `c chat & playback` (or `c chat and playback`) captures the full home workspace with Chat and Playback side by side, rather than closing the reader.

## Milestone and to-do overlay — 2026-10-17

- Playback's annotation entry and creation heading read “New milestone / to-do”. Use a single-choice To-do / Milestone radio group; preserve existing plain notes when editing. Milestones share the stable capture-version storage used by Idea stream and chat, and remain outside finished-milestone navigation until committed. Editing or deleting a linked annotation updates its milestone only if another surface has not replaced that text.
- Center the entire annotation sheet vertically with equal surrounding padding and scrolling for short panels, replacing the earlier lifted placement. Omit the Theater back button; the bright semantic-ink close action and Escape dismiss the overlay while preserving Playback. Keep the panel-local focus, blur and reduced-motion behavior.
- Chat version-card milestone actions open a modal using the shared milestone editor. Include “Also commit to [current branch]”, deriving the branch from current Git history. This checkbox only displays a temporary Success toast; it never commits, calls a write endpoint or persists a commit setting. Saving the milestone still saves its local note.
- Composer attachment, model and mode controls use a shared 4px gap.

## Brand menu, landing and capture buckets — 2026-10-17

- The workspace logo opens a two-option dropdown: Switch to light/dark mode and Exit to landing screen. Its expanded fill and menu use the same shared surface token as user messages. The logo no longer opens navigation; preserve keyboard dismissal and focus restoration.
- Exit navigates to the separate `?page=landing` page, using the home workspace background and a centered MitWerk logo with Open project below. Open project navigates to the clean home URL, with Chat left and Version blocks right in Gallery, preserving saved conversations and drafts.
- `c landing` captures that page. Composer capture-screen and Version blocks footer selectors share homescreen and landing buckets. Landing capture filenames carry explicit screen metadata; historical frames default to homescreen. Filter after assigning version identities, preserving Git version numbering across buckets, and resolve frame links across buckets automatically.

## Milestone invitation and compact label spacing — 2026-10-17

- Gallery and Playback headings keep the same shared 10px gap between title pill and mode label, aligned at the start even when the heading fills extra space. Playback speed, loop and jump-to-end form a single flex row with equal 10px gaps.
- Date collision detection uses the projected text quadrilateral rather than its oversized axis-aligned rectangle. Process older dates first and shift newer colliding dates upward by their rendered font height per step, with no added inter-row gap. Keep titles fixed, rails independent and the existing viewport-edge fallback.
- After a visible chat version output without a milestone has remained visible for 3 seconds, its Add milestone button jumps upward to touch the card. At impact the card gains a flowing colorful gradient and reads “Ready to mark a new milestone?”. Its primary click opens the shared milestone dialog. Use shared timing/color tokens, preserve the original version navigation before the invitation and after saving, and never create a milestone automatically. Reduced motion shows the final static invitation without the jump or moving gradient; hidden panels do not start the countdown.
- `c chat and playback with milestone overlay` captures the full Chat/Playback workspace after the invitation with the chat milestone dialog open.

## Compact focus and milestone dialog — 2026-10-17

- Keyboard focus uses a shared 1px foreground-color outline inset 1px at the component edge, with no outward gap or layout shift. Apply the same tokens to buttons, button-like controls and custom radio labels throughout the project, preserving a visible focus indicator in both themes.
- Date labels retain natural foreshortening at oblique camera angles; cap their projection compensation at 1 so an angled view cannot enlarge their text. Keep chronological collision stacking based on the resulting rendered geometry.
- New chat milestones ask “What's your new milestone?”. Hide the redundant field label visually while keeping its accessible name. Place the optional commit checkbox and Cancel / Save milestone actions in one wrapping footer row. Branch references use a branch icon followed by a monospace name derived from Git history.
- `c milestone overlay` captures Chat and Gallery with the milestone dialog open. Explicit Chat/Playback milestone captures continue to use Playback.

## Landing intro: stacked-frame film — 2026-10-17

- The landing page opens with a stacked-frame sequence derived from `src/assets/logo-shape-part.svg` (one frame) and `src/assets/logo-shape.svg` (two frames stacked at a fixed depth offset). Derive frame shape and offset from those assets with `logoGeometry`; never hardcode logo coordinates. The landing symbol renders the `logo-shape.svg` path inline so the film lands exactly on it.
- Sequence (tokens in `LANDING_INTRO`, `landing-intro.ts`): bands drop in bottom-first, one beat apart; a traveling bulge thickens and tilts bands after the attached rhythm reference (prompt #303), with spacing opening around the bulge so neighbors never overlap; bands open into isometric frames at album scale; the album collapses onto the two logo frames at the landing symbol's box; the wordmark and Open project reveal; then the stack releases back into the looping bands under the dark scrim. All stages are one band description, so states morph continuously.
- Film treatment: sub-frame shutter samples average into motion blur, a WebGL pass keeps a decaying long-exposure trail, then grades with animated grain and a vignette. Stage colors come from `--landing-stage-background` / `--landing-stage-ink` (workspace background and ink); the scrim and on-scrim brand/action colors are landing tokens and stay dark in both themes.
- Pointer or key input skips to the reveal. Reduced motion renders a static loop frame with the brand already revealed; without WebGL the brand shows immediately. `data-intro` on `.landing-page` reports `playing` → `revealed` → `settled`; `c landing` waits for `settled`.

## Panel-local milestone creation — 2026-10-17

- Chat milestone actions open Version blocks if hidden, select that card's actual frame in Playback and open the existing annotation overlay inside the panel. This replaces the standalone milestone modal. Keep Chat usable beside it; closing or cancelling returns to Playback without saving.
- This entry uses “What's your new milestone?” and the current-branch commit checkbox instead of annotation-kind radios. Preserve the shared preview, local milestone persistence, Cancel / Save order, monospace branch reference and prototype-only commit Success toast. Ordinary annotation entry retains its To-do / Milestone chooser.
- Milestone invitation gradients include a shared static SVG grain layer. In the ready state, replace the button below with a “Not yet” chip. Dismissing restores normal card navigation and suppresses re-invitation for that mounted card; Add milestone remains available manually. Respect reduced motion for the gradient and bump.
- Milestone-overlay captures now show the full Chat/Playback workspace with the panel-local milestone annotation form.

## Version-linked to-dos in Idea stream — 2026-10-17

- Display only the current conversation’s drawer to-dos beside their designated Idea stream versions, matching stable capture version numbers rather than labels, chronology guesses or Git SHAs. Keep versions with to-dos visible when folding history. Unassigned to-dos remain unplaced until their version is known.
- A version with to-dos uses a checkbox station instead of its ordinary circle or trophy. Check the station only when all its to-dos are complete; show each item's own checkbox and strike through completed text using the drawer's muted treatment. Preserve milestone text and navigation when both kinds of content belong to the same version.
- To-do lists use the shared graph typography and scale with zoom. Reserve their bounded list height in timeline layout so cards cannot overlap later stations. Use the drawer’s exact React state array and shared ordering, so additions, completion changes, removals and conversation switches update both surfaces in the same render. Do not aggregate other conversations or independently seeded annotation tasks. Standalone history reads the default conversation’s saved drawer and observes storage updates.

## Landing intro version 2: one frame multiplies — 2026-10-17

- Version 2 (`landing-multiply.ts`, tokens `MULTIPLY_INTRO`) is reachable at `?page=landing&intro=multiply`; version 1 (vertical bands) at `?page=landing&intro=stack`. Both implement the shared `LandingIntro` contract and render through the same film stage.
- Version 2 ignores the prompt #303 rhythm image and never arranges frames vertically. It opens with a single frame sliding in along the depth axis, then doubles by repeated binary splits (1 → 2 → 4 → 8 → 16) along the logo's isometric depth offset, with the camera zooming out to fit. A lift ripple travels through the stack, then all frames fold onto the two logo frames at the landing symbol. The background loop repeats multiply → ripple → merge back to one frame, with a slow periodic drift, under the dark scrim.
- No landing frame has a hard border or stroke, in either version. Overlapping frames separate only through depth tone (back frames dimmer) and a soft left-to-right shade inside each frame; both resolve to flat full tone as frames become the logo.

## Landing intro version 3: thrown frames with physical timing — 2026-10-17

- Version 3 (`landing-impact.ts`, tokens `IMPACT_INTRO`) is the default landing intro. It never multiplies frames and never fills them with gradients: a fixed set of seven frames, each a single flat tone (depth fog only), separated without strokes.
- Timing simulates physics rather than easing curves. Each frame is thrown from the camera as a perspective dive under constant acceleration (it starts `1 / cameraDepth` times larger than its slot), then lands with a damped-oscillation bounce. Frames arrive one by one from different sides onto an isometric pile.
- The drastic scale shift comes when the whole pile recedes under constant acceleration from album scale to the landing symbol's size. It bounces in scale on impact while the frames gather onto the two logo slots as an underdamped spring. The brand reveals at impact.
- Release flings the logo's frames back past the camera, front first. The background loop under the scrim repeats throw → hold → fling, with an empty beat that makes the period seamless. Physics helpers (`springStep`, `impactBounce`, `throwDepth`) are closed-form functions of time, so shutter samples stay deterministic.

## Landing intro: white shapes, eased motion, trials — 2026-10-17

- Supersedes the film treatment and tone rules above. The landing stage uses no shaders: a plain Canvas2D renderer (`landing-stage.ts`) fills every visible frame in complete white (`--landing-frame`) as one path on a dark stage (`--landing-stage-background`, dark in both themes so white reads). The only effect is one white glow (`--landing-frame-glow`, `LANDING_INTRO.glowBlur`). Never use gradients, tone or depth fog, shadows, grain, motion blur, trails or CSS blur on the landing; this includes the wordmark reveal and the Open project button.
- Motion uses eases only (cubic in / out / in-out, and geometric scale interpolation for big zooms). No springs, bounces or overshooting curves. Version 3 keeps its drastic scale shifts (throws ease down from 16× magnification; the pile eases down to the symbol size) without the bounce.
- Because frames are uniformly white, frames meant to read separately sit far enough apart along the depth axis that they never touch (`depthStep` 2.9 logo offsets). Frames intentionally overlap only when they merge, as in the logo.
- Trials at `?page=landing&intro=flatten` (separated frames slide in, flatten into one frame, which settles onto the logo) and `?page=landing&intro=unfold` (the reverse: one frame eases in from a drastic scale and unfolds into many before settling onto the logo). Their loops alternate spread ↔ single frame. Version 3 (`impact`) stays the default; `stack` and `multiply` remain available and render under the same white rules.


## Editable capture buckets and overlay dismissal — 2026-10-17

- The capture-screen chip retains its pen icon. Editing opens a text combobox with the shared bucket dropdown; nonempty new names prepend a `Create bucket "name"` option. Enter creates/selects the typed name, blank input offers existing buckets only, and Escape cancels. Trim names and reuse case-insensitive matches.
- UI-created buckets share one in-memory registry between composer and Version blocks footer. They and their selection disappear on full reload; creating/selecting a bucket never writes or relocates frames. Progress captures remain controlled by the user's capture prompt.
- Milestone/to-do overlays fade and move out using the shared annotation exit duration on close, Cancel, Escape, save-and-close and navigation to the task board. Keep the dialog mounted and underlying panel inert until dismissal finishes, restore focus afterward, and dismiss immediately for reduced motion.


## Editable to-dos and consistent compact actions — 2026-10-17

- Idea stream to-do checkboxes invoke the same completion action as the current conversation drawer. Drawer text opens an inline editor; blur or Enter commits, Escape cancels, and committing blank text removes the item. A separate plus action at the right adds the item to the prompt using the existing reuse behavior. Preserve version identity and completion while editing.
- Inline milestone editors have no visible heading (retain the accessible field label). Existing milestones show a red trash icon at the left of the action row, with Cancel and Save at the right.
- Enter prototype shares Add frame to chat's text-action style, with a filled triangular play icon.
- Capture bucket menus share the pill's font-size and inline-padding tokens. Their minimum width equals the pill, growing naturally for longer names. Hover and highlighted states never change font weight anywhere in the application; selected dropdown rows also keep their normal weight.


## Idea stream footer and playback defaults — 2026-10-17

- Idea stream keeps its isometric grid visible without a Show/Hide grid control. Its footer buttons have a shared 44px minimum width, including navigation and zoom actions; longer labels may grow and the footer can wrap on narrow panels. The Test diagram retains its grid control.
- Playback starts in the non-repeating mode, labeled “No loop” everywhere it is offered. At the final frame it stops; Loop and Ping-pong remain explicit alternatives.


## Branch-colored milestone cards — 2026-10-17

- Every Idea stream milestone card uses a thin 1px border in its graph-derived branch route color, matching its station and branch label. Keep that color while editing inline. Reuse `--route-color`, including the theme-aware main-branch contrast color; do not assign colors by milestone text, version number or selection.


## Workspace chrome restoration and to-do metadata — 2026-10-17

- Load workspace layout styles once, after base and control styles. Home's dark-theme backdrop behind panels stays black through `--workspace-background`; panels retain their paper surface. Chat and Version blocks share the existing 44px border-box heading height, including the combined reader header. Narrow readers can still wrap their controls.
- Add milestone and its replacement Not yet chip share action height, minimum width, typography, padding and 10px card separation; changing invitation state must not shift the content below. Keep the chip's rounded shape.
- Each Idea stream to-do displays its persisted creation timestamp beneath its text, aligned with the text after the checkbox. Share the drawer's relative local-time formatting, saved version suffix, muted opacity and live refresh. Completed text stays struck through; timestamps remain readable. Keep the existing bounded list scrolling and graph-derived space reservation.


## Brand menu spacing, growing to-do cards and zoom controls — 2026-10-17

- Brand dropdown rows use the logo button's shared 10px inline padding, with a 4px anchor gap. Keep menu placement viewport-aware.
- Idea stream to-do cards grow to fit all their items, including four or more, with no fixed max height or internal scrolling. Measure rendered list height independent of graph zoom and include it in timeline spacing and fit bounds so later versions remain clear. This supersedes the bounded list rule.
- All zoom percentage buttons use the reusable ZoomScaleButton with a shared 64px minimum width; preserve reset and fit behavior and keep surrounding icon controls at their own size.


## Compact brand and unfilled milestone dismissal — 2026-10-17

- The workspace logo symbol and wordmark share a 4px gap. Preserve the menu anchor gap and inline padding.
- Idea stream footer controls and their groups have no decorative borders or separators, with a 52px minimum width for icon buttons. Zoom percentage buttons retain their wider 64px minimum. Keep keyboard focus outlines.
- Gallery hover prompt previews sit at 20% of the viewport height (previously 25%), retaining their horizontal centering and screen-space rendering.
- Not yet uses a transparent background, including on hover, and shares Add milestone's 1px line-color border and 4px corner radius. Preserve their matching dimensions and card spacing.


## Two-color milestone invitation motion — 2026-10-17

- Milestone invitation cards use exactly two gradient hues: purple `#7654b5` and teal `#226a81`, held in shared color tokens. Replace the multi-hue sliding gradient with a slowly drifting, breathing radial field inspired by [21st.dev Animated Gradient Background](https://21st.dev/@hammamikhairi/components/animated-gradient-background). Implement locally with a transformed CSS pseudo-element and a shared 10s alternate cycle; no animation library is required.
- Retain static grain, desaturated so it adds texture without extra hues, and existing text contrast, invitation timing and click behavior. Reduced motion keeps the two-color gradient still.


## Branch-palette invitations and time-range width — 2026-10-17

- Milestone invitation gradients now derive every color stop directly from the shared version-stream route palette, superseding the two-color restriction. Keep the slow breathing motion, neutral grain and reduced-motion behavior. Mix palette colors at a shared 64% strength over black to preserve white-label contrast. Do not duplicate branch hex values in invitation styling.
- Time-range selectors use a shared 200px minimum width in both Gallery footer and Playback header, including combined reader layouts. Their dropdown menu remains at least as wide as the trigger; other selectors retain their existing widths.

## Complete deployed frame catalog — 2026-10-17

- Vercel releases include every completed saved frame and its original image bytes, preserving capture IDs, screen buckets and archived-prototype snapshots. Determine image dimensions and format from bytes, including historical JPEG images saved with PNG filenames. Never use frame-number exceptions. Reject empty production catalogs and verify all frame/reference assets before deployment and against the live release. Git-ignored captures require local prebuilt deployment until a shared storage source is adopted.

## Three-layer tokens and system showcase — 2026-10-17

- Design tokens live in `src/design-system/tokens.css` in three layers: primitives `--p-*` (raw gray/blue/status/bucket-hue ramps, space, radius, type sizes, motion), semantic `--s-*` (roles such as `--s-bg-surface`, `--s-text-tertiary`, `--s-accent`, set per theme) and component `--c-*` (to-do, bucket, composer tabs). Components read only `--s-*` or `--c-*`; never reference `--p-*` from a component. Themes swap only the semantic layer. Dark is the default and primary theme; light is an option.
- Accent is Werk Blue, lifted to `--p-blue-400` in dark mode for contrast and `--p-blue-600` in light mode. Blue means milestone or focus only. Bucket hues (`--p-hue-*`) tag buckets with a dot; they never fill surfaces.
- Data uses the mono face (`--s-font-data`) with tabular numbers: hashes, versions, counts, indexes, times and uppercase labels (`--s-text-label`, `--s-label-tracking`).
- To-dos are rows, not cards: square 14px check, mono index, text, then bucket chip and owner on the right. Done rows fade to tertiary ink with a strikethrough.
- Capture buckets are pills with a hue dot derived from a hash of the bucket name, so a user-created bucket keeps a stable color. Active buckets invert to a solid fill. Buckets read inline in sentences (“Capturing [bucket] with [detail]”).
- `?view=system` renders the design-system showcase (`src/design-system/SystemPage.tsx`) with tokens, type and every component state in the current theme. The milestone card is removed from the showcase pending a new design. Existing app surfaces still use the older root tokens in `src/index.css`; migrate them to `--s-*` incrementally rather than adding parallel dark colors.

## Boxless inline entry, view tags and composer elevation — 2026-10-17

- Idea stream text entry is boxless (`src/components/InlineTextField.tsx`): no field border, fill or focus outline, only a hairline underline (`--inline-field-line`, stronger on hover and focus) and a faint placeholder (`--inline-field-placeholder`). Click and type; Enter or blur commits, Shift+Enter adds a line, Escape cancels. There are no Save or Cancel buttons.
- Milestones: an empty card shows the “Add a milestone” field in place of the old Add milestone button (same visibility: current WIP, hover or focus). Clicking an existing milestone reopens the same field; committing blank text removes the milestone. To-do text in idea stream cards edits the same way and writes through the shared drawer state; blank text deletes the to-do.
- Workspace view links: on = a quiet translucent parallelogram tag (`--view-tag-bg`: 14% white in dark, 8% black in light) behind the icon (`--view-tag-ink`). Top and bottom edges stay horizontal; the sides lean by `--view-tag-slant` (4px), echoing the logo. Off = plain muted label. View links are never underlined.
- With no panel open, the view links move out of the top bar and sit under the “Choose a panel to open.” instruction.
- Dark composer uses elevation, not a mid-gray wash: panel < drawer (`--composer-drawer-surface`) < composer (`--composer-surface`), with `--composer-border` and a placeholder of at least 4.5:1 contrast.

## Capture bucket dropdown as one shape — 2026-10-17

- Editing a capture bucket keeps the pill's exact measured width and height; the field never grows while typing. The field and its option menu form one continuous shape: rounded top corners on the field, rounded bottom corners on the menu, no gap, same width and same left text inset.
- No stroke, outline or shadow on the field or menu. Both use `--capture-edit-surface` (15% ink over the panel); the highlighted option uses `--capture-edit-highlight`. The field shows the current bucket as a muted placeholder to signal it is typable.

## Panel titles, icon-only view bar and panel spacing — 2026-10-17

- Every panel title uses one format: 15px icon at `--panel-title-inset` (20px) from the panel edge, `--panel-title-gap` (8px), then a 13px/500 title. A titled pill (Version blocks) carries its own icon inside and sits `--panel-pill-inset` (6px) from the panel's top and left edges, and stays a full capsule (`--panel-pill-radius` = half its height, 16px). The panel radius grows to wrap it concentrically: `--workspace-radius` = pill radius + inset (22px). Its icon still lands on the 20px inset.
- Top-bar view links are icon-only with a tooltip and an accessible name; open panels already name themselves. The no-panel empty state keeps the text labels.
- Panels sit closer to each other (`--workspace-gutter`, 4px) than to the screen edge (`--workspace-edge`, 10px). The top bar uses the same edge inset.
- Dark panel surface (`--paper`, `--canvas-bg`) is #161615: slightly deeper than Workshop Text and a hair warm, still reading as neutral gray. Dark composer surfaces follow the same warm-neutral family.

## To-do drawer hover — 2026-10-17

- The To-do drawer is one frame: hovering or focusing its heading changes the whole drawer surface to `--composer-drawer-hover`, including the band behind the composer. The heading itself never paints a separate hover fill.

## Motion system — 2026-10-17

- All motion reads `src/motion.css` tokens: `--motion-instant` (90ms, press), `--motion-fast` (150ms, color/fill/border/shadow feedback for hover and unhover), `--motion-base` (220ms, menus, field reveals, cross-fades), `--motion-layout` (420ms, panel size and position); easings `--ease-standard`, `--ease-enter`, `--ease-exit`. Do not hardcode durations or curves in components.
- Buttons, links, options and tabs share one zero-specificity transition (color, background, border, shadow, opacity, scale). Pressing an enabled button scales it to `--press-scale` (.97) via the `scale` property, so it composes with existing transforms.
- Menus (`.select-menu`) fade in and drop from `--menu-enter-shift`; the capture bucket menu unrolls downward from its pill with a clip reveal.
- The message composer grows from `--composer-rest-height` to `--composer-focus-height` and gains `--composer-focus-ring` on focus. Inline fields fade their underline.
- Panel open, close, expand and pane switches run through `animateLayout` (`src/shared/motion.ts`, View Transitions). Only the panel frame stretches or squeezes: no cross-fade, no opacity ghost and no scaling of content. Old snapshots are hidden, new snapshots draw at true size from the top-left and are clipped by the moving frame (`panel-*` groups carry the panel radius and surface). Pseudo-element selectors cannot be wrapped in `:is()`; list each `panel-*` name. Without support, with reduced motion or while the page is hidden, the layout updates instantly.
- `prefers-reduced-motion: reduce` zeroes every duration and disables press scaling.

## Capture chips and narrow panels — 2026-10-17

- Only the bucket in “Capturing [bucket] with [detail]” is a chip, because only it is a category. The detail is free text: a frameless field sized to its text (`.capture-detail-field`) with a translucent “details” placeholder and a hairline underline only on hover and focus; Enter or blur commits, Escape reverts. The bucket chip uses: light pill (`--capture-chip-surface`), dark text, no stroke, fixed `--capture-chip-height` (22px) in rest and edit states. Editing keeps the exact pill size on a slightly dimmer light surface (`--capture-edit-surface`) with a gray placeholder. Its menu continues the same light shape beneath the pill. Chip icons recede to `--capture-chip-icon-opacity` (.4).
- Narrow panels never clip their controls: the gallery footer wraps into two rows below 620px of panel width, and a reader narrower than two columns stacks Playback above Idea stream instead of scrolling sideways.
- Top-bar view icons follow the panels' left-to-right order: Chat, Version blocks, Idea stream, Live server.

## Idea stream strokes and stations — 2026-10-17

- Supersedes the rule that a connector is one grid-triangle wide: connectors use `treeTheme.routeWidth` (12px), slimmer than a station (28px), so stations read as beads on the line.
- Stations stay circular in every state; the shared `.mw-app button` radius must not square them.
- No stroke is solid white. In dark mode the main-branch color `--contrast` is a soft light gray (#c7c6c3), and emphasized borders (focused composer, checkboxes, hovered references, push frames) use `--stroke-strong` (42% ink). Light mode keeps ink.
- The Live server panel has the shared expand toggle; expanding it hides the other panels, and choosing any other view exits it.

## Drawer entry, gestures and polish — 2026-10-17

- Idea cards have no border, so their stations center on the route from `--station-center-x/y`; never reuse the bordered version-card `- 1` offset.
- Own chat messages use a quiet dark fill (`--user-message-fill` #252423 in dark). The brand menu trigger is `--brand-trigger-height` tall inside the top bar, so its highlight never touches the screen edge.
- Footer controls fill their whole row, so hover fills reach the panel's bottom and side edges.
- The To-do drawer heading is both a click toggle and a drag handle: drag up past 24px to open, down to close; while dragging the drawer follows the pointer lightly. A press without movement stays a click.
- To-dos can be typed straight into the drawer (“Add a to-do”), no mode switch needed; the Prompt / To-do switch still works. Each to-do can carry a page tag (`ComposerTodo.page`), picked from the capture buckets or created inline through a compact page chip; an empty page chip is a quiet outlined ghost. The add row keeps the chosen page for the next entry.
- `?demo=milestone` appends one sample Mit reply with a version output (never persisted) to preview the milestone invitation without captures or a live server.
- The To-do drawer count is a plain number with tabular figures, never ringed.
- The message box keeps one equal inset (`--composer-inset` = panel radius − drawer radius, 10px) from the panel's sides and bottom, so its corners are concentric with the panel.
- The to-do section above the composer is labeled “To-do” (accessible name “To-dos”); the word “drawer” is not shown.
- Choosing “Not yet” on a milestone invitation folds the version card to `--milestone-dismiss-scale` (50%) of its height over `--motion-layout`; the preview keeps its aspect ratio, so it shrinks and slides left with the card.
