# Working changes

Prior entries are committed through `572e099` and pushed as push #64 on `main`.

## 2026-10-21 · post-push bookkeeping (push #64)

- The pre-push hook saved the `[push #64]` frame and recorded `572e099e7bd492edde7288adf700a6f29dc164bc` in `data/push-shas.json`; `AGENTS.md` counter set to push #64. These stay uncommitted for the next commit.

## 2026-10-21 · prompt #564 · To-do drawer row structure

- `src/features/workbench/ComposerDrawer.tsx`: rows render task text, then a details line (bucket · version · time); the run button is a direct row child.
- `src/features/workbench/workspace-layout.css`: two-line row styles with first-line alignment for checkbox and run button; removed the old inline meta and max-width editing rules; plain-text location in details. Checked in light and dark.
- `docs/design-system-rules.md`: record the rule. `visual_ref/[prompt #564] 10.png`: the user's reference.

## 2026-10-21 · prompt #565 · Chat resize smoothness, milestone ring

- `src/features/workbench/useChatPanelWidth.ts`: live, rAF-coalesced CSS-variable width during drag; state commits on release.
- `src/features/version-tree/tokens.ts`: milestone ring uses the canvas colour (verified light: rgb(252, 252, 252)).
- `docs/design-system-rules.md`: record both rules. Typecheck and 316 tests pass.

## 2026-10-21 · prompt #566 · Type scale

- `src/control-tokens.css`: `--page-title-size` 20px, `--dialog-title-size` 16px, `--card-title-size` 17 → 14px; removed the to-do dialog title token.
- `src/features/workbench/workbench-system.css`: separate page-title and dialog-title rules; removed the to-do dialog override.
- `src/shared/type-studio.ts`: new Dialog title role; page-title role covers page headings only; card-title and milestone defaults at 14px.
- `src/features/version-tree/tokens.ts`: milestone font 17 → 14px.
- Verified computed sizes: Idea stream notes and to-dos 14px/400, Todos page title 20px/500, dialog title 16px/500. Typecheck and 316 tests pass.

## 2026-10-21 · prompt #567 · Idea stream to-do chip alignment, time size

- `src/index.css`: checkbox-only icon offset; muted to-do time. `src/control-tokens.css`: Idea stream to-do time uses `--chat-meta-size`. Verified icon and label centers match (528.5px) and the time matches the drawer token.
- `docs/design-system-rules.md`: record the rule. `visual_ref/[prompt #567] 12.png`: the user's reference.

## 2026-10-21 · prompt #568 · Shared to-do details, station icons, alignment

- `src/features/workbench/TodoDetails.tsx` (new), `ComposerDrawer.tsx`, `src/features/version-tree/IdeaCard.tsx`: one details line for the drawer and Idea stream cards; `.todo-details` CSS shared in `workspace-layout.css`; old Idea card time and chip rules and tokens removed from `index.css` and `control-tokens.css`.
- `src/features/version-tree/{tokens.ts,VersionTreePanel.tsx,IdeaCard.tsx}`: station icon scale (trophy 28 → 20px in a 36px circle).
- `src/index.css`, `src/control-tokens.css`: centred delete icon; checkbox toggle sized to its icon and excluded from control sizing.
- `src/features/iteration-gallery/gallery.css`, `src/control-tokens.css`: reference chip link-style hover, no fill and no negative margin.
- `docs/design-system-rules.md`: record the rules and the audit coverage. Typecheck and 316 tests pass.
