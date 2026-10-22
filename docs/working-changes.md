# Working changes

Prior application entries are committed through `1aee094` (pushed as push #62 on `echo-1020`); the uncounted sync request is recorded in `docs/prompt-log.md`.

## 2026-10-20 · post-push bookkeeping (push #62)

- `data/push-shas.json`, `AGENTS.md`, `[frame capture] screenshots/[push #62] …`: record push #62 (`1aee094`) on `echo-1020`. Prompt remains #552. These updates stay uncommitted for the next commit.

## 2026-10-21 · prompt #552 uncounted · Switch to `main`; English prompt display rule

- Switched from `echo-1020` to `main` and fast-forwarded it to `origin/main` (`1aee094`, identical to `echo-1020`), carrying over the uncommitted push #62 bookkeeping.
- `AGENTS.md`, `docs/design-system-rules.md`: non-English prompts are logged and displayed (prompt log, capture labels, Playback and gallery captions) as a clear, complete English translation, with the original kept below the fence. No capture was taken because this was a setup request.

## 2026-10-21 · prompt #553 · Remove edit-field fill

- `src/shared/edit-fields.css`, `src/features/annotations/annotations.css`: the milestone / to-do overlay input (and other shared edit fields) no longer paints `--paper` behind its text; the field is transparent with only its hairline underline. Most visible in dark mode over a light screenshot.
- `docs/design-system-rules.md`: record the no-fill rule. `visual_ref/[prompt #553] 1.png`, `2.png`: the user's references.

- `scripts/screenshot-progress.mjs`: add an explicit `--annotation-overlay` capture flag, which opens the annotation overlay without the cue in the logged prompt. The `--milestone-overlay` path timed out because the home screen had no milestone-ready card. The resulting #553 frame shows the Annotations list in dark mode; the input form itself is not open in it.

## 2026-10-21 · prompt #554 · Lighter Add milestone outline

- `src/control-tokens.css`: `--milestone-chip-border` changes from 55% ink to `var(--line)`, matching similar bordered buttons, so the chat "Add milestone" outline is less prominent.
- `docs/design-system-rules.md`: record the rule. `visual_ref/[prompt #554] 3.png`: the user's reference.

## 2026-10-21 · prompt #555 · Dark Playback background separation

- `src/features/iteration-gallery/{tokens.ts,gallery.css}`: the theater frame shadow uses a new `--theater-frame-glow` token. It's unchanged in light mode and transparent in dark, which removes the lighter halo that split the dark Playback background around the screenshot.
- `docs/design-system-rules.md`: record the rule. `visual_ref/[prompt #555] 4.png`: the user's reference.

## 2026-10-21 · prompt #556 · Playback caption always visible; header overlap; light-mode orbit glow

- `src/features/iteration-gallery/{theater-layout.ts,TheaterView.tsx,tokens.ts}`, `tests/theater-layout.test.ts`: the caption reserve has a floor (version row + 2 prompt lines + branch row). The frame shrinks proportionally to keep it, down to 50% width; the transport row follows the frame width. New `fitFrameToHeight` with a test. Verified in headless Chrome at 1100×800, 1280×720, 1440×800 and 1920×900: the prompt and branch rows are visible with no scrolling.
- `src/features/workbench/workspace-layout.css`: the Version blocks heading with the Gallery / Playback switch no longer shrinks under its content; the frame picker, then the date range, shrink instead. Verified at 900, 1100 and 1440 wide: no overlap. Also removes the hover orbit light on the milestone invitation controls in light mode (mid-turn request).
- `docs/design-system-rules.md`: record the rules. `visual_ref/[prompt #556] 5.png`: the user's reference (header and arrow references were inline images without local files).

## 2026-10-21 · prompt #557 · Playback milestone chip redesign

- `src/features/workbench/workspace-layout.css`: the milestone chip is one pill in the shared annotation fill, with a 24px branch-coloured trophy badge and ink-coloured label. This replaces the full-height trophy block and the white-on-gray label. Checked with v44 "Finalized brand name & concept!" in light and dark.
- `docs/design-system-rules.md`: record the rule. `visual_ref/[prompt #557] 6.png`, `7.png`: the user's references.

## 2026-10-21 · prompt #558 · Annotation entry alignment, location focus ring (blur reverted)

- `src/features/workbench/{ComposerDrawer.tsx,workspace-layout.css}`: added a six-layer progressive blur behind the Capturing row, then reverted it fully at the user's request (ComposerDrawer is back to its committed state).
- `src/features/annotations/annotations.css`: saved annotation entries use the editor's metrics and hairline, with no bordered box, so the milestone text lines up before and during editing.
- `src/features/workbench/workspace-layout.css`: light-mode focus ring on the "Location name" field uses `--milestone-edit-border` gray.
- `docs/design-system-rules.md`: record the rules. `visual_ref/[prompt #558] 8.png`: the user's reference (the later inline screenshots had no local files).
