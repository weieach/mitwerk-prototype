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

## 2026-10-18 · prompt #432 · Clickable outside-range hint and darker overview

- `src/features/iteration-gallery/PlaybackTimeline.tsx`, `timeline.ts`, `gallery.css`: make the range hint clickable with native keyboard support, align the first enabled block without seeking, and derive minimal trailing room for exact alignment. Preserve hover transfer to the hint and existing scroller behavior.
- `src/control-tokens.css`: use the existing darker `--faint` token for the overview thumb.
- `tests/timeline.test.ts`: cover first-enabled positioning, trailing space, fitting timelines and empty/disabled ranges. Shared rules, full prompt log and progress capture record the request. Annotation references were supplied inline without local file paths.

## 2026-10-18 · prompt #433 — sky backdrop for Live server

- `src/assets/sky-bg.jpg` (new): 1600px, 184 KB copy of the root `sky bg.jpeg` (2975px, 1.2 MB). The image is heavily blurred, so the smaller copy costs nothing visually.
- `src/features/iteration-gallery/tokens.ts`: `liveBackdrop` token (blur 40px, scrim `rgb(0 0 0 / .22)`).
- `src/features/iteration-gallery/IterationGallery.tsx`: `gallery-runtime-live` class and a `.gallery-live-backdrop` layer rendered only in Live server mode.
- `src/features/iteration-gallery/gallery.css`: backdrop at `z-index:-1` inside the isolated gallery (under the panel header and the live frame), fade in/out on the runtime timings; the dark scrims are dropped in live mode, and the covered frame actions, metadata, transport, timeline and footer fade out. The theater entrance animation is disabled while hidden, because its forward fill otherwise pins them at full opacity.
- `scripts/screenshot-progress.mjs`, `AGENTS.md`: new `c live server` capture cue (Chat + Playback with Live server running).
- `docs/design-system-rules.md`: Live server backdrop rule.
- Counter set to prompt #433 at the user's request (#432 left unused).

## 2026-10-18 · prompt #434 — timeline contrast, desktop-scaled runtime, click-outside exit

- `src/control-tokens.css`, `src/features/iteration-gallery/gallery.css`: `--timeline-block-border` (= scroller thumb) for timeline block borders and `--timeline-ruler` (45% of it into `--line-strong`) for prompt ruler ticks.
- `src/features/iteration-gallery/EmbeddedPrototype.tsx`, `tokens.ts`, `gallery.css`: runtime iframe lays out at `theater.runtimeViewportWidth` (1440px) and is scaled down to the frame with `--runtime-scale` (ResizeObserver; never scales up). Applies to Live server and saved prototypes.
- `src/features/iteration-gallery/IterationGallery.tsx`: clicking the surround outside the frame, exit button and panel header requests the existing exit (negative `liveRequestKey`).
- `gallery.css`: exit action has no background/border (hover dims to .72); `tokens.ts`: live sky scrim .22 → .32.
- `docs/design-system-rules.md`: rules for the above.
- Counter set to prompt #434 at the user's request.

## 2026-10-18 · prompt #435 — sky backdrop for saved prototypes too

- `src/features/iteration-gallery/IterationGallery.tsx`, `tokens.ts`, `gallery.css`: the sky backdrop now renders for any runtime mode (Live server and Enter prototype). Renamed `liveBackdrop` → `runtimeBackdrop`, `.gallery-live-backdrop` → `.gallery-runtime-backdrop`, and dropped the `gallery-runtime-live` class. Removed the retired dark runtime scrim (`--runtime-surround-scrim`, theater/footer pseudo-element scrims, footer blur, `runtime-scrim-out`).
- `scripts/screenshot-progress.mjs`, `AGENTS.md`: `c prototype` capture cue (same as `c prototype embed`).
- `docs/design-system-rules.md`: backdrop rule now covers both runtime modes.

## 2026-10-18 · prompt #435 uncounted · Inspect runtime sky scrim

- `docs/prompt-log.md`: recorded the uncounted inspection request. Read runtime backdrop tokens and CSS; no application changes or progress capture.

## 2026-10-18 · prompt #436 — range-recovery end, block border, push-gap hover

- `src/features/iteration-gallery/timeline.ts`, `PlaybackTimeline.tsx`, `gallery.css`, `tests/timeline.test.ts`: the out-of-range click now scrolls to `min(first enabled block, end of timeline)`. The trailing `.timeline-range-tail` spacer is removed, so short ranges show the timeline's end instead of left-aligning their first block.
- `src/control-tokens.css`: `--timeline-block-border` is now 75% thumb into `--line-strong` (slightly darker); the ruler stays derived from it.
- `PlaybackTimeline.tsx`, `gallery.css`: push-gap hover was transparent because the inline `--timeline-push-hover: var(--timeline-push-hover)` referenced itself. It is now passed through `--timeline-push-hover-background`, so the gap lights up (`#4b4b4b` dark / `#c4c4c4` light).
- `docs/design-system-rules.md`: range-recovery and timeline rules updated.

## 2026-10-18 · prompt #437 · Fitted runtime stage and saved prototype navigation

- `src/features/iteration-gallery/gallery.css`, `TheaterView.tsx`: remove hidden control rows from runtime stage flow; add white version label and previous/next triangles above the frame, saved-prototype mode only. Preserve prototype mode while changing saved versions and remount each iframe's loading state.
- `runtime-targets.ts`, `tests/runtime-targets.test.ts`: derive adjacent versions from deduplicated push captures and test ordering, missing versions and boundaries.
- `usePrototype.ts`: associate availability/results with their push number so navigation cannot reuse a stale prototype's availability or URL. `IterationGallery.tsx`: exclude version controls from click-outside exit.
- `scripts/screenshot-progress.mjs`, `AGENTS.md`: support explicit Chat + prototype capture cue. Shared rules and prompt log record the behavior. Annotation references supplied inline without local source paths.

## 2026-10-18 · prompt #438 — timeline follows a gallery frame click; darker scroll thumb

- `src/features/iteration-gallery/IterationGallery.tsx`: clicking a frame in the gallery (`open`) now bumps `navigationKey`, like the Playback switch already did.
- `src/features/iteration-gallery/TheaterView.tsx`, `PlaybackTimeline.tsx`: the timeline receives `active` and runs its playhead-into-view smooth scroll once Playback is active, so the scroll animates after the gallery turn instead of finishing unseen.
- `src/control-tokens.css`: derivation flipped. `--timeline-block-border` now comes from `--faint` (same value as before), and `--timeline-overview-thumb` is 60% of the block border into `--line-strong`, a darker gray than the border.
- `docs/design-system-rules.md`: timeline rules updated.
- Counter set to prompt #438 at the user's request (#437 left unused).

## 2026-10-18 · prompt #442 · Balanced runtime spacing and frame shadow

- `src/features/iteration-gallery/TheaterView.tsx`, `gallery.css`: replace runtime centering with a bottom position derived from the exit control, balancing the gaps above and below Exit. Preserve its token-action height and proportional frame fitting on short screens.
- `tokens.ts`: add a broad, low-opacity light-gray shadow through the shared theater-frame shadow token, covering both playback images and running prototypes.
- `docs/design-system-rules.md`: record the updated spacing rule and shared shadow. Browser annotation images were supplied inline without local source paths.
- `scripts/screenshot-progress.mjs`: add `--gallery-view live` to capture the annotated runtime state without modifying the verbatim prompt log.
- Validation: TypeScript passes. Browser checks at 1876×1333, 1440×1000 and 1440×813 confirm equal 130px gaps around Exit, preserved token-action alignment and proportional fitting; Live server and saved prototypes agree. Visually checked the diffuse shadow in ordinary Playback.

## 2026-10-18 · prompt #441 · Runtime alignment and controls

- `src/features/iteration-gallery/IterationGallery.tsx`, `gallery.css`: center runtime frames in the area below the header, with measured footer clearance. Remove hidden playback rows from layout, align Exit with the token-usage action's shared positioning, and prevent surround clicks from exiting saved prototypes.
- `tokens.ts`, `gallery.css`: viewport-relative sky blur (40px at 1875px), 45%-white version-tag border and slightly wider control spacing. Shared rules updated. Annotation images supplied inline without local source paths.
- `scripts/screenshot-progress.mjs`: support `--gallery-view prototype` to capture this state without altering the verbatim prompt log.
- `TheaterView.tsx`: fit runtime frame width and height proportionally inside symmetric clearance above the exit row; avoid overlap in short viewports while preserving centering.
- Validation: TypeScript passes; browser checks at 1876×1333 and 1440×1000 confirm centering, exact exit/token alignment, blur scaling, translucent border, surround-click persistence and explicit exit.

## 2026-10-18 · prompt #440 · Centered, masked prototype version label

- `src/features/iteration-gallery/TheaterView.tsx`, `gallery.css`: place the saved-prototype version tag between the triangles; slide the entire tag vertically inside a mask. Preserve the active animation during repeated selections while updating its text. Allow navigation during loading and resolve the most recently requested version; respect reduced motion.
- `docs/design-system-rules.md`: record shared navigation/motion behavior. Requested #439 was saved by another concurrent chat during verification, so preserve that capture and use #440 for Chat + prototype. The annotation screenshot was supplied inline without a local source path.
- Validation: TypeScript and both runtime-target tests pass. Browser checks confirm label order, identical running animation across rapid switches, fresh reveal after completion, reduced motion, latest target loading and absence of these controls in Live server.

## 2026-10-18 · prompt #439 — gallery zoom kept across Playback; Gallery tab in server mode

- `src/features/iteration-gallery/AlbumScene.ts`: the reverse turn restores the pose saved by the forward turn and skips `applyResetCamera`/`reset(true)` when one exists (Reset view stays the fallback). `focusFrame` now pans without folding zoom into span (`animateCamera` takes `destinationZoom`), so the zoom readout survives too.
- `src/components/PanelViewSwitch.tsx`: the runtime `action` only replaces the Playback option; Gallery is no longer disabled in server mode.
- `src/features/iteration-gallery/IterationGallery.tsx`: Gallery in server mode sends the runtime exit request and starts the return at the same time.
- `src/features/iteration-gallery/TheaterView.tsx`: runtime exit requests are honored while Playback is inactive (turning back), and are a no-op without a runtime.
- `docs/design-system-rules.md`: rules for both.
- Not changed: the Playback tab already animated the gallery→Playback turn in every case tested (fresh load, immediately after load, after a round trip); waiting on reproduction steps.

## 2026-10-18 · prompt #443 — lighter sky scrim

- `src/features/iteration-gallery/tokens.ts`: `runtimeBackdrop.scrim` .32 → .2 (less darkening on the server-mode sky).
- `docs/design-system-rules.md`: backdrop rule value updated.
- Counter set to prompt #443 at the user's request (#442 left unused).

## 2026-10-18 · prompt #445 · Frame-relative shadow and bounded prompt captions

- `src/features/iteration-gallery/tokens.ts`, `gallery.css`: reduce shadow opacity from 16% to 9.6%; use 15cqw against the frame stage so blur scales with the displayed container instead of the viewport.
- `TheaterView.tsx`, `gallery.css`: reserve a responsive caption height (14% of body height, up to 112px), independent of text length. Crop excess prompt text while preserving metadata rows and frame position.
- `docs/design-system-rules.md`: record shared rules. Saved the provided screenshot in `visual_ref/` under prompt #445.
- Validation: TypeScript passes. Browser checks at 1876×1333, 1440×900 and 1000×700 verify identical frame top/height for short versus very long captions, clipped overflow, 9.6% shadow opacity and blur exactly 15% of frame-container width.

## 2026-10-18 · prompt #444 · Broader frame shadow and slightly clearer sky

- `src/features/iteration-gallery/tokens.ts`: double the shared frame shadow blur to `clamp(96px, 10vw, 224px)`; reduce viewport-relative sky blur by 15%, from 40px to 34px at 1875px. Preserve shadow spread/opacity and the current sky scrim.
- `docs/design-system-rules.md`: update shared blur specifications. Capture Chat + Playback as requested.

## 2026-10-18 · prompt #446 · Quieter shadow and readable reference pills

- `src/features/iteration-gallery/tokens.ts`: reduce shadow opacity 70% from 9.6% to 2.88%, and use the requested 20vw blur radius.
- `src/control-tokens.css`, `src/features/iteration-gallery/gallery.css`: shared reference-pill fill, radius and ink tokens; Playback reference text/icons match prompt size and version-label ink, with stronger fill and rounded ends.
- `docs/design-system-rules.md`: update shadow and reference-pill rules. Annotation screenshot supplied inline without a local path.
- Validation: browser-computed chip text/icon sizes match the Playback summary typography token exactly, colors match the version tag, pill radius/fill and reference link are intact, and shadow blur/alpha resolve to 20vw and 2.88%. TypeScript passes.


## 2026-10-18 · prompt #450 · Idea stream heading height

- `src/features/workbench/workspace-layout.css`: Idea stream’s header and title row use the shared 44px `--panel-heading-height`, matching the Chat panel header.
- `docs/design-system-rules.md`: include Idea stream in the shared heading-height rule.

## 2026-10-18 · prompt #448 · 100% work-state hint

- `src/features/workbench/WorkStateSimulator.tsx`: at 100%, the moment label says “Drag to simulate an earlier state of this project” instead of “Current workspace”. Dates and “Empty project” stay for earlier states.
- `docs/design-system-rules.md`: record that shared label. Capture is home with the simulator, and the prompt’s “at 100%” sets the slider there.

## 2026-10-18 · prompt #447 · Reference links and timeline grouping

- `src/index.css`: remove reference-chip name underlines; darken shared dark chrome from #141414 to #101010.
- `src/features/iteration-gallery/{timeline.ts,PlaybackTimeline.tsx,gallery.css,tokens.ts}`: derive contiguous disabled regions, render one shared outline using the regular block border, and remove obsolete individual disabled-border opacity. Preserve timeline interactions.
- `tests/timeline.test.ts`: cover merged disabled groups, separated groups, empty, fully enabled and fully disabled sequences.
- `docs/design-system-rules.md`: record shared rules; capture Chat + Playback as requested.
- Validation: TypeScript and all 14 timeline tests pass. Browser checks confirm no underline, #101010 outer background with #181818 panels, and one correctly sized disabled-region border matching enabled blocks. Saved Chat + Playback capture #447.

## 2026-10-18 · prompt #451 · Thinner to-do stations and milestone jump width

- `src/features/version-tree/tokens.ts`, `VersionTreePanel.tsx`, `src/index.css`: square to-do stations use a shared 2px route-colored border, thinner than the circular station ring. The canvas outline stays 3px.
- `src/control-tokens.css`, `src/features/workbench/workspace-layout.css`: the Idea stream footer navigation row is space-between, the milestone button group sits at the right, and the jump label maxes at `--idea-jump-max-width` (300px).
- `docs/design-system-rules.md`: record both shared rules.

## 2026-10-18 · prompt #449 — per-theme accent palettes (light branch + light milestone gradient)

- `src/shared/palette.ts`: `featurePalettes.dark` (existing values) and `featurePalettes.light` (≈12 points darker, +8% saturation). `featurePalette` now holds `var(--mw-*)` references; a generated stylesheet keys `--mw-*`, `--milestone-invite-<accent>` stops and `--milestone-invite-ink` to `data-theme` (light gradient = 72% accent over white with dark ink; dark unchanged).
- `src/features/workbench/milestone-invite.ts`: gradient built from the per-theme stop variables.
- `src/control-tokens.css`: removed the fixed `--milestone-invite-ink` (now per theme); `--milestone-control-ink/-border/-hover` derive from it, so the arrow and Not yet controls turn dark on the light gradient (dark mode unchanged).
- `src/features/version-tree/tokens.ts`: `palerAccent` blends `var(--mw-*)` references with `color-mix`.
- `src/features/annotations/appearance.ts`, `src/features/iteration-gallery/AlbumScene.ts`: bookmark colors resolve the reference before canvas/WebGL painting.
- `src/design-system/SystemPage.tsx`: lists the real accent and gradient tokens (replacing nonexistent `--milestone-invite-a/b/c`).
- `tests/palette.test.ts` (new), `tests/presentation.test.ts`: palette expectations (this also fixes the long-failing route-palette assertion).
- `scripts/screenshot-progress.mjs`, `AGENTS.md`: `c light mode` capture cue.
- `docs/design-system-rules.md`: per-theme palette rules.
