# Working changes

Prior application entries are committed through `13a6093`; the uncounted sync request is recorded in `docs/prompt-log.md`.

## 2026-10-19 · prompt #537 (uncounted) · Push bookkeeping

- `data/push-shas.json`, `AGENTS.md`: record successful push #60 (`85c3d88866a04df4ab8ac1ba0a4ac82d1ec33d7d`) after GitHub accepted it. Prompt remains #537; no screenshot was taken. These post-push tracking updates remain local for the next commit.

## 2026-10-19 · prompt #539 · Invitation completion animation

- `src/features/workbench/{MessageOutput.tsx,MilestoneInvitationControls.tsx,milestone-invite.ts,workspace-layout.css,Workbench.tsx}`, `src/features/iteration-gallery/{model.ts,IterationGallery.tsx}`: keep the invitation gradient while its milestone overlay is open, drop inert controls after 300ms through the card mask, then flush the gradient and animate the default label back when the overlay resolves. Route completion to the originating card and respect reduced motion.
- `docs/design-system-rules.md`: record the shared lifecycle and motion timings, replacing immediate dismissal on open. `docs/prompt-log.md`, `AGENTS.md`, and progress capture: record the request and verification frame.
- 2026-10-19 · "verso Prompt and Version" canvas: added the "grouped by git push" connector and new descriptions; step-by-step entrance (left column, connector, right column) with clip-path line trims, scale-up icons and text fades; camera in --cursor-blue, git-commit in Pulse orange.
- `scripts/screenshot-progress.mjs`: add an explicit `--milestone-overlay` capture option, waiting for the overlay and delayed controls exit without changing the logged prompt.
- Verification: TypeScript and whitespace checks passed; isolated browser checks covered the 300ms delay, stable card height, retained gradient, Save persistence, Cancel, Escape, and reduced motion.
- 2026-10-19 · "verso Prompt and Version" canvas: frames and version block rebuilt from the animation's geometry (797×452 frames; 702×1097 block with 120px padding and 12px lines 150px apart; 4px borders) shown at 28%, so borders read ~1.1px like the animation; lower rows moved down and right column re-centred.
- 2026-10-19 · "verso Prompt and Version" canvas: "prompt" → "frame"; frames drawn in the animation's shot 1 3D orientation at 42% (2.4px border ≈ 1px on screen); version block at 24%; both labels and rows aligned just below the illustrations.
- 2026-10-19 · "verso Prompt and Version" canvas: frames back to flat overlap (32%, 3px border); version shows a row slice (block plus half of each neighbour, cropped); each column stroke and the middle connector draw as one continuous line (ease-in, constant speed past the icon/text, ease-out).

## 2026-10-19 · prompt #539 uncounted · Push the gradient-card commit

- Pushed `d029f00c2442147660636848538f42995579a45e` (`gradient version card state switch-back`) to `main`. The hook had been failing because a commit message with no capture cue waits for a reading window that never opens.
- `scripts/screenshot-progress.mjs`: push captures without a named screen use the home layout, and the next push number also accounts for SHAs already recorded without a file.
- `[frame capture] screenshots/[push #61] …`, `data/push-shas.json`, `AGENTS.md`: the hook first saved this frame as #60, which already belongs to `85c3d88`. Renamed it to #61 and recorded this commit. Prompt remains #539. These updates stay uncommitted.
- 2026-10-19 · "verso Prompt and Version" canvas: version slice scaled to the frames' height (17.56%, 5.5px borders ≈ 1px) with only a quarter of each neighbour; "grouped by git push" on one line with shorter connector lines; right column re-centred and retimed.
- 2026-10-19 · "verso Prompt and Version" canvas: version illustration is now three whole 4-frame blocks side by side (100px row gap), no cropping; right column re-centred.
- 2026-10-19 · "verso Prompt and Version" canvas: version blocks varied to 2, 4 and 3 frames; labels moved up to 428px (32px under the illustrations); lines, icons and descriptions stay at their earlier positions.
- 2026-10-19 · "verso Prompt and Version" canvas: column strokes and icons moved up 18px so the gaps above and below them are equal (~42px).
- 2026-10-19 · exported `exports/verso-frame-version.html`: self-contained 16:9 click-through of the "verso Prompt and Version" diagram (frame → strokes below frame → connector → version → strokes below version), font embedded, scales to any window; `exports/` is gitignored.


## 2026-10-19 · prompt #540 · Playback click region and milestone speed

- `src/features/iteration-gallery/TheaterView.tsx`: prevent click-to-Gallery throughout the measured playback content column plus inline padding, while retaining side-gutter dismissal, frame actions, and drag orbiting.
- `src/features/iteration-gallery/tokens.ts`: use 0.5× as the shared Milestone default on initialization and unit selection.
- `docs/design-system-rules.md`, `docs/prompt-log.md`, `AGENTS.md`, progress capture: document the interaction rule and request.
- Verification: TypeScript and whitespace checks passed. Browser checks confirmed protected top/bottom column clicks (including side padding) at 1440px and 2000px viewport widths, side-gutter dismissal, 0.5× Milestone selection and restoration, manual 4× override, and the unchanged 2× Version default. An additional headless drag-orbit probe did not reach its expected orbit state; drag handling itself was not changed.


## 2026-10-19 · prompt #541 · Automatic Capture details

- `src/features/workbench/{capture-details.ts,CaptureDetailField.tsx,ComposerDrawer.tsx,Workbench.tsx,composer-state.ts}`: default to the placeholder, infer the first two distinct keywords after a one-second idle delay, handle to-do insertions through the same message draft, cancel stale results, and retain manual field editing.
- `src/control-tokens.css`, `src/features/workbench/workspace-layout.css`: shared tokens for three large fading/bouncing loading dots, with accessible status and reduced-motion support.
- `tests/capture-details.test.ts`: cover keyword order, deduplication, phrase boundaries/whitespace, fallback, and empty drafts.
- `docs/design-system-rules.md`, `docs/prompt-log.md`, `AGENTS.md`, progress capture: document the behavior and request.
- Verification: 14 focused inference/composer tests and TypeScript passed. Isolated browser checks covered placeholder, three animated dots, one-second debounce restart, first-two ordering, fallback, manual edits, clearing stale results, to-do insertion, and reduced motion.
- `scripts/screenshot-progress.mjs`: add bounded `--ready-timeout-ms` so the required home capture can wait for large gallery assets instead of repeatedly failing its 10-second default; existing defaults remain unchanged.


## 2026-10-19 · prompt #542 · Capture detail spacing

- `src/control-tokens.css`: reduce the field minimum from 7ch to 1ch so short text has a fitted underline; tighten loading dot gaps from 5px to 3px.
- `docs/design-system-rules.md`, `docs/prompt-log.md`, `AGENTS.md`, progress capture: record the shared sizing rule and request.
- Verification: browser measurements confirm “gallery” field width matches text (39.13px), the placeholder remains fully sized, and loading dot gaps are 3px. Whitespace checks passed.


## 2026-10-20 · prompt #543 · Branch echo-1020 and local environment

- Created branch `echo-1020` from `main` (`671a7f1`) for UI and animation detail work.
- Ran `npm install` (dependencies were missing, so `vite` was not found); reverted its metadata-only `package-lock.json` churn. The dev server now runs at http://localhost:5173.
- `[frame capture] screenshots/[prompt #543] echo-1020 …`, `docs/prompt-log.md`, `AGENTS.md`: the catch-up capture for the branch request; counter is now prompt #543.

## 2026-10-20 · prompt #544 · Light-mode palette review

- `docs/design-system-rules.md`: new rule "Light mode edits stay out of dark mode": light-only values go in `:root[data-theme=light]`; shared base tokens need a dark override before they change.
- Analysis only otherwise; no stylesheet changed. `docs/prompt-log.md`, `AGENTS.md`, progress capture: record the request.

## 2026-10-20 · prompt #545 · Light mode round 1: neutral palette

- `src/features/workbench/workspace-layout.css`: rewrote the `:root[data-theme=light]` block. Two neutral grounds (#fcfcfc panels on #f3f3f3 chrome), every other neutral is #141414 at a fixed alpha pre-mixed over the panel; ink/contrast #141414; muted #636363 and faint #888 for legible secondary text; drawer blue glow removed; gallery capture opacity .94. Added `--panel-outline` / `--view-tag-outline` (8% hairline in light, transparent by default) on panels and the active view tag.
- `docs/design-system-rules.md`: "Light mode neutral palette" rule, superseding the 2026-10-18 light hierarchy values.
- `scripts/screenshot-progress.mjs`: `--theme light|dark` sets the capture theme when the prompt names none (this chat captures in light mode by default).
- Verification: dark-mode home and Idea stream renders are pixel-identical before and after (0 differing pixels); light renders checked at 1600×1000.

## 2026-10-20 · prompt #546 · Light Playback: recede secondary information

- `src/features/workbench/workspace-layout.css`: light-only Playback tokens (`--playback-secondary`, annotation chip fill/ink/text opacity, `--theater-version-tag-border`, timeline overview track/thumb); version tag border reads its token.
- `src/features/iteration-gallery/gallery.css`: jump/seek buttons read `--playback-secondary` (hover returns to ink); the add-annotation chip label reads `--playback-annotation-text-opacity` (default .65).
- Side effect of round 1: the theater frame bed (`var(--chrome, var(--ink))`) now resolves to #f3f3f3 in light instead of black, since light defines `--chrome`.
- `docs/design-system-rules.md`: "Light Playback hierarchy". `visual_ref/[prompt #546] 1.png`: user reference.
- Verification: dark Playback render pixel-identical to round 1 (0 differing pixels); light samples: chip #d7d7d7 → #f0f0f0, overview track #000 → #e9e9e9.

## 2026-10-20 · prompt #547 · Playback prompt unfold and hairline timeline outlines (both themes)

- `src/features/iteration-gallery/TheaterCaption.tsx`: clipped captions unfold in place on hover (250ms intent), focus, Enter/Space or click; card portaled into `.theater-body`, aligned to the clamped line, closes on leave/Escape. `tokens.ts`: `captionRevealDelayMs`, `captionCloseDelayMs`, `captionCardPadding`, `captionCardMaxVh`. `gallery.css`: card and focus styles.
- `src/features/iteration-gallery/theater-layout.ts`: `userPromptText` strips injected `<in-app-browser-context>` blocks for display; used by `theaterCaption` and the album hover caption (`AlbumView.tsx`). `tests/theater-layout.test.ts`: covers it.
- `src/control-tokens.css`, `gallery.css`: timeline block outlines use `--timeline-block-outline` / `--timeline-block-outline-width` (0.5px, 55%).
- `docs/design-system-rules.md`: new rule, superseding the 2026-10-18 no-tooltip caption rule for Playback. `visual_ref/[prompt #547] 3.png`, `4.png`: user references.
- Verification: `tsc` clean; 313 + new test pass; CDP hover check on prompts #490 and #544 (opens at 250ms, 0px offset from the clamped line, closes on leave) in light and dark.

## 2026-10-20 · prompt #548 · Smaller version labels when the gallery is zoomed out

- `src/features/iteration-gallery/axis-label-layout.ts`: ground-plane version values use a zoom-dependent font size (100% → 87% between zoom 1 and `zoomMin`). `tokens.ts`: `axisText.zoomedOutValueScale` .87. `tests/axis-label-layout.test.ts`: covers values, titles and dates.
- `docs/design-system-rules.md`: new rule. `visual_ref/[prompt #548] 5.png`, `6.png`: user references.
- Verification: `tsc` clean; axis tests pass; in the browser at 50% zoom version labels measure 9.57px (from 11px) while title and dates stay 11px.

## 2026-10-20 · prompt #549 · Gallery hover occlusion

- `src/features/iteration-gallery/AlbumScene.ts`: `syncOcclusion` (camera-space depth test on hover) and `syncOcclusionBlend` (damped multiplier applied after material fades) recede frames and block wireframes in front of the hovered frame. `tokens.ts`: `webgl.hoverOcclusion` { image .22, edge .35, depthMargin 1 }.
- `docs/design-system-rules.md`: "Hover occlusion in the gallery". `visual_ref/[prompt #549] 7.png`: user reference.

## 2026-10-20 · prompt #550 · Lighter capture-details underline (light only)

- `src/features/workbench/workspace-layout.css`: light block sets `--capture-detail-line` #bbb and `--capture-detail-line-active` #888. `docs/design-system-rules.md`: rule. `visual_ref/[prompt #550] 8.png`: user reference.
- Verification: computed underline is rgb(187,187,187) in light; dark unchanged (ink at 65%).

## 2026-10-20 · prompt #551 · Light location chip fill and lighter To-do drawer

- `src/features/workbench/workspace-layout.css` (light block only): `--capture-chip-surface` #e0e0e0; `--composer-drawer-surface` → `--chrome` (#f3f3f3), `--composer-drawer-hover` #eee.
- `docs/design-system-rules.md`: rule. `visual_ref/[prompt #551] 10.png`: user reference.
- Verification: computed light chips #e0e0e0 on panel #fcfcfc and drawer #f3f3f3; dark chips and drawer unchanged.

## 2026-10-20 · prompt #552 · Chat outline consistency and To-do heading spacing

- `src/features/workbench/workbench-system.css`, `src/control-tokens.css`: Chat's `:has(.mw-dialog)` rule now keeps `--panel-outline` under `--workspace-panel-shadow` (default `0 0 #0000`, formerly `none`), so Chat and Version blocks share the light hairline.
- `src/features/workbench/workspace-layout.css`: open drawer heading padding 15/7 via `--drawer-open-label-shift`, transitioned with drawer timing.
- `docs/design-system-rules.md`: rule. `visual_ref/[prompt #552] 11.png`: user reference.
- Verification: computed outlines match on Chat and Version blocks in light (#e9e9e9) and are transparent in dark; open drawer gaps measure 17px above and below "To-do" (were 13/21).

## 2026-10-20 · commit prep (no new prompt number)

- `docs/prompt-log.md`: removed this branch's six uncounted entries at the user's request.
- `[frame capture] screenshots/[prompt #549] …`: recaptured in place in dark mode (`--recapture-prompt 549 --gallery-hover --theme dark`); counter unchanged.
- `docs/prompt-log.md`: #543–#552 rewritten as concise English prompts at the user's request (mid-turn follow-ups folded in). The 10 branch captures were renamed to the English summaries (same numbers, timestamps and line deltas), and their `data/token-usage.json` keys moved with them. `visual_ref/[prompt #552] 12.png`: user reference.
