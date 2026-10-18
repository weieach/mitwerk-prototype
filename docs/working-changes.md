# Working changes

Changes that are made but not yet committed. The user decides when to commit and push. Remove an entry once it is committed.

## 2026-10-18 · Prompt #385

Chat message text 12px → 13px.

- `src/control-tokens.css`: new `--message-font-size: 13px`. `--body-font-size` stays 12px for everything else.
- `src/shared/type-studio.ts`: the Message role's built-in size is now `var(--message-font-size)` (was `var(--body-font-size)`, 12px). This role rule is what actually sizes `.message-content`, for both user and Mit messages; line height stays 1.5 (now 19.5px).
- `docs/design-system-rules.md`: new “Chat message size” rule. `docs/ui-restyle-guide.md`: Message row updated.
- `visual_ref/[prompt #385] b9ed56ad-5812-4add-b36a-d5517bab47df.png`.
- `docs/prompt-log.md`: added Prompt #385.

## 2026-10-18 · Prompt #386

- `src/features/workbench/workspace-layout.css`: the gallery footer's top border used `--workspace-background` (dark `#141414`, darker than the panel), while the Idea stream footer used `--row-divider` (`--line`). The gallery footer now uses `--row-divider` too, so both are `#262626` in dark and `#e6e6e6` in light. Light did not change, because `--workspace-background` already equals `--line` there.
- `docs/design-system-rules.md`: new “Panel footers share one divider” rule.
- `visual_ref/[prompt #386] 21c04404-f82f-4b6d-9235-8b30643df513.png`.
- `docs/prompt-log.md`: added Prompt #386.

## 2026-10-18 · Prompt #387

- `src/control-tokens.css`: new `--drawer-meta-scale: .9` and `--drawer-run-icon-size: calc(12px * var(--drawer-meta-scale))`.
- `src/features/workbench/workspace-layout.css`: to-do drawer timestamps (`Today 23:25`) are `calc(1em * var(--drawer-meta-scale))`, 12px → 10.8px. The mobile override (10px) is unchanged.
- `src/features/workbench/ComposerDrawer.tsx`: the to-do run (play) icon reads `--drawer-run-icon-size`, 12px → 10.8px.
- Not checked in the browser: the headless test page had no to-do rows.
- `visual_ref/annotation/[prompt #387] [annotation] 0d16bbcd-1971-4daa-a2c3-384ff55232e3.png`.

## 2026-10-18 · Prompt #388

- Question only (what Capturing does). No code change. `visual_ref/[prompt #388] 81f8fb80-65fe-4a44-acc8-83ce7f1342b2.png`.

## 2026-10-18 · Prompt #389

- `src/features/workbench/workspace-layout.css`: gallery footer and Idea stream footer (`.canvas-controls`) both use `--panel-footer-height` (52px) for `--row-height` and `min-height`. Idea stream's footer was the fluid `--footer-row-height` (about 47px at 1512px wide), so its top edge sat 5px lower than the gallery footer.
- `docs/design-system-rules.md`: “Panel footers share one divider” rule now also covers the shared height.
- `visual_ref/[prompt #389] 4e60357b-1526-4ed9-ac6d-24d21ba3d50f.png`.
- `docs/prompt-log.md`: added Prompts #387–#389.

## 2026-10-18 · Prompt #390

The Idea stream footer stays one row (52px) when the panel is narrow.
- `src/features/workbench/workspace-layout.css`:
  - `.canvas-controls.has-navigation` is now a size container (`idea-footer`) with `flex-wrap:nowrap`.
  - It has three container-query tiers: 520px, 400px and 280px.
  - The jump button text can ellipsize.
- `src/control-tokens.css`: new `--idea-footer-compact-control` (40px), `--idea-footer-compact-scale` (52px), `--idea-footer-tight-control` (32px) and `--idea-footer-tight-scale` (44px).
- `src/features/version-tree/VersionTreePanel.tsx`: the jump button's word is wrapped in `.endpoint-jump-word`, so the tight tier can hide it and keep the count.
- Checked at 600, 480, 430, 360, 300 and 250px: 52px tall, one row, no overflow.
- `visual_ref/[prompt #390] b252b7aa-92b3-4e92-a8c8-95d558feb0f6.png`.

## 2026-10-18 · Prompt #391

To-do drawer spacing.
- `src/control-tokens.css`: new `--drawer-heading-padding-top` (14px), `--drawer-heading-padding-bottom` (8px), `--drawer-content-top-padding` (4px) and `--drawer-check-gap` (10px). Changed `--drawer-row-height` from 20px to 24px and `--drawer-row-gap` from 7px to 6px.
- `src/features/workbench/workspace-layout.css`: the heading padding, content padding and checkbox gap read those tokens. The heading padding was 6px top and bottom; the checkbox gap was 8px.
- Checked: heading padding is 14px above and 8px below, and rows are 24px tall spaced 30px apart.
- `visual_ref/[prompt #391] dd75267d-f81c-4039-847c-90f65a93ad8d.png`.

## 2026-10-18 · Prompt #392

The Capturing row's sizes and heights are unified.
- `src/control-tokens.css`:
  - `--capture-settings-font-size` changed from 13px (`.8125rem`) to `var(--body-font-size)` (12px).
  - New `--capture-row-height: 20px`.
  - `--capture-detail-height` changed from 22px to `var(--capture-row-height)`.
- `src/features/workbench/workspace-layout.css`:
  - `--capture-chip-height` changed from 22px to `var(--capture-row-height)`.
  - `.capture-settings` gets `line-height: var(--capture-row-height)`.
  - The pill text's `line-height` changed from 1.4 to `var(--capture-chip-height)`, and its `padding-bottom: 1px` was removed.
  - The location menu options share the pill height, so they are 20px now too.
- Before: the words were 13px with a 19.5px line, the pill 22px tall, and the pill text sat 1.2px above the words' center. After: everything is 20px with its center at 10px. The pill text stays 11px.
- `visual_ref/[prompt #392] 168e15c2-de78-4adc-84d2-1ee61fc69f6b.png`.

## 2026-10-18 · Prompt #393

Editing a to-do fades its time and run button.
- `src/control-tokens.css`: new `--drawer-editing-meta-opacity: 0` and `--drawer-editing-fade: 240ms`.
- `src/features/workbench/workspace-layout.css`:
  - `li:has(.composer-todo-edit)` fades `time` and `.composer-todo-add`, which also stop taking clicks.
  - The fade is turned off under reduced motion.
- Checked: opacity goes from 0.5 / 1 to 0 / 0 while editing, and back after Escape.
- `visual_ref/[prompt #393] 18a59052-281c-41ac-8783-06cb965a0819.png`.
- `docs/prompt-log.md`: added Prompts #390–#393.

## 2026-10-18 · Prompt #394

Sans serif is Waldenburg.
- `src/index.css`: `--sans` is now `'Waldenburg', 'KMR Waldenburg', 'KMR-Waldenburg', 'Helvetica Neue', Helvetica, Arial, sans-serif`.
- `src/features/workbench/TypeStudio.tsx`: the Family option label says Waldenburg.
- The font is not bundled. On this machine the stack falls through to Arial (measured: the stack is 785.8px wide at 72px, the same as Arial; a bare Waldenburg face is 710.7px and is not installed). It shows where the family is installed.
- `docs/design-system-rules.md` and `docs/ui-restyle-guide.md` updated.

## 2026-10-18 · Prompt #395

Editing a to-do extends its underline across the row.
- `src/features/workbench/ComposerDrawer.tsx`: the timestamp and run button sit in `.composer-todo-meta`.
- `src/control-tokens.css`: new `--drawer-row-inline-gap: 12px` (8px below 600px).
- `src/features/workbench/workspace-layout.css`: while `.composer-todo-edit` is present, the meta collapses to `max-width: 0` and its leading margin cancels the row gap, so the underline reaches the row's right edge. Reduced motion skips the transition.
- Checked: before editing the text ended at 464px with an 86px meta; while editing the meta is 0 wide and the field's right edge matches the row (562px).
- `visual_ref/[prompt #395] 8a94407f-a4f5-45c1-966e-80fde68095b2.png`.

## 2026-10-18 · Prompt #396

The seam between Chat and the reading window is 9px, down from 12px (25%).
- The 12px came from two 6px flex gaps around the zero-width resize handle.
- `src/features/workbench/workspace-layout.css`: new `--workspace-panel-gap: 9px`. The body gap uses it. The handle's negative inline margin cancels one gap, and the reader's flex basis subtracts the panel gap once. The page edge stays `--workspace-gutter` (6px).
- Checked at 1512px: left edge 6px, seam 9px, right edge 6px, no overflow.
- `visual_ref/[prompt #396] f7b34b4b-4cd8-460f-b1ed-40f7039b62f9.png`.

## 2026-10-18 · Prompt #397

The pencil on the capture bucket pill appears on hover.
- It is not a separate action. The whole pill opens the location list; the pencil only marks that the name can change.
- `src/features/workbench/CaptureBucketChip.tsx`: the pencil has `capture-chip-edit`.
- `src/control-tokens.css`: new `--capture-chip-icon-gap: 5px`.
- `src/features/workbench/workspace-layout.css`: the pencil is collapsed until hover, keyboard focus, or an open location list. Reduced motion skips the fade.
- Checked: at rest the icon is 0×0 and opacity 0 (pill 91.5px); on hover it is 10px wide and opacity 1 (pill 106.5px).
- `visual_ref/[prompt #397] 5cb12e9f-80ba-40a2-8fb6-2c5a4764da66.png`.

## 2026-10-18 · Prompt #398

- Question only (panel edge distances). Measured at 1512px: both outer edges are 6px (`--workspace-gutter`). No code change.
- `visual_ref/[prompt #398] e57489cb-9ce8-4c18-ad87-95fb1cebab38.png`.
- `docs/prompt-log.md`: added Prompts #394–#398.

## 2026-10-18 · Prompt #399

- Question only (chat font sizes). No code change. `visual_ref/[prompt #399] 95e1262a-2b72-47c4-bb4a-f2941e9c0922.png`.

## 2026-10-18 · Prompt #400

Panel seam 5px, page edge 7px.
- `src/features/workbench/workspace-layout.css`: `--workspace-panel-gap` 9px → 5px; `--workspace-gutter` 6px → 7px.
- The gutter also sets the gap above and below the site header (`--workspace-bar-gap`) and the work state slider's margins, so those are 7px too. The panels now start at 52px from the top (was 50px).
- Checked at 1512px and 900px: left 7px, right 7px, bottom 7px, seam 5px.
- `docs/design-system-rules.md`: the seam rule is updated.

## 2026-10-18 · Prompt #401

To-do heading not bold; chat messages 12px.
- `src/control-tokens.css`: `--message-font-size` 13px → `var(--body-font-size)` (12px). This undoes the 13px from Prompt #385.
- `src/shared/type-studio.ts`: Message role `sizePx` 13 → 12. The To-do heading role weight 700 → 400.
- `src/features/workbench/workspace-layout.css`: `.composer-drawer-heading` `font-weight` 700 → 400.
- Checked: user and Mit messages are 12px / 18px, the same as the composer field (12px / 18px); the To-do heading is 12px / 400. Type studio tests pass and tsc is clean.
- `docs/design-system-rules.md` and `docs/ui-restyle-guide.md` updated.

## 2026-10-18 · Prompt #402

- Question only (which font is in use). No code change.

## 2026-10-18 · Prompt #403

The Idea stream background is a dot lattice instead of diamond lines.
- `src/features/version-tree/IsometricGrid.tsx`: the SVG pattern draws five dots per tile (the four corners and the center), which are the isometric line intersections. The old 0.55px lines are gone.
- `src/features/version-tree/tokens.ts`: new `treeTheme.gridDotRadius: 0.9` and `treeTheme.gridDotOpacity: 0.6`. The color is still `--grid-line` (`#4b4b4b` dark, `#b0b0b0` light).
- Checked by screenshot in dark mode: the dots are evenly spaced and the stations still sit on the lattice. tsc is clean.
- `visual_ref/[prompt #403] 293934ef-2ee7-4c80-8026-48f7477ad71c.png`.

## 2026-10-18 · Prompt #404

- Question only (footer text size). Measured: footer labels use `--control-font-size`, `clamp(10px, calc(8px + .21vw), 12px)`, which is 11.18px at 1512px wide. Icons are 18px in the gallery footer and 15px in the Idea stream footer. No code change.
- `visual_ref/[prompt #404] 7820b119-6cdc-4025-8767-341898a01cf3.png`.

## 2026-10-18 · Prompt #405

Panel footers: 12px text, 15px icons.
- `src/features/workbench/workspace-layout.css`:
  - New `--panel-footer-font-size: 12px` and `--panel-footer-icon-size: 15px`.
  - Both footers (`.gallery-footer`, `.canvas-controls`) override `--control-font-size`, `--control-icon-size` and `--zoom-icon-size` with them.
  - Every `.ui-icon` in a footer except `ph-caret-*` is 15px.
- Before: text was 11.18px at 1512px wide (fluid). Icons were 18px (folder), 15px (crosshair) and about 12px (plus, minus, arrows). After: text is 12px and all of those icons are 15px. Dropdown carets stay 12px.
- The gallery footer's content is wider than the footer at 1512px, 1100px and 900px, so it overflows. That was already true before (533px of content in 457px; now 535px). Not fixed yet.

## 2026-10-18 · Prompt #406

Milestone card preview.
- The chat version card only renders when its message matches a capture frame. This machine's `[frame capture] screenshots/` is empty (it is git-ignored), so `gallery/manifest.json` has no frames and the card never showed.
- `src/features/workbench/milestone-invite.ts`: new `milestonePreviewSample` (version 40, `examples/iteration-preview.png`).
- `src/features/workbench/Workbench.tsx`: `?milestone=1` renders the card with that sample when there is no frame. Opening it without a frame opens the reader without a frame request.
- Checked: at `?milestone=1`, the invitation (gradient, arrow and Not yet) appears after the 3-second delay. tsc is clean.
- `docs/design-system-rules.md`: new “Milestone card preview” rule.
