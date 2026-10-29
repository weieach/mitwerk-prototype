# Working changes

Prior entries are committed on `main` through prompt #574 (Vercel Blob publication paused, push/deploy gates, album thumbnails).

## 2026-10-29 · prompt #576 · Rename the idea panel to Idea thread

- User-facing name is Idea thread: workspace view link, panel heading and compact label, screen-reader title, zoom and navigation labels, and the type studio group. Internal identifiers and capture cues stay.
- `src/features/workbench/Workbench.tsx`, `src/features/version-tree/VersionTreePanel.tsx`, `src/ReadingWorkspace.tsx`, `src/shared/type-studio.ts`, `docs/design-system-rules.md`.

## 2026-10-22 · prompt #574 uncounted · Push #68

- `AGENTS.md`: push counter set to #68 after pushing `2b56a7f`; `data/push-shas.json` and the `[push #68]` capture were recorded by the pre-push hook (Blob publication skipped).

## 2026-10-22 · prompt #575 · Serve live gallery images from the deployment, not Blob

- `scripts/static-gallery.mjs` (new): packages every capture as a 2400px WebP (`display`) and a 960px thumbnail, and references as WebP, under content-addressed `gallery/{images,thumbs,references}/<sha256>.webp`; writes a static `gallery/manifest.json` (`source: "static"`) and legacy filename routes. ~60 MB instead of 359 MB of PNGs, under the Hobby 100 MB CLI upload limit.
- `server/capture-thumbnail.mjs`: `display` preset and `cachedCaptureEncoding` alongside the thumbnail preset (shared disk cache).
- `scripts/build-vercel.mjs`: local builds default to the static gallery (no `publish:gallery`, no Blob manifest function, archived prototype images routed to the same static files); `MITWERK_GALLERY_SOURCE=blob` or Vercel Git builds keep the Blob path.
- `server/blob-gallery.mjs`: legacy filename routes split into `legacyGalleryRoutes` so both modes share them.
- `scripts/verify-gallery.ts`: verifies static deployments against the hashes recorded at packaging.
- `vercel.json`: `git.deploymentEnabled: false`, so pushes no longer start Blob-dependent Git builds.
- `tests/static-gallery.test.ts` (new). `AGENTS.md`: deploy rule.

- Deployed the static build to production (`vercel deploy --prebuilt --prod`, deployment `verso-82q353a2m`): live `/gallery/manifest.json` serves 580 frames; `verify:gallery --published` matched all 1257 image hashes, 67 archived prototype image routes and 4 legacy filename links.

## 2026-10-22 · prompt #575 uncounted · Allow GitHub pushes; keep the live site frozen

- `.githooks/pre-push` (reinstalled): removed the push block, so `git push` works again (LFS upload and push capture as before; captures still skip Blob).
- `package.json`: `deploy:vercel` now needs `MITWERK_ALLOW_DEPLOY=1` (was `MITWERK_ALLOW_PUSH`), so new prompts and pushes reach the live site only on an explicit deploy. With `vercel.json` `git.deploymentEnabled: false`, pushes do not start Vercel builds.
- `AGENTS.md`: rule updated.

