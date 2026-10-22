# Working changes

Prior entries are committed through `8e10d8a` and pushed as push #65 on `main`.

## 2026-10-21 · post-push bookkeeping (push #65)

- The pre-push hook saved the `[push #65]` frame and recorded `8e10d8a` in `data/push-shas.json`; `AGENTS.md` counter set to push #65. These stay uncommitted for the next commit.

## 2026-10-21 · prompt #569 · Gallery labels behind frames

- `src/features/iteration-gallery/AlbumScene.ts`: per-anchor occlusion raycast against frame images, eased opacity multiplier applied to projected axis labels. `src/features/iteration-gallery/tokens.ts`: `webgl.labelOcclusion` tokens.
- Verified: in the default view the visible labels are unchanged; after orbiting along the version axis, covered version labels fade behind the screenshots.
- `docs/design-system-rules.md`: record the rule. `visual_ref/[prompt #569] 13.png`: the user's reference.
