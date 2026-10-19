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
