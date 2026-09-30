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
- Allocate equal timeline width to each version in the filtered sequence. At most `timeline.visibleBlocks` (20) version blocks are visible at once; further blocks extend the track and scroll horizontally. The track fits its height, hides the scrollbar, and does not draw a focus outline when clicked. Subdivide each version by its saved captures (the prototype's commit/frame records); do not fabricate Git commits. Separate outlined version blocks identify versions without visible version numbers inside the timeline; version metadata remains available through hover titles and slider accessibility text, and one smaller mark identifies each saved frame. Scrubbing resolves against those same positions; keyboard arrows still move one frame at a time.
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
- Show the version as a bordered tag on its row with the date. The version number is bold. The shared `BranchTag` and the green/red line counts sit in that same left-aligned group, immediately after the version tag. Move the prompt or push number to the start of the next line, such as `Prompt #63: "In reset view..."`. Keep that line in roman type. Theater and the gallery share one tracked-interface menu, with the file icon inside the control in muted ink. The theater toolbar shows the viewport as a reduced aspect ratio such as `480:271`. Previous and next push use the same play-triangle size, and the playback buttons are larger than the other icon buttons. Hovering a playback button or the timeline shows a black rectangle with slightly rounded corners and no arrow, and only while the pointer is on that control. The double triangles read Jump to last push and Jump to next push. The timeline label names the version under the pointer. Playback speed is a dropdown using `theater` speeds. The default 1× plays at the previous 2× rate, and the other steps are faster by that same factor. A push lead, such as `Push #10:`, is bold. A prompt lead stays regular weight. A frame that belongs to a push uses a 2px black outline. The frame-action row sits `theater.actionGap` (12px) above the frame. Play, pause, and those skip marks use a solid fill. Clicking a version title expands the full title, and the card grows to fit. Clicking that caption does not dismiss theater; empty space on the row still does. The tag border uses the branch color; the name and icon stay black ink. The prompt sits `theater.metadataRowGap` plus `theater.summaryGapScale`’s extra 2px below that group. Omit the tag when branch metadata is absent. Render additions in `theater.addedColor` and removals in `theater.removedColor`. Enabled play/pause controls use the shared black ink color. The playback block sits `theater.playbackFooterGap` (4px) above the footer.


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
- Push-frame metadata no longer repeats Enter prototype. That action is the bold control beside Add frame to chat. Clicking it opens the archived prototype in the full-screen overlay. Exit prototype uses the same text-and-icon control as Full screen, sits on that action row, and is the only control aligned to the left. It is not part of the full-screen overlay. While the prototype builds, a loading overlay covers the frame. Resolve the codebase by push number in `[ver capture] codebase/`, build on demand, and display an interactive iframe in the existing theater frame. Exit prototype restores the screenshot. Stop playback while entering; changing frames closes the prototype. Missing archives and build failures must be explicit.
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

- Navigation is either fully expanded, including names and project task lists, or completely hidden. A top-bar button restores hidden navigation. Narrow screens use a full sidebar drawer with a dismissible backdrop; selecting a destination closes it. Do not force an icon-only rail.
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

- Keep the gallery and stream inside the merged reading window. Floating gallery actions share a 144px width and 16px/6px inline/block padding; the token button label and Token usage heading use 60% opacity.
- Saved-frame selection reserves 30% of the footer and uses “See frame” as its placeholder. Version statistics are a separate muted element to the right of the time-range selector, separated by spacing rather than a dot. Both remain inside the remaining flexible row space.
- Ordinary active gallery block outlines use 0.75px strokes at 30% opacity in gallery and token views; preserve the existing hover emphasis and inactive dimming.
- The stream endpoint field expands to consume remaining footer space between its navigation arrows.


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
- `c to-dos` (or `c todos`) captures the full prototype shell on the Todos board with its reading window closed.

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

- New chat and every conversation row in the sidebar share one button: ink text, the same padding, height, radius and gap. Their type size is the sidebar section size. Conversation icons match the project folder, smaller than the New chat icon.
- The project block (Projects, the project name, and its conversation titles) uses one size, halfway between the former 12px project title and the former 11px conversation title (`--sidebar-section-size`).
- The workspace bar’s inline padding is the same row padding as the reading-panel title.
- The sidebar surface is a lighter gray than the panel fill (`--sidebar`). The MitWerk wordmark is bold. The sidebar user mark uses a light line-colored disc.


## Theater return and sidebar navigation — 2026-09-29

- Place the Gallery return action as a bordered, clickable chip inside the theater’s content toolbar, below the Iteration Visualizer header. Reuse shared surface, control-size and padding tokens. Its padded toolbar area remains excluded from drag-to-exit, and clicking preserves the existing reverse transition.
- The Projects heading is one row: clicking the label or its upward-right arrow opens the project directory. The arrow has no extra control padding. Each project row leads with a Phosphor folder icon and still expands and collapses its conversations. Conversation icons match that folder size. Conversation lists have no left border or row gap. Their left margin is the project name’s offset minus each conversation button’s left padding, so the conversation icon starts where the name starts.
- The sidebar’s top padding is the shared row padding. The user row has no top border. The user mark is a light disc and shows the name only.
- A conversation’s message column has a maximum width of 80 characters, a larger top margin, and a shorter message line height (`--message-line-height`). `w/ page scrolled to top` captures that conversation at the start of its messages.
- New chat, Mits, Todos and Library are one navigation group and share the New chat button: ink text, the section type size, and no filled resting background. The current page still uses the active treatment.
