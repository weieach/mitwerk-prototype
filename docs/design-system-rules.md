# Design system rules

This file is reserved for project-wide design-system rules requested by the user. Update it whenever a request changes a shared rule. Implement values as shared tokens and behavior as reusable graph-derived logic, never as exceptions for particular node IDs, version labels, or screenshots.

## Scope

- Keep the left panel completely blank until requested otherwise.
- Use local components and CSS; do not add an external design system.
- Preserve existing design outside the requested changes and bug fixes.

## Active branch — 2026-09-17

- The graph has one currently active branch, independent of version selection, like `git branch`. Persist it with the graph. Switching it from the canvas control checks out that branch: it becomes the active branch and its last commit is selected.
- The default active branch — and the branch named `main` — is the longest root-to-tip path. Ties keep an existing `main`, then first-seen order. Other branches number in creation order.
- Derive the active path from the root through that branch's last commit. Place every station on that path on one shared vertical column.
- Draw the active path as one straight vertical line in the shared `activeBranchColor` token, including through a branching group. This is the only exception to the rule that fork alternatives leave on an isometric slope. Other alternatives at that fork still peel off with the shared fork-divergence geometry.
- Stations on the active path use that same connector color. Off-path alternatives keep their own branch color. No two branches on the same level share a color; assign from the shared palette and skip a swatch already used on that row.
- Each info card has a vertical overflow control at the top right. It opens a floating panel to switch to that card's branch, revert to version, delete the current node, or delete future nodes. Revert to version is present but not functional yet. Delete current removes only that selected station and reparents any later versions to its parent. Delete future removes every version after it and keeps the station. On an endpoint with no later versions, show only Delete current endpoint. Do not empty the graph.
- Place each version number to the left of its station, vertically centered. Do not sit a label on the stem or under a starting station; that hid V1. Do not repeat the number on the card.
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

- Start with one filled-in example using the reusable `filledVersionTemplate` in `model.ts`, titled "Implemented landing page layout", including two planning-reference file entries, prompts, summary, and sample code-change counts.
- Adding a branch or commit fills the source node with that template if its content is empty. Newly added nodes remain empty until extended themselves.
- Preserve existing populated content, version identity, and graph relationships. Clone template arrays for each node; never use node-specific content exceptions.
- Reference entries and change counts are prototype metadata, not uploaded files or actual repository diffs. Station fill continues to depend on descendants, independently of whether metadata is populated.

## Version levels and collapse — 2026-09-17

- Display labels derive from commit depth and left-to-right position. A single version on a level is `Vx`; two or more alternatives on that level are `Vx.1`, `Vx.2`, etc., including the original version. Node IDs stay stable when labels change.
- Count sibling alternatives at each fork, including the original alternative. Show the circled count starting at **two** alternatives; this supersedes the previous three-alternative threshold.
- The count sits exactly at the shared junction where the parent stem diverges. Center the parent above its alternatives and reserve room for the junction. Pack each fork from its own sibling count and shared geometry, not from descendant span. Later levels fan around their parent and may extend past ancestor siblings; they must not widen earlier forks.
- When the first versions fork with no preceding station, place an origin station on the stem above the count. The origin-to-count stem is `originStemRows` (three grids). It has no info card and is not a selectable version.
- Keep that junction fixed when selection changes; the selected horizontal route is drawn as an additional path from the junction to the alternatives' row.
- Hover or keyboard focus on a count fades in a small right-pointing triangle to its right, using shared count-hint tokens. The triangle is decorative.
- The count toggles the level's stations and cards. Preserve data and selection; leave later levels visible and connect them through the collapsed count. Do not hide the station on the current (checked-out) branch. Expanding restores the level. Counts remain available in both states and support keyboard activation.
- Hover, focus, and open-panel affordances added to the diagram must also turn on during progress screenshots via `data-screenshot-interact`. Open the focused card's action menu. Frame a visible instance of each forced affordance (for example a count showing its hover triangle) rather than only the selected station. Do not depend on a real pointer hover in headless capture.
- Use shared count diameter/font tokens. Keep graph relationships, node population, and selected-branch logic independent of collapse state.
- When adding to a level with a count, automatically frame the level and its count together rather than scrolling only to the newest node. At the minimum zoom limit, keep the count visible and allow horizontal scrolling to reach farther alternatives.

## Implementation locations

- `src/features/version-tree/tokens.ts`: station diameters, connector width (`gridTriangleSide`), ring and stripe styling, fills, opacity, triangle dimensions/gap, count-hint triangle size/gap/fade, version-label size/gap/`stationLabelOffset`, `activeBranchColor`, and per-level unique branch colors.
- `src/features/version-tree/layout.ts`: lattice geometry, card offsets, row spacing, inactive-route clearance, origin stations for root-level forks, and fork divergence tokens (`forkSharedStemRows`, `originStemRows`, `forkDivergeStartRows`, `forkDivergeRows`, `forkDepartureUnits`, `forkLandingUnits`, `forkTerminalRows`) with `forkApproach`.
- `src/features/version-tree/presentation.ts`: selected branch, full selected path, terminal detection, sibling connectors, branch endpoint, the ordered endpoint list for traversal, and the checked-out spine.
- `src/features/version-tree/model.ts`: `activeBranchId`, `longestBranchId`, current-node and future-node deletion, and the path from root to that branch's last commit.
- `VersionTreePanel.tsx` and `VersionCard.tsx`: render these shared decisions; do not independently infer branch or terminal state.
