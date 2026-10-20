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
