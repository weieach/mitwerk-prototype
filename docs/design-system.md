# MitWerk design system (canonical)

The `design-system` branch defines the **canonical MitWerk design system**. When it is merged into a branch that is changing features at the same time, the styling, tokens and motion here are the standard. Feature work keeps its behavior; its look adopts this system.

- Live reference: `?view=system` (reads the running stylesheet, so it always matches the app).
- Full decision log with dates: `docs/design-system-rules.md` (latest entry wins; later entries say what they supersede).
- This file is the short summary an agent should read before merging.

## Where the system lives

| Area | File |
| --- | --- |
| Base theme tokens (ink, paper, lines, contrast, stroke) | `src/index.css` (`:root`, `:root[data-theme=dark]`) |
| Shared control, chip, milestone and view-tag tokens | `src/control-tokens.css` |
| Panel layout, composer, chips, drawer, dividers, light-mode hierarchy | `src/features/workbench/workspace-layout.css` |
| Motion tokens and every enter/exit/press/layout transition | `src/motion.css` |
| Panel layout morph (View Transitions) | `src/shared/motion.ts` (`animateLayout`) |
| Menus with exit phase | `src/components/SelectMenu.tsx` (`useSelectMenu`, `closing`) |
| Bucket / page chip with capsule stack | `src/features/workbench/CaptureBucketChip.tsx` |
| Free-text capture detail field | `src/features/workbench/CaptureDetailField.tsx` |
| Boxless inline entry | `src/components/InlineTextField.tsx` |
| Milestone invitation shader | `src/features/workbench/MilestoneInviteField.tsx` |
| Reference page | `src/design-system/SystemPage.tsx` |

## Principles

1. **The tool leads.** Chat, lists and controls stay quiet. The milestone invitation is the one loud moment.
2. **Dark first, each mode its own palette.** Dark is the default. Light mode is not inverted dark: panels are soft gray and only the message box, in-chat cards and sent messages are near-white. Dark mode deepens colors (milestone field, dividers) instead of reusing light values.
3. **No solid white strokes, no black dividers.** Emphasis uses `--stroke-strong`; lines inside panels use `--panel-divider`.
4. **Frames move, content doesn't.** Panels stretch, squeeze and sweep from their shared edge; nothing inside scales, cross-fades or ghosts.
5. **One reveal, both ways.** Anything that appears also leaves: fade + drop in over `--motion-base` with `--ease-enter`; reverse out over the shorter `--motion-exit` with `--ease-exit`, then unmount. Lists stagger by `--motion-stagger` (top first in, bottom first out).
6. **Chips only for categories.** Buckets and pages are chips; free text is a frameless field with a thin underline. Every chip and capsule is 22px with one font size.
7. **Concentric corners, equal insets.** An inset element's radius is the parent radius minus the inset; insets are equal on every side. Text inside a panel starts at the title inset (20px) at every width.
8. **Edges reach edges.** Hover fills run to panel edges; narrow panels wrap or stack instead of clipping.
9. **Panels in reading order.** Top-bar view icons follow the panels left to right. Chat keeps a fixed width (≤ 30% of the screen) beside other panels.

## Merging into a feature branch

Apply in this order; stop at the first step that resolves a conflict.

1. **Tokens win.** For any color, size, radius, spacing or timing conflict, keep the token from this branch and point the feature code at it. Never reintroduce a hardcoded value that a token here replaces.
2. **Behavior wins.** For logic, data flow, routing or state conflicts, keep the feature branch's code, then re-apply this branch's classes, tokens and motion helpers (`animateLayout`, `useSelectMenu` closing phase) to the new markup.
3. **Component swaps.** If the feature branch still uses a superseded pattern (the boxed milestone editor, the capture overlay chip, the titled Version blocks pill, the branch-color invitation gradient, the 3-layer `src/design-system/tokens.css`), replace it with the component listed above rather than restyling the old one.
4. **New UI from the feature branch** inherits the system: read tokens from the files above, use the reveal pattern from `src/motion.css`, and add the decision to `docs/design-system-rules.md`.
5. **Fallback when a style cannot be ported cleanly** (the markup is too different): keep the feature's structure, apply only the semantic tokens (surfaces, text, lines, motion), and leave a dated note in `docs/design-system-rules.md` describing what still needs aligning. Do not block the merge on visual parity.
6. After merging, open `?view=system` in both themes and confirm every token resolves (no empty values).

## Pending structural change (not done on this branch)

Live server is owned by another team and will be removed. When that lands, Idea stream becomes its own standalone third panel instead of a split inside the Version blocks reader, and the top-bar icons keep matching the panel order. See “Planned panel model” in `docs/design-system-rules.md`.
