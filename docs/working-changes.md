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
