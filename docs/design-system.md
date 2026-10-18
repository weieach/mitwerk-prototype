# MitWerk design system (canonical)

`echo-1017` is where the MitWerk UI is being finalized before it merges into `main`. It combines Echo's dark-mode-first restyle (Cursor Dark palette, Waldenburg, type roles, footers, popovers) with layout details ported from the `design-system` branch. Once merged, this is the canonical system: new work reads these tokens and follows these rules.

- Live reference: `?view=system`. It resolves every token from the running stylesheet, in the current theme, and leaves out tokens that are not defined, so it always matches the app.
- Restyle entry points and type roles (Type editor): `docs/ui-restyle-guide.md`.
- Full dated decision log: `docs/design-system-rules.md` (the latest entry wins; later entries say what they supersede).

## Where the system lives

| Area | File |
| --- | --- |
| Theme tokens (ink, paper, lines, contrast, Cursor Dark palette, popovers) | `src/index.css` |
| Control, chip, drawer and milestone tokens | `src/control-tokens.css` |
| Panel layout, chat, composer, footers, light-mode hierarchy | `src/features/workbench/workspace-layout.css` |
| Type roles and the live Type editor | `src/shared/type-studio.ts`, `src/features/workbench/TypeStudio.tsx` |
| Idea stream geometry and colors | `src/features/version-tree/tokens.ts` |
| Reference page | `src/design-system/SystemPage.tsx` |

## Principles

1. **The tool leads.** Chat, lists and controls stay quiet; the milestone invitation is the one loud moment.
2. **Dark first, each mode its own palette.** Dark is the default (Cursor Dark grounds). Light mode is not a white page: panels are soft gray and only the message box, in-chat cards and sent messages are near-white.
3. **No solid white strokes, no black dividers.** Footer and title dividers use `--row-divider` / `--panel-heading-divider`; popovers use `--popover-border`.
4. **Chat holds its width.** Beside other panels chat is a fixed column, `--chat-panel-width` = min(440px, 35vw). Chat alone fills the body.
5. **Two chat edges.** Frames (message bubble, To-do section, message box) sit at `--composer-inset`; all text starts at `--panel-title-text-inset` (24px). Layout spacing scales through `--space-scale` (1.2).
6. **Chips only for categories.** Buckets and pages are chips; free text is a frameless field with an underline.
7. **Concentric corners, equal insets.** An inset element's radius is the parent radius minus the inset.
8. **Edges reach edges.** Hover fills run to panel edges; narrow panels wrap (gallery footer) or condense in tiers (Idea stream footer) instead of clipping.
9. **Panels in reading order.** Top-bar view links follow the panels left to right.

## Ported from `design-system` (2026-10-18)

- Fixed-width chat beside other panels (≤ 30% of the screen); the reader resize handle is hidden.
- Chat messages use the panel title's text inset, with no centered max-width column.
- Idea stream connectors are 12px, slimmer than the 28px stations.
- Light-mode surface hierarchy (soft gray panels; white message box and in-chat cards; near-white sent messages).
- Gallery footer wraps into two rows below 620px of panel width instead of clipping.
- `?view=system` and this document.

Still only on `design-system` and not ported (choose before merging if wanted): the motion system (panel frame morph, menu reveal and exit, capsule stagger, fold curve), the milestone invitation shader with its dark palette and fold on “Not yet”, the To-do drag gesture and top glow, and boxless inline milestone/to-do entry in Idea stream.

## Merging into `main`

Stop at the first step that resolves a conflict.

1. **Tokens win styling conflicts.** Keep the token from this branch and point feature code at it; do not reintroduce a hardcoded value a token replaces.
2. **Feature code wins behavior conflicts.** Keep `main`'s logic, data flow and state, then re-apply this branch's classes and tokens to the new markup.
3. **Superseded patterns are swapped, not restyled.** For example the titled Version blocks pill or a boxed editor: use the current component.
4. **New UI inherits the system** and records any new rule in `docs/design-system-rules.md`.
5. **Fallback:** if a style cannot be ported cleanly, keep the feature's structure, apply only the semantic tokens (surfaces, text, lines), and add a dated “needs aligning” note to `docs/design-system-rules.md`. Do not block the merge on visual parity.
6. After merging, open `?view=system` in both themes and the workspace at three widths (≈1100, 1400, 2000px) to confirm nothing clips.

## Pending structural change

Live server is owned by another team. When the standalone Live server panel goes away, Idea stream becomes its own third panel instead of a split inside the Version blocks reader, and the top-bar view links keep matching the panel order.
