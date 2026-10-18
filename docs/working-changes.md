# Working changes

Changes that are made but not yet committed. The user decides when to commit and push. Remove an entry once it is committed.

## 2026-10-18 · prompt "I want to make my frame captures available through github repo too" (number pending: prompt log already holds #371–#419)

- `[frame capture] screenshots/.gitattributes` (new): routes the folder's `*.png` and `*.gif` to Git LFS so captures can live on GitHub without bloating Git history.
- `.gitignore`: stops ignoring `[frame capture] screenshots/`; still ignores the capture script's state files there (`.capture.log`, locks, `.last-*`). The folder's 404 PNGs + 1 GIF (252 MB) are now untracked, ready to commit.
- `.githooks/pre-push` (installed to `.git/hooks/pre-push`): reads the pushed refs once, runs `git lfs pre-push` with them (or `git lfs push <remote> HEAD` when stdin is empty), then runs the existing push capture. Fails with an install hint if `git-lfs` is missing.
- `server/gallery-catalog.ts`: the "No saved frames" build error now points to `git lfs pull` / `MITWERK_GALLERY_SOURCE=blob` instead of saying captures are Git-ignored.
- `README.md`: new "Saved frames in Git (LFS)" section (clone setup, quota, Vercel note); removed the statement that Git excludes captures.

## 2026-10-18 · prompt #370 uncounted · Chat width inquiry

- `docs/prompt-log.md`: recorded the user's width question verbatim as uncounted. Inspected the existing 440px/35vw chat width rule; no application changes or capture.

## 2026-10-18 · prompt #420 · Brighter blue and resizable Chat

- `src/index.css`, `src/features/workbench/workbench.css`: brighten theme blue via shared dark/light tokens.
- `src/features/workbench/useChatPanelWidth.ts` (new), `Workbench.tsx`, `workspace-layout.css`: widen Chat to 560px and restore pointer/keyboard resizing with responsive 320px–760px bounds, capped at 55% of available width.
- `docs/design-system.md`, `docs/design-system-rules.md`: record the new canonical blue and sizing rules. `docs/prompt-log.md` and the progress capture record the request; #420 avoids existing prompt log entries through #419.

## 2026-10-18 · prompt #421 · Compact cards and consistent controls

- `src/features/workbench/useChatPanelWidth.ts`, `workspace-layout.css`, `src/control-tokens.css`: 500px default Chat, stacked version cards below 480px, shared dropdown spacing and 12px model text.
- `src/features/iteration-gallery/gallery.css`: more padding for prompt hover labels.
- `src/features/version-tree/IdeaCard.tsx`, `VersionTreePanel.tsx`, `src/index.css`: prompt counts beside WIP actions and to-do stations sized like circular stations.
- `docs/design-system.md`, `docs/design-system-rules.md`: record the shared layout and sizing rules. Prompt log and capture record this request.
- `scripts/screenshot-progress.mjs`: when capturing a milestone invitation, scroll its card into view so a taller stacked card is visible above the composer.

## 2026-10-18 · prompt #422 · Node borders, card covers and prompt headings

- `src/index.css`, `src/features/version-tree/IdeaCard.tsx`: use shared station border and outline geometry for square to-do nodes; preserve completion checks.
- `src/control-tokens.css`, `src/features/workbench/workspace-layout.css`: consistent 8:5 covers, image above invitation buttons, and card fade during divider dragging.
- `src/features/iteration-gallery/AlbumView.tsx`: centered capture-number heading above prompt summaries.
- `docs/design-system-rules.md`: record shared geometry, cover, motion and label rules. Prompt log and capture record this request.

## 2026-10-18 · prompt #423 · Feature colors and responsive card states

- `src/components/PanelIcon.tsx` (new), `PanelHeader.tsx`, `AdaptivePanelTitle.tsx`, `src/features/workbench/Workbench.tsx`, `src/features/iteration-gallery/TheaterView.tsx`, `workspace-layout.css`: shared feature accents on active navigation and panel icons; neutral active fills.
- `src/features/workbench/useFirstPanelEntry.ts` (new): once-per-session panel entry animation with reduced-motion support.
- `src/control-tokens.css`, `workspace-layout.css`, `MessageOutput.tsx`: shallower cover ratio, 90px wide/medium layouts, and a real-size gray placeholder during resizing followed by a settled cross-fade.
- `docs/design-system-rules.md`: record shared feature and responsive rules; prompt log and capture record the request.

## 2026-10-18 · prompt #424 · Prompt labels and invitation motion polish

- `src/control-tokens.css`, `src/features/iteration-gallery/gallery.css`: shared placeholder tone, 4px prompt-heading gap, finer grain and resize-gradient tokens.
- `src/features/workbench/workspace-layout.css`: continuous gradient border, flowing gray resize placeholder, finer stacked grain, full-card physics scene and compact bottom band at 400px Chat width.
- `src/features/workbench/MilestoneInvitationControls.tsx`, `invitation-physics.ts`, `tests/invitation-physics.test.ts`: derive hidden release poses from actual image bounds; verify covered starts and paired landings at narrow, medium and wide sizes.
- `docs/design-system-rules.md`: record shared refinements. Prompt log and capture record the request.

## 2026-10-18 · prompt #425 · Laptop defaults and exclusive reader subpanels

- `scripts/screenshot-progress.mjs`: recognize a ready Idea stream when the responsive reader displays it alone.
- `src/features/workbench/workspace-layout.css`: pink Idea stream accent and lighter-opacity neutral active fills.
- `src/features/workbench/workspace-responsive.ts`, `useWorkspaceViewport.ts` (new), `useChatPanelWidth.ts`: shared 1512px viewport policy, Mavix's 440px/35vw default, root-size state and preserved manual resizing.
- `src/control-tokens.css`, `src/shared/type-studio.ts`: 15px root below the laptop reference and root-relative default text sizes; explicit typography overrides stay in pixels.
- `src/features/workbench/Workbench.tsx`, `src/ReadingWorkspace.tsx`: one reader subpanel beside Chat on smaller screens, synchronized navigation state, and mutual exclusion of Idea stream and Live server.
- `visual_ref/[prompt #425] Screenshot 2026-10-18 at 08.36.24.png`: saved supplied reference. Design docs, prompt log and capture record the policy and request.

## 2026-10-18 · prompt #426 · Proportional cards and milestone controls

- `src/features/workbench/MessageOutput.tsx`, `workspace-layout.css`: default arrow centered in the label row, viewport-ratio horizontal breakpoint (550/1876, with a 400px usability floor), compact invitation leading/gap, and neutral card border during resize.
- `src/control-tokens.css`, `src/features/workbench/MilestoneInvitationControls.tsx`: viewport-scaled button geometry and arrow glyph; remeasure physics when control sizes change, and reserve copy space from actual resting geometry without enlarging Not yet text.
- `docs/design-system-rules.md`: record the reusable sizing and resize rules. Prompt log and capture record this request. The annotation image was supplied inline without a local source path.

## 2026-10-18 · prompt #427 · Brighter palette, stable invitations and date guides

- `src/shared/palette.ts` (new), `src/main.tsx`, `src/features/workbench/workbench.css`, `src/features/version-tree/tokens.ts`: single brighter non-blue palette used by UI accents, routes and gradients; blue preserved.
- `src/features/workbench/MessageOutput.tsx`, `MilestoneInvitationControls.tsx`, `milestone-invite.ts`, `workspace-layout.css`, `src/control-tokens.css`: wider horizontal threshold, content-sized default lower band, animated height changes, and decoded-cover/settled-layout gating for falling controls.
- `src/features/iteration-gallery/AlbumScene.ts`, `axis-label-layout.ts`: standing date/version guides follow the same replacement slots as their labels, including overhead copies and hover reset.
- `visual_ref/[prompt #427] Screenshot 2026-10-18 at 08.54.54.png`, `visual_ref/[prompt #427] Screenshot 2026-10-18 at 08.56.02.png`: saved supplied references. Annotation image supplied inline without a local source path. Shared rules, prompt log and capture record the request.

## 2026-10-18 · prompt #428 · Annotation type and invitation completion feedback

- `src/features/annotations/FrameAnnotations.tsx`, `annotations.css`: synchronize new-overlay title/accessibility label with the selected kind; reuse the optional commit control beside save when Milestone is selected.
- `src/features/workbench/MessageOutput.tsx`, `workspace-layout.css`, `src/features/version-tree/MilestoneControls.tsx`: reset invitation on opening, preserve the height transition, and show a store-backed gradient check with an immediate scale pop after a successful milestone save. Initial saved state does not replay the pop; reduced motion is respected.
- `docs/design-system-rules.md`: record reusable behavior. Prompt log and progress capture record this request. Annotation screenshots were supplied inline without local source paths.

## 2026-10-18 · prompt #429 · Reload-scoped milestones and outline-only edit action

- `src/shared/reset-prototype-milestones.ts`, `src/main.tsx`, `src/features/annotations/model.ts`, `store.ts`: reset browser-created milestone data before app stores initialize, including existing persisted milestones and their annotation copies. Preserve other annotation types and built-in milestone seeds; share the annotation storage key.
- `src/features/version-tree/MilestoneControls.tsx`, `src/features/workbench/workspace-layout.css`, `src/control-tokens.css`: explicit editing state uses no fill and a darker semantic border, retaining saved-check feedback.
- `tests/annotations.test.ts`: verify selective reset, unrelated data preservation and idempotence. Shared rules, full prompt log and progress capture record the change; annotation reference supplied inline without a local file path.

## 2026-10-18 · prompt #430 · Panel-matched navigation and milestone status

- `src/features/workbench/workspace-layout.css`: active navigation fill uses the same panel surface token in both themes and on hover; saved milestone label uses muted text.
- `src/features/version-tree/MilestoneControls.tsx`: saved conversation milestone reads “Milestone added”, retaining its gradient check and click-to-edit handler, with an Edit milestone tooltip.
- `docs/design-system-rules.md`: record shared navigation surface and status-action behavior. Prompt log and progress capture record the request. Annotation screenshot supplied inline without a local source path.

## 2026-10-18 · prompt #431 · Smaller checkbox stations and muted timeline scroller

- `src/features/version-tree/tokens.ts`, `VersionTreePanel.tsx`, `src/index.css`: reduce Idea stream checkbox station diameter to 80% of the circle diameter, preserving border/outline and centering while fitting the completed check.
- `src/control-tokens.css`: existing Playback overview thumb now uses the existing `--muted` gray token.
- `docs/design-system-rules.md`: record shared sizing/color rules; prompt log and progress capture record the request.
