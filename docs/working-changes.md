# Working changes

Prior entries are committed through `7c675b1` on `main` (not pushed). Push #62 bookkeeping and prompts #553–#558 are included in that commit.

## 2026-10-21 · prompt #558 uncounted · Push bookkeeping (push #63)

- Pushed `7c675b1e9699cbc04d2714d566ce530e26b044a4` to `origin/main`. The pre-push hook saved the `[push #63]` frame and recorded the SHA in `data/push-shas.json`; `AGENTS.md` counter set to push #63. These tracking updates stay uncommitted for the next commit.

## 2026-10-21 · prompt #559 · Narrower saved-frame menu

- `src/features/iteration-gallery/SavedFrameSelect.tsx`: drop the 280px menu minimum; the menu sizes to its options and right-aligns with the trigger (243px at 1440 wide, no clipping).
- `docs/design-system-rules.md`: record the rule. `visual_ref/[prompt #559] 9.png`: the user's reference.
- Prompt #558 uncounted (3): animation audit only (no code changes); findings were reported in chat.

## 2026-10-21 · prompt #560 · Motion wave 1

- `src/control-tokens.css`: shared `--ease-out` / `--ease-in-out` / `--ease-drawer` and `--press-scale` / `--press-duration` tokens; removed the duplicate drawer timing tokens; run progress 420 → 240ms.
- `src/features/workbench/workspace-layout.css`: single drawer timing (400ms open on the sheet curve, 260ms close); panel word exit `ease-in` → `--ease-out`; run progress curve → `--ease-out`; to-do hover nudge gated to fine pointers; press-feedback rule for controls.
- `src/features/iteration-gallery/tokens.ts`: Playback transport delay 640 → 260ms, annotation tag ready 1000 → 420ms; overlay frame 220 → 120ms, controls 320 → 160ms, list stagger 110 → 50ms.
- `docs/design-system-rules.md`: record the rules and what they supersede. Typecheck and 316 tests pass.

## 2026-10-21 · prompt #561 · Motion wave 2

- `src/index.css`, `src/features/annotations/annotations.css`, `src/features/iteration-gallery/gallery.css`, `src/features/workbench/{workspace-layout.css,workbench.css}`: 24 entrance, exit and movement easings switched to the shared `--ease-out` / `--ease-in-out`; hover easings left as `ease`.
- `src/features/workbench/workspace-layout.css`: the drawer heading's open shift now uses `translate` on its label and count instead of a padding transition (verified: 40px height kept, label 11 → 15px).
- `docs/design-system-rules.md`: record the rules and the two deliberate non-changes. Typecheck and 316 tests pass.

## 2026-10-21 · prompt #562 · Motion wave 3, screenshot radius, quieter reference chips

- `src/features/iteration-gallery/tokens.ts`, `tests/theater-transition.test.ts`: rotation 1100 → 750ms; the test derives from the token.
- `src/components/SelectMenu.tsx`, `src/features/workbench/workspace-layout.css`: menu entrance from the trigger (verified frame by frame with motion enabled: 0 → 1 opacity, .97 → 1 scale over about 150ms).
- `src/shared/useLeavingValue.ts` (new), `src/features/workbench/{Workbench.tsx,workbench.css}`, `src/features/iteration-gallery/{PlaybackExport.tsx,TheaterView.tsx}`, `src/features/annotations/MilestoneCommitOption.tsx`: toasts enter by transition and fade out in 150ms before unmounting (verified).
- `src/features/workbench/workbench.css`: spinner 1.5 → 0.8s.
- `src/features/iteration-gallery/gallery.css`, `src/control-tokens.css`: 4px Playback screenshot radius; reference chips muted, unfilled, with a hover fill.
- `docs/design-system-rules.md`: record the rules. Typecheck and 316 tests pass. Note: headless Chrome reports reduced motion, so motion checks emulate `prefers-reduced-motion: no-preference`.

## 2026-10-21 · prompt #563 · Confetti visibility, to-do type, dialog title, greeting

- `src/features/annotations/{MilestoneTrophy.tsx,annotations.css}`: confetti uses badge colour plus theme ink, at 4 × 6px. Verified that it fires (16 pieces) and is visible mid-flight in light mode.
- `src/control-tokens.css`, `src/features/workbench/workbench-system.css`: to-do title 0.75rem / 400 / 1.5, roomier cards; to-do navigation dialog title about 16px (was about 20px), verified computed 15.85px.
- `src/features/workbench/Workbench.tsx`: greeting "Work it out with verso."
- `docs/design-system-rules.md`: record the rules. Typecheck and 316 tests pass.
