# Working changes

Changes that are made but not yet committed. The user decides when to commit and push. Remove an entry once it is committed.

## 2026-10-18 · prompt #481 · Wider default Chat from 1600px

- `src/features/workbench/workspace-responsive.ts`: from 1600 CSS pixels, default Chat is 36vw instead of the 500px plateau or the previous 32vw above 1728px. Smaller widths stay on their existing defaults.
- `docs/design-system.md`, `docs/design-system-rules.md`: record the shared breakpoint and fraction.
- `tests/workspace-responsive.test.ts`: covers the 1512, 1599, 1600, 1875 and 2560 defaults.

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

## 2026-10-18 · prompt #481 · Wider default Chat from 1600px

- `src/features/workbench/workspace-responsive.ts`: from 1600 CSS pixels, default Chat is 36vw instead of the 500px plateau or the previous 32vw above 1728px. Smaller widths stay on their existing defaults.
- `docs/design-system.md`, `docs/design-system-rules.md`: record the shared breakpoint and fraction.

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


## 2026-10-18 · prompt #452 · Solid runtime background

- `src/features/iteration-gallery/{tokens.ts,IterationGallery.tsx,gallery.css}`: replace the sky image, blur and scrim with shared #818181 background for Live server and saved prototypes; retain backdrop fades.
- `docs/design-system-rules.md`: record the replacement rule. Capture Live server to show the updated runtime surface.
- Validation: TypeScript and whitespace checks pass; Live server progress capture #452 saved and visually checked.


## 2026-10-18 · prompt #453 · Darker design-system runtime gray

- `src/features/iteration-gallery/tokens.ts`: replace fixed #818181 with existing `--faint` (#646464 in dark mode), shared by Live server and saved prototypes.
- `docs/design-system-rules.md`: update the solid-backdrop rule. Preserve existing transitions. Browser annotation screenshot supplied inline without a local source path.
- Validation: TypeScript passes; prototype capture #453 saved and visually checked.


## 2026-10-18 · prompt #455 · Dark frame beds and scalable desktop Chat

- `src/features/iteration-gallery/{tokens.ts,gallery.css}`: share darker chrome gray across fitted frame beds, letterboxing and preview backgrounds.
- `src/features/workbench/{workspace-responsive.ts,useChatPanelWidth.ts}`: use 32vw default Chat width above 1728 CSS pixels and proportionally scale the maximum drag width; preserve smaller-screen defaults and explicit sizes.
- `docs/design-system-rules.md`: record shared responsive rules. Reserve #455 as requested and save the supplied visual reference.

## 2026-10-18 · prompt #454 — Controls menu, playback units, milestone chip, frame-width rows

- `src/features/iteration-gallery/TheaterView.tsx`: frame actions, metadata and the playback section follow the frame width on wide panels (centered); speed/loop replaced by the new Controls menu; Play unit shared with the jump chooser; autoplay by version/milestone (`unitPlaybackStep`); milestone text and branch color passed to the chip; unit, milestones and branches passed to the timeline.
- `src/features/iteration-gallery/PlaybackControls.tsx` (new): grouped Controls menu (Play / Speed / Loop).
- `src/components/SelectMenu.tsx`: optional section headings (`group`) and per-option `selected`; scroll-into-view by option id.
- `src/features/iteration-gallery/timeline.ts`: `JumpScale` adds `milestone`; `jumpScales`, `firstJumpIndex`, `unitPlaybackStep`; milestone-aware `adjacentTimelineIndex`.
- `src/features/iteration-gallery/PlaybackJump.tsx`: chooser offers prompt / version / milestone.
- `src/features/iteration-gallery/PlaybackTimeline.tsx`, `gallery.css`, `src/control-tokens.css`: unit highlighting (dimmed ruler, lit/branch-colored push nodes); menu section and compact Controls styles.
- `src/features/annotations/FrameAnnotations.tsx`, `src/features/workbench/workspace-layout.css`: milestone chip (trophy, truncated text, branch color) + "+" chip; `AnnotationOverlay` `startNew`.
- `src/features/version-tree/idea-stream.ts` (`versionMilestone`), `useSavedMilestones.ts` (new): shared live milestone lookup.
- `tests/timeline.test.ts`: milestone jumps, unit autoplay and milestone lookup.
- `visual_ref/[prompt #454] 1.png`: the user's screenshot (converted from WebP).
- `docs/design-system-rules.md`: rules for the above.
- Validation: TypeScript and diff checks pass. Browser checks at 1440, 1728, 1875 and 2560px confirm Chat widths of 440, 500, 600 and 819.2px, and #101010 frame beds. Saved Playback capture #455.

## 2026-10-18 · prompt #456 — Controls in columns, unit speeds, arrows follow the Play unit

- `src/components/SelectMenu.tsx`, `src/control-tokens.css`: `columns` layout (one column per group, arrow left/right between columns) and `align="end"`; content-sized menus measure their full box so the right edge matches the trigger.
- `src/features/iteration-gallery/PlaybackControls.tsx`: Controls opens as three right-aligned columns.
- `src/features/iteration-gallery/TheaterView.tsx`, `tokens.ts` (`unitSpeeds`): choosing a Play unit sets 2× (prompt/version) or 1× + Loop (milestone); the initial speed/loop follow the saved unit.
- `src/features/iteration-gallery/PlaybackJump.tsx`, `timeline.ts`: previous/next buttons lose their hover chooser and step by the Play unit (`jumpMenuDelayMs` removed).
- `src/control-tokens.css`: version-mode push nodes use the scroller thumb color.
- `docs/design-system-rules.md`: Controls/Play-unit rules revised.
- Counter set to prompt #456 at the user's request.


## 2026-10-18 · prompt #457 · Playback export and desktop controls

- `src/features/iteration-gallery/{PlaybackExport.tsx,IterationGallery.tsx,TheaterView.tsx}`: anchored header export confirmation with independent range, live frame count/current playback mode, primary Save, and sample-project toast.
- `src/components/Icon.tsx`: shared download glyph. `PlaybackControls.tsx`, `gallery.css`: muted speed/loop summary and doubled desktop control gap through `src/control-tokens.css` and `workspace-layout.css`; shared-token dialog styling.
- `scripts/screenshot-progress.mjs`: capture cues for export and control overlays; `docs/design-system-rules.md`: document behavior. Annotation images supplied inline without local source paths.
- Validation: TypeScript and diff checks pass. Browser checks confirm anchored positioning, both overlays open together, responsive gap/summary, live range/unit counts (15 recent versus 43 all-time version frames), and Save dismissal/toast. Capture #457 saved with both overlays; preserve concurrent #458 Controls changes.

## 2026-10-18 · prompt #458 — Controls menu: blue selection, stays open, fit-content columns; summary by row width

- `src/features/iteration-gallery/PlaybackControls.tsx`: no check icons; choices apply without closing the menu (outside click / Escape closes).
- `src/control-tokens.css`: selected options in `--feature-version` blue; 8px inline item padding; options start-aligned so columns fit their content.
- `src/features/iteration-gallery/gallery.css`: the Controls summary uses a `playback-row` container query (≥680px) instead of the ≥1728px viewport media query.
- `docs/design-system-rules.md`: Controls menu and summary rules updated.
- Counter set to prompt #458 at the user's request.


## 2026-10-18 · prompt #459 · Compact export confirmation

- `PlaybackExport.tsx`, `gallery.css`: remove visible Time range label; rename action Save MP4; place centered prompts/versions count below it with accurate eligible-item counts.
- `src/control-tokens.css`: apply the doubled responsive Controls/end-button gap below 1728px too.
- `docs/design-system-rules.md`: record shared rules. Confirmed both #457 and #458 capture files exist before reserving #459; inline annotation images have no local source path.
- Validation: TypeScript passes. Browser checks at 1669px confirm no visible range label, Save MP4, centered count below the action, prompt/version/milestone counts, 2× gap and the retained sample-project toast.


## 2026-10-18 · prompt #460 · Equal Controls menu columns

- `src/control-tokens.css`, `src/features/iteration-gallery/PlaybackControls.tsx`: equal menu columns, shared header/option height, and 8px trigger offset.
- `scripts/screenshot-progress.mjs`: recognize control panel capture cue and accept explicit viewport dimensions for requested multi-pane captures.
- `docs/design-system-rules.md`: document reusable menu sizing rules. Inline annotation images have no local source path.
- `src/components/SelectMenu.tsx`: observe anchor ancestors and menu sizing so the shared dropdown stays attached when panes or loaded frames change layout.
- Validation: TypeScript and diff checks pass. Browser verification at 1669×1333 confirms all columns are 115px, headers/options are 26.09px, the menu sits 8px above its trigger, and Controls plus milestone editing remain open together.


## 2026-10-18 · prompt #461 · Milestone playback overview

- `model.ts`, `IterationGallery.tsx`, `TheaterView.tsx`: default All time and change to All time on milestone-mode selection, including restored mode.
- `timeline.ts`, `PlaybackTimeline.tsx`, `gallery.css`: fit all version slots in milestone mode with animated layout and reduced-motion support.
- `MilestoneControls.tsx`, `src/index.css`: visible Milestone label; remove editor container border and padding.
- `tests/timeline.test.ts`, `tests/iteration-gallery.test.ts`: verify fit across panel widths and catalog sizes; remove superseded adaptive-range test. `scripts/screenshot-progress.mjs`: support milestone play mode capture cue.
- `docs/design-system-rules.md`: record shared rules. Inline browser annotations have no local image paths.
- Validation: TypeScript and 40 gallery/timeline tests pass. Browser checks confirm All time on entry and milestone selection, an intermediate animated width, all six milestone targets visible at 1669px and 1000px, restored scrolling in version mode, reduced-motion behavior, and the visible associated Milestone label with zero editor border/padding.


## 2026-10-18 · prompt #462 · Two milestones from the user's commits

- `src/features/version-tree/idea-stream.ts`: add automatic frame publication (eefeb1f, Idea stream V37 / capture version 36) and prototype navigation with consistent scaling/panel transitions (dbd64b2, Idea stream V42 / capture version 41). Both are authored by Nicole Wei <weiyichen2004@gmail.com>, matching local Git identity, and fall within the latest ten versions V36–V45.
- Seed the additions by stable capture identity so Idea stream and Playback resolve the same milestones despite display-label offsets. Preserve existing saved text and intentional deletions.
- `docs/design-system-rules.md`: document stable identity for new milestone seeds.
- Validation: confirmed both commit authors against local Git identity and both nodes against the actual latest-ten capture graph. Idea stream and Playback return identical milestone text; saved edits/deletions retain precedence. TypeScript and diff checks pass.


## 2026-10-18 · prompt #463 · Playback mode label and milestone chips

- `PlaybackControls.tsx`: prepend play mode to the existing muted responsive summary.
- `TheaterView.tsx`: render milestone and add chips for saved push frames with milestones, fixing their exclusion by the prompt-only annotation guard.
- `scripts/screenshot-progress.mjs`: accept “milestone mode” as well as “milestone play mode”. `docs/design-system-rules.md`: shared behavior documented. Inline annotations have no local image paths.
- Validation: TypeScript and diff checks pass. Browser verification confirms milestone text plus add chip on push #36, live summary updates for all play modes, and the add chip opening a blank annotation form.


## 2026-10-18 · prompt #464 · Milestone hover chip and text reveal

- `FrameAnnotations.tsx`, `TheaterView.tsx`: distinguish nonselected hover previews; measure the label for content-width expansion and masked selection reveal.
- `workspace-layout.css`: separate full-height trophy/label sections, branch trophy color, shared reference fill with white text, full opacity and reduced-motion-compatible transitions.
- `docs/design-system-rules.md`: record reusable chip rules. Inline annotations have no local source paths.
- Validation: TypeScript and diff checks pass. Browser checks verify equal 34px section heights, reference fill/white text, icon-only hover at full opacity (37px), and selection expansion to 297px with the masked vertical reveal.


## 2026-10-18 · prompt #465 · Milestone chip alignment

- `FrameAnnotations.tsx`, `workspace-layout.css`: enlarge the trophy from 13px to 16px with a shared milestone token; vertically center the text using flex alignment and a nested truncation span. Preserve the animated mask and hover collapse.
- `docs/design-system-rules.md`: document sizing/alignment. Inline annotation has no local source path.
- Validation: TypeScript/diff checks pass; browser measurement confirms a 16px trophy and zero vertical center offset for the label.


## 2026-10-18 · prompt #466 · Milestone color, width, and celebration

- `src/shared/palette.ts`, `src/control-tokens.css`: order gradient stops by adjacent hue and raise dark accent strength to 80% for clearer invitation colors.
- `FrameAnnotations.tsx`, new `MilestoneTrophy.tsx`, `annotations.css`: separate accessible trophy and annotation actions; add a small white/branch-color burst, trophy bounce, repeated-click cleanup, and reduced-motion handling.
- `workspace-layout.css`: replace the fixed label cap with half of the available action-row width, retaining full-height centered text and masked selection reveal.
- `docs/design-system-rules.md`: document shared behavior. Inline annotation images have no local source paths.
- Validation: TypeScript and diff checks pass. Chrome confirms exact 50% caps at 1669px/1280px viewports, mouse/Enter activation, 12 white/branch-colored particles with bounce, repeat-click cleanup, reduced-motion suppression, and separate text-to-annotations behavior.


## 2026-10-18 · prompt #467 · Confetti physics and darker invitation

- `src/control-tokens.css`: reduce dark gradient strength to 70% for white-control contrast while preserving clear adjacent hues.
- `MilestoneTrophy.tsx`, new `celebration.ts`, `annotations.css`: smaller particles follow gravity/drag trajectories with longer flight, tumble, and delayed fade; cancel animations on restart/unmount.
- `scripts/screenshot-progress.mjs`: support “c chat and playback w confetti” by activating the trophy and freezing particle animations midflight immediately before capture.
- `docs/design-system-rules.md`: record updated shared presentation. Inline reference images have no local source files.
- Validation: TypeScript, capture-script syntax, and diff checks pass. Chrome verifies 3 × 4.5px pieces, trajectories beyond 100px with gravity-driven descent, full opacity through 80%, mouse/keyboard activation, repeat cleanup, and reduced motion.

## 2026-10-18 · prompt #468 — chat gap, "Preparing your response", no-live-agent reply, gallery arrival demo

- `src/control-tokens.css`: `--message-output-gap` 1.5× → 0.75× row padding (bubble-to-reply 60px → 42px); `--run-progress-enter-ms`.
- `src/features/workbench/Workbench.tsx`, `workspace-layout.css`: loading row "Preparing your response" with a masked fade/slide-in; sample replies (plain and to-do linked) say the project isn't connected to a live agent; the newest reply prints via `PrintedText`, then dispatches `galleryDemoUpdateEvent`.
- `src/features/workbench/PrintedText.tsx`, `print-text.ts` (new): word-by-word printing that keeps the conversation pinned to the end.
- `src/shared/demo-events.ts` (new): the shared event name.
- `src/features/iteration-gallery/AlbumScene.ts`, `AlbumView.tsx`, `theater-transition.ts` (`GalleryCamera.arrive`), `IterationGallery.tsx`, `tokens.ts` (`arrival`): with the Gallery view open, the newest frame hides, then drops in from half its height above while fading in.
- `tests/palette.test.ts`: word-boundary printing test; gradient-stop test now order-independent (another session reordered the stops by adjacent hue).
- `docs/design-system-rules.md`: rules for the above.
- User asked for counter 467, but another session had already captured #467, so this prompt took #468.


## 2026-10-18 · prompt #469 · Denser, narrower confetti

- `src/features/annotations/celebration.ts`: increase pieces from 12 to 16 and reduce horizontal launch velocity by 28%; retain gravity, vertical travel, and delayed fade.
- `scripts/screenshot-progress.mjs`: allow an explicit `--confetti` capture flag for follow-up requests without a repeated capture cue.
- `docs/design-system-rules.md`: record the shared density/spread adjustment.
- Validation: TypeScript, capture-script syntax, and diff checks pass. Trajectory check confirms 16 pieces, a 28% horizontal velocity reduction, and unchanged full opacity through 80% of flight.

## 2026-10-18 · prompt #470 — rebrand MitWerk → verso; new Vercel URL

- User-facing brand text → "verso" (lowercase): `index.html` title, `BrandMenu.tsx`, `LandingPage.tsx`, `Workbench.tsx` (sidebar wordmark now live text instead of `mitwerk-logo.png`; settings copy), `SystemPage.tsx`, `type-studio.ts`, `server/standalone.mjs`, sample project content in `src/features/workbench/model.ts`.
- `model.ts`: `sampleProjectName`; saved "MitWerk product prototype" names and the old default instructions migrate to verso on load (custom text kept). Test added in `tests/workbench.test.ts`.
- `src/features/workbench/workbench.css`: `.workspace-wordmark` style.
- `scripts/screenshot-progress.mjs`: brand-menu selector uses the new "verso menu" label.
- Docs: titles in README/PRODUCT/DESIGN/docs/design-system.md, README brand note and live URL, `AGENTS.md` brand rule, `docs/design-system-rules.md`.
- `package.json`: deploy verification now checks https://verso-prototype.vercel.app.
- Vercel (not a file change): added domain `verso-prototype.vercel.app` to project `mitwerk-prototype` (`verso.vercel.app` is taken by someone else). The old URL still works. It serves the current production build until the next `npm run deploy:vercel`.
- Unchanged on purpose: internal identifiers, the unused `src/assets/mitwerk-logo.png`, the symbol mark, "Mit" agent naming, the GitHub repo and Vercel project names, historical docs.

## 2026-10-18 · prompt #471 — push names from Git commits; clamped captions with full-text tooltip

- `server/git-history.ts`: `commitMessageText` (drops trailers) and `readPushMessages` (one `git log --all` read; recorded SHA used only if its subject matches the capture summary, else matched by subject nearest before the capture time).
- `server/gallery-catalog.ts`, `src/features/iteration-gallery/model.ts`: push frames carry `commitMessage` (all 43 pushes resolve).
- `src/features/iteration-gallery/theater-layout.ts`, `AlbumView.tsx`: push captions and gallery hover labels use the commit message.
- `src/features/iteration-gallery/TheaterCaption.tsx` (new), `TheaterView.tsx`, `gallery.css`: captions clamp to 2 lines with "…" (no longer collapse to 0px) and show a full-text tooltip on hover/focus when truncated.
- `src/features/iteration-gallery/tokens.ts`: caption area share 14% → 26% of the body height (still capped at 112px) so the version row, 2-line caption, branch row and reference chips fit; on short windows the frame is slightly smaller.
- `data/push-shas.json`: corrected pushes #38–#41, which pointed at other commits (#38 a0555fa1, #39 2017e216, #40 9d2b89e5, #41 dbd64b23); Enter prototype for those pushes now loads the right code.
- `tests/prototype-service.test.ts`: trailer stripping.
- `docs/design-system-rules.md`: rules for the above.

## 2026-10-18 · prompt #472 — milestones, logo menu, favicon

- `src/features/version-tree/idea-stream.ts`: seeded milestones — v36 "Constructed a Vercel Blob pipeline for dynamically updating frame storage", v41 "Implemented immersive live server view with new background", new v44 (push #44, the verso rename) "Finalized brand name & concept!". Browser milestones reset on each load, so these defaults are what everyone sees.
- `src/features/workbench/BrandMenu.tsx`: Type editor removed from the logo menu.
- `public/favicon.svg` (new), `index.html`: favicon from the logo symbol, adapting to light/dark browser themes.
- `docs/design-system-rules.md`: favicon and logo-menu rules.

## 2026-10-18 · prompt #473 — splash screen buttons and intro

- `src/features/workbench/LandingPage.tsx`, `workspace-layout.css`: "Open sample project" (`.mw-button.primary`) and new "View new project" (`.mw-button`) stacked at equal width; splash-only button fills/lines removed.
- `src/shared/work-state.ts`: `setStartingWorkState` — the sample opens at 100%, the new project at 0% (session-saved; simulator panel stays hidden).
- `src/features/workbench/landing-impact.ts`, `tests/landing-impact.test.ts`: removed the release burst out of the logo; the loop starts when the pile lands.
- `scripts/screenshot-progress.mjs`: `--gallery-view landing` capture option.
- `docs/design-system-rules.md`: splash rules.

## 2026-10-18 · prompt #474 — logomark proportions

- `src/components/LogomarkSymbol.tsx` (new): shared tight inline SVG of the verso shape (text color), used by the header and splash.
- `src/control-tokens.css`: `--logomark-gap` (.613em) and `--logomark-symbol-height` (1.173em), `.logomark` / `.logomark-symbol`; removed the unused `--workspace-brand-gap`.
- `src/features/workbench/BrandMenu.tsx`, `LandingPage.tsx`, `workspace-layout.css`: both logomarks use the shared symbol and em-based gap/height (removed `--landing-symbol-height`, the fixed 22px gap, the header image and its light-mode invert).
- `src/shared/type-studio.ts`: header name (`brand` role) 14px → 16px.
- `docs/design-system-rules.md`: logomark rule.

## 2026-10-18 · prompt #475 — splash colors, white logomark, primary hover

- `src/features/workbench/LandingPage.tsx`: second button reads "New project (view-only)".
- `src/features/workbench/workspace-layout.css`, `landing-stage.ts`: splash stage = panel color (`--paper`), scrim = panel color at 76%, quads = `--ink` light gray; the glow is built from the quad color at `--landing-frame-glow-alpha`.
- `src/control-tokens.css`, `src/shared/type-studio.ts`: `--logomark-ink` (white in dark mode, ink in light) for the shape and the header name.
- `src/features/workbench/workbench.css`, `control-tokens.css`: design-system primary hover uses `--mw-accent-hover` (fill eased 14% toward the page) instead of muted gray — applies to every primary button.
- `docs/design-system-rules.md`: rules updated.

## 2026-10-18 · prompt #476 — milestone / to-do fields are single-line inputs

- `src/features/version-tree/MilestoneControls.tsx`, `src/features/annotations/FrameAnnotations.tsx` (`.annotation-text`), `src/features/workbench/EditableTodoText.tsx`, `Workbench.tsx` (Edit to-do dialog): `<textarea>` → `<input type="text">`.
- `src/index.css`, `src/features/annotations/annotations.css`, `src/features/workbench/workspace-layout.css`, `workbench-system.css`: styles target the inputs at the shared control height; resize grips and textarea-only heights / `field-sizing` removed.
- `scripts/screenshot-progress.mjs`: capture readiness checks look for the inputs.
- `docs/design-system-rules.md`: field rule.


## 2026-10-18 · prompt #477 · Milestone editor layout and commit eligibility

- `src/index.css`, `annotations.css`: left-align milestone actions, strengthen inline milestone borders, and give annotation inputs a contrast underline with no inline padding; focused state stays underline-only.
- `annotation-context.ts`, `IterationGallery.tsx`, `FrameAnnotations.tsx`: derive latest prompt identity from full displayed history and gate the optional commit checkbox; explicitly allow the chat version-card milestone route.
- `docs/design-system-rules.md`: document shared rules. Inline annotation images have no local source paths.
- `scripts/screenshot-progress.mjs`: add explicit milestone-editor and annotation-kind capture flags to record both edited surfaces without changing the logged request.
- Validation: TypeScript, script syntax, and diff checks pass. Chrome verifies historical/latest/chat-card checkbox eligibility, left-aligned actions, the stronger inline border, and a white bottom-only annotation border with zero inline padding.


## 2026-10-18 · prompt #479 · Shared thin editing underlines

- `src/shared/edit-fields.css`, `src/main.tsx`: apply a shared 0.5px inset hairline to annotation, Idea stream milestone, and to-do editing fields; remove full borders/inline padding and avoid doubling the line on focus.
- `docs/design-system-rules.md`: record the superseding field rule. The requested #478 was taken by a concurrent logomark capture before this capture ran; use #479 without overwriting it. Inline annotation image has no local source path.

## 2026-10-18 · prompt #478 — single logomark SVG

- `src/assets/verso-logomark.svg` (new): the user's `final-logomark.svg` with `currentColor` fills and `data-logomark-shape` / `data-logomark-name` hooks. The root file is left in place.
- `src/components/Logomark.tsx` (new; replaces `LogomarkSymbol.tsx`): renders the SVG; used by `BrandMenu.tsx` (header) and `LandingPage.tsx` (splash, which now targets the shape's bounds).
- `src/control-tokens.css`, `workspace-layout.css`: `--logomark-height` (1.408em), `--logomark-shape-ratio`; narrow header clips to the shape; splash reveal animates the shape and name groups; removed the gap/shape tokens and `strong`-based rules.
- `src/assets/logo-shape.svg`, `logo-shape-part.svg`, `public/favicon.svg`: the new shape; `landing-impact.ts` / `landing-trials.ts` `depthStep` 2.9 → 3.2 so piled quads keep their gap; `tests/landing-intro.test.ts` geometry expectations updated.
- `src/shared/type-studio.ts`: the `brand` role targets the header logomark (its size scales the SVG).
- `docs/design-system-rules.md`: logomark rule rewritten.
- Validation: TypeScript and diff checks pass. Chrome confirms zero surrounding borders/inline padding and matching 0.5px inset underlines on the focused annotation and Idea stream fields.

## 2026-10-18 · prompt #480 — updated logomark file

- `src/assets/verso-logomark.svg`: regenerated from the replaced `final-logomark.svg` (same shape; the name starts 20 units further right, viewBox 438 × 144). Shape geometry, favicon and sizing tokens unchanged.


## 2026-10-18 · prompt #482 · Chat version-card breakpoint

- `workspace-layout.css`: switch all related version-card layout queries to the shared Chat panel boundary: stacked through 525px, horizontal above it.
- `docs/design-system-rules.md`: record the container-based rule. Inline annotation has no local source path.
- Validation: TypeScript and diff checks pass. Chrome confirms stacked cards at 525px and horizontal cards at 526px and 600px, including ordinary cards and milestone invitations.

## 2026-10-18 · prompt #483 · Captions and horizontal preview proportions

- `TheaterCaption.tsx`, `gallery.css`, `VersionCard.tsx`: remove full-text hover/focus tooltips for prompt/push captions and node titles, keeping clamping and title expansion.
- `MessageOutput.tsx`, `workspace-layout.css`: derive horizontal preview width from natural image dimensions and contain the full image if capped, for ordinary cards and invitations.
- `docs/design-system-rules.md`: record caption and image-proportion rules.
- Validation: TypeScript and diff checks pass; Chrome verifies the natural image ratio at 526px, 600px, and 760px Chat widths, contain sizing for ordinary/invited cards, and no full-text caption tooltip.

## 2026-10-18 · prompt #484 · Version cards horizontal from 500px

- `workspace-layout.css`: move all version-card container-query boundaries to horizontal at 500px and above, stacked below 500px, including ordinary cards and milestone invitations.
- `docs/design-system-rules.md`: update the shared Chat-panel breakpoint. The inline browser reference has no local source path.
- Validation: Chrome confirms stacked at 499px and horizontal at 500px/525px for invitation and ordinary cards; visually checked the 500px card. Diff check passes.

## 2026-10-18 · prompt #485 · Compact stacked invitation actions

- `control-tokens.css`: replace the fixed 88px stacked action reserve with the responsive milestone button diameter plus an 8px gap, bringing the buttons closer to the copy on narrow cards.
- `docs/design-system-rules.md`: record the shared spacing rule. Inline browser reference has no local source path.
- Validation: Chrome at a 385px Chat width confirms a 60px action reserve (52px button + 8px), reduced from 88px, with no text/button overlap; visually checked and diff check passes.

## 2026-10-18 · prompt #486 · Chat width caps and fullscreen content

- `workspace-responsive.ts`, `useChatPanelWidth.ts`: shared 600px split-Chat maximum for default and user-resized widths, plus a 675px fullscreen content token.
- `Workbench.tsx`, `workspace-layout.css`: derive the Chat-only layout from visible panels, center its conversation/composer, hide aside cards and their reserved space, and stop Escape from closing the reader when both panels are visible.
- `tests/workspace-responsive.test.ts`: update wide-screen default expectations for the hard cap.
- `docs/design-system-rules.md`: record these layout and keyboard rules.
- `scripts/screenshot-progress.mjs`: recognize `c chat fullscreen` as a layout cue, not a conversation title.
- Validation: TypeScript, responsive-width test, and diff checks pass. Chrome verifies the 600px resize ceiling at 1198/1669/2560px viewports, Escape preserving the reader, and centered fullscreen conversation/composer at 675px (or available width on a 600px screen), with aside cards hidden.

## 2026-10-18 · prompt #487 · Chat cap and fullscreen reply width

- `workspace-responsive.ts`: reduce the shared split Chat cap to 575px for defaults and resizing; fullscreen retains its 675px content limit.
- `workspace-layout.css`: fullscreen assistant replies use the full content width, matching version cards via the existing message-width token.
- `tests/workspace-responsive.test.ts`, `docs/design-system-rules.md`: update cap expectations and document fullscreen reply alignment. Inline annotation has no local source path.
- Validation: responsive-width test and diff check pass; Chrome confirms 575px split panels at 1198/1669/2560px viewports and identical fullscreen reply/card bounds at 600/1198/2560px, retaining centered content and hidden aside cards.
- `scripts/screenshot-progress.mjs`: support explicit `--gallery-view chat` so fullscreen captures without a textual capture cue use Chat readiness instead of waiting for a hidden Gallery.

## 2026-10-18 · prompt #488 · Session-only sent chat turns

- `model.ts`, `Workbench.tsx`: mark newly sent messages and demo replies as session-only, omit them from persisted state, and discard previously saved local turns on load while retaining bundled/catalog history and unrelated workspace data.
- `AGENTS.md`: reconcile the push counter with the existing push #48 capture after the concurrent merge resolved its conflicting text.
- `tests/workbench.test.ts`: cover legacy and newly sent turns, preserving in-memory messages, bundled history, drafts, and project settings.
- Validation: TypeScript and all 14 workbench tests pass. Chrome confirms sending a message shows both sides of the turn in-session, then refresh removes both while preserving the example conversation.

## 2026-10-18 · prompt #489 · Reveal version cards only when ready

- `MessageOutput.tsx`, `workspace-layout.css`: hide the complete version output until its current image is decoded and measured, reset readiness on source changes, and avoid measuring/animating hidden cards.
- `docs/design-system-rules.md`: record the shared card-loading rule.
- Validation: TypeScript and diff checks pass. Chrome with deliberately paused image decoding confirms zero visible/layout space while waiting, then reveals the complete card at its natural image ratio with no left gap, for both cold and cached loads.

## 2026-10-18 · prompt #490 · Separate panel and conversation width limits

- `workspace-responsive.ts`, `useChatPanelWidth.ts`, `Workbench.tsx`: cap split Chat panels at 40vw independently of the 575px content limit, retaining wide-screen 36vw defaults and fullscreen's 675px content exception.
- `workspace-layout.css`: center the content column and let assistant replies fill the same width as version cards in split view as well as fullscreen.
- `tests/workspace-responsive.test.ts`, `docs/design-system-rules.md`: update responsive expectations and shared layout rules.
- `AGENTS.md`: reconcile the push counter with the existing push #49 capture and committed HEAD.
- Validation: TypeScript, responsive-width test, and diff checks pass. Chrome confirms the 40vw resize ceiling at 1198/1669/2560px, centered split content capped at 575px, identical reply/card bounds, and unchanged centered 675px fullscreen behavior.

## 2026-10-18 · prompt #491 · Playback positioning and captions

- `TheaterView.tsx`, `tokens.ts`, `gallery.css`: center the frame independently of its metadata, size it to avoid control overlap, dynamically cap landscape playback-only content to the shared 80% width token, and truncate prompt/push captions to one line. Preserve live runtime layout.
- `docs/design-system-rules.md`: record the shared positioning, width, and caption rules. Browser annotation images have no local source path to archive.
- Validation: TypeScript, six theater-layout tests, and diff checks pass. Chrome verifies image centering in split and solo playback at portrait/landscape sizes, one-line ellipsis, the landscape width ceiling, and no overlap with transport controls.

## 2026-10-18 · prompt #492 · Full-width playback frames

- `TheaterView.tsx`, `gallery.css`: size saved playback frames from the shared content width rather than shrinking them to the centered height budget; preserve aspect ratio, shift the stage when needed, and allow overflow scrolling on short panels. Runtime sizing is unchanged.
- `docs/design-system-rules.md`: record width priority and the short-panel fallback.
- `visual_ref/[prompt #492] Screenshot 2026-10-18 at 22.13.55.png`: save the supplied reference.
- Validation: TypeScript and diff checks pass. Chrome confirms frame, caption, and transport widths match in split and playback-only layouts at 1669×1333, 2200×1000, and 1600×800, with the landscape 80% cap retained.

## 2026-10-18 · prompt #493 · Playback width and vertical spacing

- `TheaterView.tsx`, `tokens.ts`: use an 85% playback-only content column capped at 50vw, center the full stage above transport to lift it, and increase bottom padding from 4px to 12px. The split Idea stream layout retains available width within the viewport ceiling.
- `docs/design-system-rules.md`: update shared playback sizing and spacing rules. Inline browser references have no local source files to archive.
- Validation: TypeScript and diff checks pass. Chrome verifies matching frame/transport widths, the 85%/50vw constraint, centered full stages above controls, and 12px bottom padding across portrait, landscape, and split layouts.

## 2026-10-18 · prompt #494 · Playback cap and balanced frame gaps

- `tokens.ts`, `TheaterView.tsx`: raise the playback width ceiling to 60vw, add a bounded 24px downward stage offset, and derive the metadata gap from the measured action-row gap so image spacing matches above and below.
- `docs/design-system-rules.md`: update shared playback geometry. Inline browser references have no local source files to archive.
- Validation: TypeScript and source diff checks pass. Chrome confirms equal computed gaps above/below the image, matching content widths within 85%/60vw, and a bounded 24px downward offset across split, portrait, and landscape layouts.

## 2026-10-18 · prompt #495 · Double playback caption spacing

- `TheaterView.tsx`, `tokens.ts`: double the frame-to-metadata gap through a shared multiplier, including its reserved layout space.
- `docs/design-system-rules.md`: record the new 2:1 spacing ratio. Inline browser reference has no local source file to archive.
- Validation: TypeScript and source diff checks pass. Chrome measures 6.39px above and 12.80px below the frame, confirming the doubled caption gap without control overlap.

## 2026-10-18 · prompt #496 · Full-width split Chat composer

- `workspace-layout.css`: remove the content max-width from the split Chat composer area, including capture status and to-dos; retain centered 575px conversation content and fullscreen's centered 675px composer.
- `docs/design-system-rules.md`: distinguish split composer width from conversation width. Browser annotation has no local source file to archive.
- `AGENTS.md`: reconcile the push counter with the existing push #50 capture. Restarted the stalled local Vite process on port 5173 to restore browser verification.
- `server/git-history.ts`: bound local Git reads to 10 seconds and force-terminate hung subprocesses, using the existing unavailable-history fallback; a Git object read was freezing the entire preview and blocking validation.
- Validation: TypeScript, six Git-history tests, and source diff checks pass. Chrome confirms composer width equals panel width at 1198/1669/2560px viewports, conversation content retains its 575px cap, and fullscreen composer stays centered at 675px or the available narrow-screen width. Saved frame images failed to load during verification; dimensions were checked independently.

## 2026-10-18 · prompt #497 · Playback metadata margin

- `TheaterView.tsx`, `tokens.ts`: set the shared metadata top margin to 16px and reserve that same amount in stage sizing; remove the prior measured-gap multiplier.
- `docs/design-system-rules.md`: record the fixed shared spacing. The inline browser reference has no local source file to archive.
- Validation: TypeScript and source diff checks pass. Chrome measures exactly 16px between the frame and metadata in split Chat/Playback, with matching frame/transport widths and no control overlap.

## 2026-10-18 · prompt #497 uncounted — capture video export

- `exports/prompts-350-497-every-2nd-4x.mp4` (new, untracked output, 4 MB): every second prompt capture from #350 to #497 (49 frames), 80/7 fps (one frame per 87.5ms = Playback's 350ms interval at 4×), 2880×1626 H.264; taller captures are fitted and padded with the dark chrome color (#101010).

## 2026-10-18 · prompt #497 uncounted · Deployed history diagnosis

- `docs/prompt-log.md`: log the informational request without incrementing the capture counter.
- Read the deployed Git history and capture manifest; reproduced the exact numbering bug with `buildGitCaptureHistory`: the deployed history starts at captured V42, then unmatched captured V1–V41 are appended after V51 and relabeled V52–V92. The manifest retains V1–V51. No application code changed.

## 2026-10-18 · prompt #498 · Preserve deployed Idea stream history

- `src/features/version-tree/capture-history.ts`: insert unmatched saved versions into their chronological positions, preserve capture numbering, and keep Git ancestry separate from capture continuity. Uncaptured merges use dotted labels instead of shifting saved versions.
- `tests/git-history.test.ts`: cover truncated 51-version deployment data, missing middle captures, pending work, and preserved numbering around merges.
- `docs/design-system-rules.md`: record stable capture identities across partial Git histories.
- Validation: 12 history/capture tests, TypeScript, and source diff checks pass. Replaying the actual deployed manifest and truncated Git history produces original V1–V51 in order plus the legitimate V47.1 interim commit. Chrome verifies the rendered stream ends at and selects V51. Saved the requested Chat + Idea stream capture. Production deployment has not been changed.

## 2026-10-18 · prompt #499 · Hide main-branch decimal stations

- `idea-stream.ts`, `VersionTreePanel.tsx`: project out main-branch decimal versions before Idea stream layout, folding and navigation; reconnect visible parents and move hidden selection to its visible ancestor. Preserve the source history and other branches.
- `tests/idea-stream.test.ts`: verify filtering, connections, selection, navigation and source immutability.
- `docs/design-system-rules.md`: record this shared Idea stream visibility rule. The inline browser annotation has no local source path to archive.
- Validation: 20 Idea stream tests, TypeScript and source diff checks pass. Chrome using deployed history data confirms 51 visible versions, no main-branch decimal station, and V51 still selected. Saved the Idea stream progress capture.
