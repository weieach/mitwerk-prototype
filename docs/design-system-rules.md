# Design system rules

This file is reserved for project-wide design-system rules requested by the user. Update it whenever a request changes a shared rule. Implement values as shared tokens and behavior as reusable graph-derived logic, never as exceptions for particular node IDs, version labels, or screenshots.

## Scope

- The left panel contains the Iteration Gallery (requested 2026-09-22), replacing the earlier blank-panel rule. The right panel remains the Version stream.
- Use local components and CSS; do not add an external design system.
- Preserve existing design outside the requested changes and bug fixes.

## Version stream panel modes — 2026-09-22

- Place a Test visual / Commit history switch in the Version stream header, using the existing control styling.
- Initially seed both modes from independent copies of the currently saved tree. Do not replace either with a generated linear tree in this step. Commit history is the reserved capture-folder history view; importing actual captured history is a subsequent data connection, not fabricated branch ancestry.
- Test visual is an editable sandbox. Adding commits, branching, deleting, reverting and restoring affect only its graph. Commit history permits selection, branch navigation, collapse and zoom, but no graph edits.
- Enforce edit permissions in shared state logic as well as controls. Persist both graphs and mode independently from the legacy saved tree. Sandbox changes must never write to the canonical graph file, capture folders, gallery data or Git.
- Seed once, then preserve each mode across switching and reloads. Test visual is the initial mode. Shared graph geometry and Version stream styling remain identical in both modes.

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
- Header actions next to the panel title show a short label beside the icon. The grid control is not a selected or pressed toggle; only its label changes. It reads Hide grid when the grid is visible and Show grid when it is hidden. The fit control reads Fit all.
- On load, paint the stream at the default overview scale first. After that frame, zoom to the current branch’s last commit at 100%, using the same framing as the endpoint jumper. Progress screenshots keep the default full-diagram capture and skip this intro zoom.

## Revert and restore — 2026-09-17

- Every branch endpoint — the last commit on each `branchId`, including tips that still have branch children — keeps Add commit. Derive that from `isBranchEndpoint` / `branchTip`. Only non-endpoint stations show Revert change.
- Revert keeps later versions in the graph. Derive the reverted set from descendants of the reverted-to station (`futureNodeIds`) and persist it with the graph (`revertedIds`).
- A reverted node’s title uses the shared `revertedTitleColor` token and strikethrough. The rest of the card stays at full strength. Do not fade the whole card. The station and incoming connectors use the shared `revertedRouteColor` token; connectors also use `revertedRouteOpacity`. Version numbers stay black.
- That node’s card action is Restore change, with the restore icon. Restore is the primary card button. Restore brings that node back, plus any reverted ancestors so the path to it is live. Later descendants stay reverted until restored.

## Compact cards on other branches — 2026-09-17

- Nodes that are not on the current (checked-out) branch use an abbreviated info card: save label, title, and file chips only. Hide the overflow menu and everything below the chips (change stats, details, line counts, add branch/commit).
- Selecting that node — by its station, card, or any other select action — shows the full card. Deselecting or leaving the current branch returns it to the abbreviated form. Current-branch cards stay full.
- Derive compact vs full from the checked-out path and selection (`isCompactVersionCard`). Use `compactCardHeight` when framing abbreviated cards. Do not special-case node IDs.

## Implementation locations

- `src/features/iteration-gallery/`: shared gallery tokens, filename-derived version model, isometric geometry, album and theater components. `server/gallery-catalog.ts` discovers screenshots and publishes the same catalog for development and builds.

- `src/features/version-tree/tokens.ts`: station diameters, connector width (`gridTriangleSide`), ring and stripe styling, fills, opacity, triangle dimensions/gap, count-hint caret size/gap/fade, version-label size/weight/color/zoom compensation/`stationLabelOffset`, `activeBranchColor`, per-level unique branch colors, reverted title color (`revertedTitleColor`), reverted stations and incoming connectors (`revertedRouteColor`, `revertedRouteOpacity`), and the default full-diagram capture zoom (`screenshotZoom`).
- `src/features/version-tree/layout.ts`: lattice geometry, card offsets, row spacing, inactive-route clearance, canvas left inset (`originX`, `padding`, `stationLabelReserve`), compact vs full card heights, origin stations for root-level forks, fork divergence tokens (`forkSharedStemRows`, `originStemRows`, `forkDivergeStartRows`, `forkDivergeRows`, `forkDepartureUnits`, `forkLandingUnits`, `forkTerminalRows`) with `forkApproach`, version-label formatting, and `screenshotNodeTargets` / `frameScreenshotTargets`.
- `src/features/version-tree/presentation.ts`: selected branch, full selected path, terminal detection, sibling connectors, branch endpoint, the ordered endpoint list for traversal, and the checked-out spine.
- `src/features/version-tree/model.ts`: `activeBranchId`, `longestBranchId`, current-node and future-node deletion, revert/restore (`revertedIds`, `versionCommitAction`, `versionCommitActionLabel`, `isPrimaryCommitAction`, `isBranchEndpoint`, `restoreNodeIds`, `isRevertedRoute`), the path from root to that branch's last commit, compact-card state (`isCompactVersionCard`), picture-file detection (`isPictureFile`), the reusable filled-version template, and screenshot interact flags derived from the prompt.
- `VersionTreePanel.tsx` and `VersionCard.tsx`: render these shared decisions; do not independently infer branch or terminal state.

## Iteration Gallery — 2026-09-22

- Rename the former Preview Panel to Iteration Gallery. Reuse the Version stream's typography, colors and simple controls; add no external design system.
- Read all recognized PNG captures from `[frame capture] screenshots/`. Derive timestamp, capture type/number, summary and optional line counts from filenames, and dimensions from image headers. Never maintain a screenshot-specific fixture list.
- A push closes a version containing the prompt frames since the previous push. Frames after the latest push form the next, unfinished version. This is the prototype grouping rule; capture version numbers are not mappings to the independently editable Version stream graph.
- Give every version an equal depth slot. Space its frames within the padded slot. Keep image aspect ratios, with each enclosing block sized to contain its frames; heterogeneous sizes use the largest required envelope. The depth axis is chronological, the version ruler is evenly spaced, and date marks align to the first saved frame of each day, so their intervals vary.
- Render translucent wireframe blocks with padding on every side. Keep out-of-range chunks in place but disabled. Default to Last 7 days; support Today, Last 3 days, Last 30 days and All time. Interpret date ranges as local calendar days through the current instant.
- Render only the first and last in-range image at stronger opacity at rest. Keep intermediate slice outlines available for browsing. Hover or keyboard focus lifts and highlights a frame and displays its version, date and summary; click or Enter/Space opens that frame in theater view.
- Date changes transition disabled opacity, without changing version identity. Respect reduced-motion preferences. Use shared tokens for depth, spacing, padding, lift, opacity, zoom, labels, transition and playback timing.
- Theater provides previous/next, play/pause, playback speed, once/loop/ping-pong modes and a scrubber, restricted to the chosen date range and source. Stop playback when its sequence changes. Return to the gallery without losing filters.
- Viewport presets and custom dimensions preserve the requested viewport aspect ratio and contain saved images without cropping. These are static captures: resizing cannot reflow historical pages.
- Show only real metadata. Commit navigation, chat attachment and token usage remain unavailable until those sources are connected. Do not infer commit IDs, related files or token costs from screenshots.

## Iteration Gallery 3D interaction — 2026-09-22

- Render the album with Three.js/WebGL and an orthographic camera, using the existing filename-derived frame dimensions, padded block geometry and version/time spacing.
- Drag the viewport to orbit the album in 3D. Right-drag pans; scroll and the header zoom controls share the same zoom state. Provide Reset view to restore the initial isometric angle.
- Distinguish a drag from a click using a shared movement threshold, so rotating does not open theater view. Raycast the block slices to inspect and open frames at any viewing angle.
- Keep filters, disabled chunks, first/last images, hover lift and theater playback. Respect reduced motion. Centralize camera, control, opacity and texture-budget settings in gallery tokens.
- Support keyboard rotation and a labeled frame selector. If WebGL is unavailable, keep frame selection and theater playback usable with an explanatory message.
- Dispose scene resources on unmount; load textures only for displayed frames and keep the cache bounded. Preserve Version stream behavior and styling.
