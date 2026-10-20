# Working changes

## 2026-10-19 · prompt #504 · Scripted chat width update and centered live frame

- `scripted-replies.ts`, `Workbench.tsx`, `model.ts`: recognize the requested demo phrase, print a completion with catalog-derived version/prompt numbers, and reveal a session-only version card afterward. Preserve demo outputs during capture hydration.
- `MessageOutput.tsx`: support an explicit opt-out from automatic gradient milestone invitations for the demo card.
- `demo-events.ts`, `EmbeddedPrototype.tsx`: refresh only an active Live server after the scripted reply completes; archived prototypes and ordinary replies are unaffected.
- `TheaterView.tsx`, `gallery.css`: center runtime frames below the reader header and reserve symmetric clearance around the exit row.
- `docs/design-system-rules.md`: record the shared behavior. The browser annotation screenshot has no local source file available to archive.
- `scripts/screenshot-progress.mjs`: add a reusable `--chat-prompt` capture option to submit the demo phrase and wait for its completed card and refreshed preview.
- `AGENTS.md`: reconcile the push counter with the existing push #53 capture; cleared earlier working-change entries now included in that commit.
- Validation: the scripted-reply test and TypeScript pass. Browser checks confirm the plain card appears after printing, one Live server refresh occurs afterward, unrelated replies do not refresh it, and the frame is centered within 0.01px at 1669×1333 and 1198×800 without overlapping Exit.
- Saved and inspected capture #504 with the completed demo reply, plain output card, and centered Live server. Repaired that same capture after its initial automation clicked Send before React enabled it; the capture now waits for an enabled Send button and two newly added messages. No additional prompt counter was used.

## 2026-10-19 · prompt #505 · Animated return to Playback

- `TheaterView.tsx`, `useRuntimeReturn.ts`, `IterationGallery.tsx`, `gallery.css`, `tokens.ts`: keep the runtime frame mounted during exit, interpolate its measured bounds into Playback while restoring surrounding panels, and dissolve into the saved capture. Stage frame/details/transport entrance with shared timing tokens; respect reduced motion and clean up interrupted exits.
- `docs/design-system-rules.md`: record shared entry and exit motion. The inline browser annotation has no local source file available to archive.
- Validation: TypeScript and 17 existing theater/layout/runtime tests pass. Local Chrome checks confirm the same runtime stays mounted during the move, the frame stays opaque, details appear before transport/timeline, repeat entry/exit cleans up, and reduced motion restores Playback immediately. Verified both Chat + Playback and the return to Playback + Idea stream.
- Saved and visually inspected progress capture #505 with Chat and Live server side by side.

## 2026-10-19 · prompt #506 · Longer playback UI stagger

- `src/features/iteration-gallery/tokens.ts`: extend the shared transport/timeline entrance delay from 440ms to 840ms, as requested. Frame and prompt-info timing remain unchanged.
- `docs/design-system-rules.md`: update the shared timing rule.
- Validation: confirmed the shared CSS uses the updated 840ms token; diff whitespace check passes. Saved and inspected Playback capture #506.

## 2026-10-19 · prompt #507 · Playback label order and timing

- `tokens.ts`: set playback UI entrance delay to 640ms.
- `PlaybackControls.tsx`: add two preserved spaces after Controls, remove summary parentheses, move the unit to the end with “per” wording, and reorder menu columns to Speed / Loop / Play. Keyboard navigation follows that same DOM order.
- `docs/design-system-rules.md`: update shared timing and control-summary rules. Browser annotation image has no local source file available to archive.
- Validation: TypeScript and whitespace checks pass. Chrome confirms the two-space summary, computed 0.64s delay, and left-to-right Speed / Loop / Play columns.
- Saved and visually inspected Chat + Playback progress capture #507.

## 2026-10-19 · prompt #508 · Brief splash logo glow

- `landing-intro.ts`, `landing-stage.ts`: replace the constant shape glow with a smooth 360ms pulse around the final-logo reveal, shared across intro variants. Early shapes and the background loop remain crisp; reduced motion skips the glow.
- `docs/design-system-rules.md`: record the updated splash glow rule.
- Validation: TypeScript, whitespace checks, and 14 existing landing tests pass. Chrome canvas measurements confirm a brief glow near logo arrival and zero glow during the background loop.
- Saved and visually inspected landing capture #508 with crisp background shapes.

## 2026-10-19 · prompt #509 · Softer final splash glow

- `landing-intro.ts`, `landing-stage.ts`, `workspace-layout.css`: lower glow peak opacity from 55% to 14%, broaden the arrival pulse to 600ms, and ease opacity with a squared sine while keeping the blur radius steady. Preserve crisp shapes outside the logo-arrival window.
- `docs/design-system-rules.md`: update shared splash motion and opacity rules.
- Validation: TypeScript and whitespace checks pass. Chrome measured 14% peak glow opacity, a roughly 600ms pulse, and no background-loop glow.
- Saved and visually inspected landing capture #509. The initial attempt was skipped by the capture script’s short-lived duplicate-prefix check; retry saved one capture without overwriting #508.

## 2026-10-19 · prompt #510 · Rotating splash intro, larger logo, and typed description

- `landing-turn.ts`, `landing-intro.ts`, `landing-stage.ts`, `LandingPage.tsx`: add a default screen-covering gray sheet that rotates and brightens into a sequence of white quads, then gathers onto the measured SVG logo and rests. Preserve the subtle arrival glow and legacy trial variants.
- `LandingDescription.tsx`, `workspace-layout.css`: double the splash logo, move the buttons down using shared gallery positioning tokens, and type the persistent two-line description with longer pauses at spaces. Keep the logo fixed while typing and handle reduced motion and small screens.
- `scripts/screenshot-progress.mjs`: wait for completed landing description before saving captures.
- `docs/design-system-rules.md`: record the new shared splash behavior.
- `tests/landing-turn.test.ts`: cover the oversized opening sheet, separated lit quads, and exact final SVG slots. All 16 landing tests and TypeScript pass. Browser checks confirm gray-to-white lighting, a 48px logo type size (twice the previous rendered 24px), persistent two-line text, non-overlapping desktop/narrow layouts, and immediate reduced-motion completion.
- Saved and visually inspected landing capture #510 after the full description finished typing.

## 2026-10-19 · prompt #511 · Textured landing intro and ambient orbit

- `src/assets/verso-logomark.svg`: replace shared artwork with the user's new root SVG while retaining themed fills and shape/name hooks.
- `LandingPage.tsx`, `LandingDescription.tsx`, `workspace-layout.css`: slightly smaller landing logo, faster typing, shared slogan/button size, larger button padding, and post-intro pointer-triggered button reveal with keyboard/touch access.
- `landing-stage.ts`, `landing-intro.ts`, `landing-turn.ts`, new `landing-orbit.ts`: add stable grain and clipped mutual shadows, then a depth-sorted loop of twenty logo-derived quads with perspective and periodic acceleration. Reduced motion stays static; dispose cancels animation.
- `tests/landing-orbit.test.ts`: validate bounded geometry, depth order, fade-in and forward periodic acceleration. `scripts/screenshot-progress.mjs`: reveal the landing actions through pointer input before capture.
- `docs/design-system-rules.md`: record the new splash, brand and action behavior.
- Validation: all 18 landing tests pass, TypeScript and whitespace checks pass. Chrome verified hidden/inert actions before post-intro pointer movement, upper-half movement staying hidden, lower-half reveal, matching 16px copy, the replacement SVG, a changing orbit, narrow-screen fit, static reduced motion, and keyboard reveal. Visually checked overlapping-sheet shadows and grain.
- Saved and inspected landing capture #511. The first capture failed on a malformed temporary Chrome port file; retry saved the single successful frame.

## 2026-10-19 · prompt #512 · Refined landing typing and masked buttons

- `LandingDescription.tsx`: reserve the slogan's final two lines before typing, with “creative process” always on line two; ease typing speed from slow to fast to slow while preserving space pauses.
- `LandingPage.tsx`, `workspace-layout.css`: restore both slogan and button typography to the shared previous action size, reduce vertical padding to 8px, increase gap to 12px, and reveal the buttons separately through masks with a 100ms stagger. Preserve pointer gating, keyboard/touch access and reduced motion.
- `docs/design-system-rules.md`: record the corrected text sizing and motion behavior.
- Validation: TypeScript and whitespace checks pass. Chrome confirmed the shared prior 12.024px text size at 1440px (11px on narrow screens), 8px vertical padding, stable line positions throughout typing, and measured slower beginning/end (~56ms letter intervals) than the middle (~25ms). Verified individual clipped transforms and 100ms stagger, post-intro pointer gating, narrow layout and reduced-motion/keyboard access.
- Saved and visually inspected the requested landing progress capture #512.

## 2026-10-19 · prompt #513 · Directional light and orthographic orbit

- `landing-orbit.ts`: replace perspective with orthographic projection, light the rotated normals, expand the ring from center, and stagger growth/rotation/acceleration around the circle using shared tokens.
- `landing-stage.ts`, `landing-intro.ts`: remove grain and project sharper intro shadows away from the orbit's directional light.
- `LandingPage.tsx`, `workspace-layout.css`: remove the scrim and lower the masked action group to a responsive 8vh bottom inset.
- `tests/landing-orbit.test.ts`: cover center-origin growth, parallel edges, size independent of depth, lighting range, and staggered forward motion. `docs/design-system-rules.md`: record updated lighting, projection and spacing.
- `scripts/screenshot-progress.mjs` and the landing canvas readiness marker: wait for the ring's center-out growth to finish before the landing capture.
- Validation: TypeScript, whitespace checks, and four orbit tests pass. Chrome verified no scrim, lower buttons, completed ring expansion, masked reveals, fixed typing layout, narrow-screen fit and reduced motion. Visually checked directional shadows without grain and strong angle-dependent grayscale lighting.
- Saved and visually inspected landing progress capture #513.

## 2026-10-19 · prompt #514 · Unified orbit rhythm and subtle bottom scrim

- `landing-orbit.ts`: share orbital motion/radial growth across all sheets, use a shorter 650ms deceleration, grow from 1% to full scale over 2.8s, and retain staggered individual X rotation with Y/Z locked.
- `LandingPage.tsx`, `workspace-layout.css`: add a transparent-to-44% bottom scrim only after the intro settles; preserve foreground copy and buttons, with immediate reduced-motion styling.
- `landing-stage.ts`: capture readiness waits for both radial growth and sheet scaling. `tests/landing-orbit.test.ts`: validate fixed spacing, scale progression, locked axes and faster slowdown alongside lighting/projection checks.
- `docs/design-system-rules.md`: record the updated shared motion and scrim rules.
- Validation: TypeScript and whitespace checks pass; all six orbit tests pass. Chrome verified the scrim stays absent during entry and fades to the directional gradient afterward, plus preserved masked buttons, fixed typing, narrow-screen layout and reduced motion. Visually checked the final constrained-axis orbit.
- Saved and visually inspected landing progress capture #514.

## 2026-10-19 · prompt #515 · Logo-aligned Z rotation and closer slogan

- `workspace-layout.css`: move the slogan 6px closer to the logo using its shared gap token.
- `landing-orbit.ts`: hold X/Y tilt fixed, rotate around Z from the SVG's exact initial orientation, and stagger rotation starts by 180ms with easing. Derive the fixed 3D surface normal from the SVG edges so directional lighting follows the Z rotation without changing shape proportions.
- `tests/landing-orbit.test.ts`: verify preserved projected edge lengths, matching initial logo angles and staggered starts while retaining fixed spacing, growth, lighting and deceleration checks. `docs/design-system-rules.md`: record the updated axis constraint and gap.
- Validation: TypeScript and whitespace checks pass; all seven orbit tests pass. Chrome confirmed the 16px slogan gap, preserved fixed-line typing and masked button entry, working orbit and scrim, narrow-screen fit and reduced-motion behavior. Visually reviewed the Z-axis rotation with unchanged quad proportions.
- Saved and visually inspected landing progress capture #515.

## 2026-10-19 · prompt #516 · Y-only rotation and flattened backlit intro

- `landing-orbit.ts`: rotate the reconstructed SVG plane and its light normal about Y only, preserving fixed X/Z tilt, initial logo angle and staggered starts.
- `landing-turn.ts`, `landing-intro.ts`, `landing-stage.ts`: hold all sheets coincident until the turn completes plus 300ms, then expand; move the intro source behind the stack and use it for softer face illumination and directional shadows. Adjust reveal/settle timing with the sequence.
- `tests/landing-orbit.test.ts`, `tests/landing-turn.test.ts`: update axis invariants and verify exact coincidence throughout the turn/hold, expansion afterward, and restored logo brightness. `docs/design-system-rules.md`: record the updated motion and lighting.
- Validation: TypeScript and whitespace checks pass; all ten orbit/intro tests pass. Chrome verified the flattened hold and expansion, rear lighting, Y-only orbit, preserved typing/button timing, mobile layout and reduced motion. Saved and visually inspected landing progress capture #516.

## 2026-10-19 · prompt #517 · Vertical orbit edges and wireframe expansion

- `landing-orbit.ts`: pivot around each sheet's reconstructed short edge instead of world Y, keeping its short edges vertical at every angle; reduce final size to 75% of its logo-derived size.
- `workspace-layout.css`: increase the bottom scrim opacity to 64%.
- `landing-intro.ts`, `landing-turn.ts`, `landing-stage.ts`: add shared fill-opacity rendering, remove directional shadows, fade expanded sheets into crisp wireframes and restore fill near the final morph. Extend the sequence to give the outlines a visible hold.
- `tests/landing-orbit.test.ts`, `tests/landing-turn.test.ts`: verify both vertical edges throughout rotation and the full fill/wireframe/fill sequence. `docs/design-system-rules.md`: record these shared behavior changes.
- Validation: TypeScript and whitespace checks pass; all 11 orbit/intro tests pass. Chrome verified the wireframe-only expanded state, vertical short edges, smaller orbit sheets and 64% scrim, plus preserved typing, masked buttons, mobile fit and reduced-motion behavior.
- Saved and visually inspected landing progress capture #517.

## 2026-10-19 · prompt #518 — runtime full screen

- `src/features/iteration-gallery/TheaterView.tsx`: runtime controls render for Live server too; new full-screen button after the version arrows requests full screen on the runtime pane.
- `src/features/iteration-gallery/EmbeddedPrototype.tsx`, `gallery.css`, `tokens.ts` (`fullscreenHintMs`): full-screen hint toast; Tab (host or forwarded from the iframe) exits; full-screen background.
- `src/shared/runtime-messages.mjs` (+ `.d.mts`, new), `server/prototype-service.mjs`, `src/shared/live-preview.ts`: archived prototypes and the live preview forward Tab / Escape to the host. Archived prototypes pick this up when rebuilt (dev rebuilds on demand; the Vercel deployment needs `npm run deploy:vercel`).
- `tests/prototype-service.test.ts`: bootstrap key forwarding.
- `docs/design-system-rules.md`: runtime full-screen rule.

## 2026-10-19 · prompt #519 · Random clockwise rotations and earlier fill transitions

- `landing-orbit.ts`, `landing-stage.ts`: seed starting rotations once per stage mount and integrate a positive eased angular velocity, replacing oscillation with continuous clockwise short-edge rotation. Keep vertical edges and resize-stable phases.
- `landing-turn.ts`: derive fill fade-out from the expansion interval; begin restoring fill 250ms earlier during gathering.
- `tests/landing-orbit.test.ts`, `tests/landing-turn.test.ts`: verify randomized stable starting phases, monotonic rotation over multiple turns, vertical edges, and fill fading alongside expansion. `docs/design-system-rules.md`: record the shared behavior changes.
- Validation: all 11 geometry/timing tests, TypeScript and whitespace checks pass. Chrome confirmed partially transparent fills during expansion, varied orbit orientations with vertical short edges, and preserved mobile/reduced-motion behavior and button/typing timing.
- Saved and visually inspected landing progress capture #519.

## 2026-10-19 · prompt #520 — gallery froze after switching bucket from Playback

- `src/features/iteration-gallery/AlbumScene.ts`, `AlbumView.tsx`: switching the capture bucket in Playback jumps to the gallery without the reverse turn, leaving the finished turn "held" — every frame replayed it, drawing the old Playback frame with controls disabled. `releaseTheater()` now restores the saved gallery camera and clears the held turn whenever the gallery is shown without the reverse animation (bucket change, fallback exit).

## 2026-10-19 · prompt #521 · Evenly stepped angles and eased logo name

- `landing-orbit.ts`, `landing-stage.ts`: replace random per-mount rotation seeds with count-derived equal starting-angle steps, preserving clockwise motion and vertical short edges.
- `workspace-layout.css`: give the logo name a dedicated 1.2s eased opacity reveal and remove its sideways movement; retain reduced-motion support.
- `tests/landing-orbit.test.ts`: verify equal phase spacing including the ring seam and continued clockwise motion. `docs/design-system-rules.md`: record the updated shared motion rules.
- `LandingPage.tsx`: memoize the landing Logomark to preserve its inline SVG nodes across intro phase changes. Browser inspection found those nodes were replaced at reveal, preventing the existing opacity transition from running.
- Validation: all 11 geometry/timing tests, TypeScript and whitespace checks pass. Chrome confirmed the name SVG survives phase changes and measured its eased fade at partial opacity before reaching 1; normal-motion desktop/mobile checks passed. The reduced-motion reload and progress capture were interrupted by the development server stalling on historical screenshot reads; capture retries failed because port 5173 remained unresponsive. Capture #521 remains pending; the counter was not incremented. No development configuration changes retained.

## 2026-10-19 · prompt #522 · Descending 30° phases and smaller orbit sheets

- `landing-orbit.ts`: add a −30° starting-angle step token and reduce orbit sheet size from .75 to .6 of the logo-derived scale.
- `workspace-layout.css`: shorten the logo-name opacity transition from 1.2s to 650ms.
- `tests/landing-orbit.test.ts`: verify successive angles decrease by 30° while animated rotation remains clockwise. `docs/design-system-rules.md`: record the revised values.
- All 11 animation/geometry tests pass. Localhost remains unresponsive; browser verification and progress capture are being retried.
- Capture #522 retry failed because no responsive app was available at localhost:5173; it remains pending and the counter stays unchanged. TypeScript checking was terminated externally with SIGKILL, without a compiler diagnostic; targeted whitespace checks passed.

## 2026-10-19 · prompt #523 · Descending 25° orbit phases

- `landing-orbit.ts`: change the shared initial rotation step from −30° to −25° per rectangle.
- `tests/landing-orbit.test.ts`: update the angle-spacing regression check. `docs/design-system-rules.md`: record the revised step.
- Validation: all seven orbit tests and targeted whitespace checks pass. Localhost recovered; saved and visually inspected landing progress capture #523.

## 2026-10-19 · prompt #524 · Descending 45° orbit phases

- `landing-orbit.ts`: change the shared starting-angle step from −25° to −45° per rectangle.
- `tests/landing-orbit.test.ts`: update the spacing regression check. `docs/design-system-rules.md`: record the new value.
- Validation: all seven orbit tests and targeted whitespace checks pass. Saved and visually inspected landing progress capture #524.

## 2026-10-19 · prompt #525 · Descending 10° orbit phases

- `landing-orbit.ts`: change the shared starting-angle step from −45° to −10° per rectangle.
- `tests/landing-orbit.test.ts`: update the spacing regression check. `docs/design-system-rules.md`: record the revised value.
- Validation: all seven orbit tests and targeted whitespace checks pass. Saved and visually inspected landing progress capture #525.

## 2026-10-19 · prompt #525 uncounted · Post-push records

- Deployment repository fix and tests committed and pushed to `main` as `7917858170f54496e1fb44629f29ecc0a8bcedc3`.
- `AGENTS.md` / `data/push-shas.json`: record push #55 and its exact commit after the push. These bookkeeping updates remain uncommitted, as a commit cannot include its own SHA. Prompt remains #525; screenshot capture skipped.

## 2026-10-19 · prompt #526 · Preserve gallery prompt selection

- `src/features/iteration-gallery/IterationGallery.tsx`, `playback-selection.ts`: restrict simulator follow-latest to actual changes in the newest visible frame. Entering Playback or choosing another prompt no longer overwrites explicit selection with the last frame.
- `tests/playback-selection.test.ts`: cover entry while simulating, growth/rewind, and cutoff changes while still in Gallery. Three tests pass.
- Local startup is stalled; browser validation and the single progress capture are pending.

## 2026-10-19 · prompt #525 uncounted — prototype build cache fix (cleanup)

- `server/prototype-service.mjs`: staging for a push build skips `[frame capture] screenshots` and `exports` (Git LFS smudged ~177MB of captures into every staged commit) and deletes the staged copy after the build. `tests/prototype-service.test.ts` expects the staged copy to be gone. Tests pass.
- Cleanup (user ran the delete): `.mitwerk-prototypes/`, `[ver capture] codebase/`, `.vercel/output/` removed (all rebuildable or retired); 23 unreferenced Finder/iCloud " 2" duplicates removed with `git rm` (staged deletions); `git gc --prune=never` packed 6,374 loose objects (155MB) into one pack (103MB).
- Browser reproduction against production confirmed choosing prompt #495 opened #520 with the simulator active. The same interaction against the isolated fixed app selected and displayed #495. TypeScript `--noEmit` also passed against that copy.
- Restored cloud-only generated dependency files from a temporary install using the existing lockfile; package manifests and lockfile were unchanged. Main-workspace startup remained blocked by iCloud reads, so browser verification used the isolated source copy on port 5173 with the published gallery catalog.
- Saved and inspected progress capture #526 with prompt #495 selected in Playback and the simulator active. The isolated verification environment had missing icon glyphs; selection and the displayed frame were correct. Capture's optional Git line-count scan was stopped after it stalled, allowing the script's built-in fallback to finish without a duplicate capture.

## 2026-10-19 · prompt #527 · Prevent Live server reopening after exit

- `src/features/iteration-gallery/IterationGallery.tsx`, `TheaterView.tsx`: consume Live server commands in the persistent gallery owner when handled, so remounting Playback cannot replay an already handled open request. Exit commands no longer wait for the frame image to finish loading.
- Validation: TypeScript and targeted whitespace checks pass. A real Chrome regression check passed Exit → Gallery → prompt Playback, explicitly reopening Live server, and direct Live server → Gallery → prompt Playback; neither return to Playback reopened Live server. Progress capture failed: Chrome did not reach the capture script’s ready state. Counter remains #526; no image saved.

- Three progress-capture attempts timed out without saving or advancing the counter. A temporary capture-readiness diagnostic edit was reverted; no capture-script changes remain. The full request is logged under reserved prompt #527.

## 2026-10-19 · prompt #526 uncounted · Push frame-jump fix

- Pushed `b4f099ddf943d6ca7a98bf04fafa88f593039ac2` (`fixed frame jump from gallery`) to `main`. The first push stopped because the screenshot hook waited for a reading window that this commit message does not open.
- `[frame capture] screenshots/[push #56] …`, `data/push-shas.json`, `data/token-usage.json`, `AGENTS.md`: saved the home-layout push capture, recorded its commit, and set the push counter to #56. Prompt counter stays #526.
- `scripts/screenshot-progress.mjs`: if that commit’s push screenshot is already recorded, the pre-push hook reuses it instead of taking another. These bookkeeping updates remain uncommitted.

## 2026-10-19 · prompt #527 · verso brand animation (Design canvas)

- `visual_ref/[prompt #527] 1.png`: saved the user's three-step storyboard sketch.
- No app source changed. The 16:9 brand animation (isometric version blocks → top view → wrapped vertical stream) lives in a claude.ai Design canvas built from verso tokens and gallery geometry (`versionDepth`/block width → 195px stride at 797px).
- Follow-up (same canvas, no repo source changed): square corners on frames, bars and wrappers; 150px frame spacing and 96px wrapper padding; wrapped blocks continue as a horizontal row that holds on screen; a later block centers with a #FED65B border while verso's Playback milestone chip (trophy + reference-chip label, Waldenburg uploaded to the canvas) types "Finalized branding concept".

## 2026-10-19 · prompt #528 · Smooth gallery handoff and center timeline selection

- `AlbumScene.ts`, `TheaterView.tsx`: prepare selected textures before the camera clock starts and defer background GPU uploads / look-ahead decoding during the turn. Chrome profiling identified texture uploads as the dominant stall.
- `PlaybackTimeline.tsx`, `timeline.ts`, `tests/timeline.test.ts`: center the selected frame against measured scroll bounds, clamp both ends, and remeasure on resize; include center/edge/short-track tests. `docs/design-system-rules.md` records the shared behavior.
- Validation: TypeScript and 27 timeline/transition tests pass. Chrome profiling of the moving camera measured a 16.7ms p95 and 16.8ms maximum after preparing textures, versus a 116.8ms p95 in the original entry trace; cold GPU preparation happens before motion. Browser checks passed middle/first/last selections, resize, and manual scrolling; center error was below 0.2px. Saved and visually inspected progress capture #528.
- Follow-up 2 (same canvas, no repo source changed): shot 1 frames use the gallery version-block material (muted edge 18%, line fill 3.5%) and cross-fade to the 2px final style as the camera starts moving; wrapper padding 120px; the wrapped stack turns 90° anticlockwise and the row is built from turned blocks; the ending adds a cursor click on the trophy with the app's trophy bounce and 16-particle confetti physics (`celebration.ts`).

- `scripts/screenshot-progress.mjs`: Playback captures wait for the actual settled Playback and loaded frame, rather than an Idea stream readiness flag that is absent in Chat/Playback; allow 30s for cold captures. Reserved #528 because #527 already has a logged request awaiting its capture.
- Follow-up 3 (same canvas): every animated layer rests on its final-frame style, so the editor's edit mode (which turns off CSS animation) shows the finished milestone frame instead of all shots stacked.
- Follow-up 4 (same canvas): milestone chip centered under the highlighted block (pointer and confetti stay anchored to the trophy), 120px gaps between blocks, 4px block and highlight borders.
- Follow-up 5 (same canvas): blocks get 150px padding top and bottom (frame ends), gaps between blocks 100px, and the Shot tweak is back on "play" (it had been set to the top-view still).
- Follow-up 6 (same canvas): the camera move into shot 2 now includes the 90° anticlockwise turn, so the top view already shows vertical frames and the separate rotate step is gone (later beats 1s earlier); frames take the blocks' 4px border and fill.
- Follow-up 7 (same canvas): shot 1 frames use the 4px block border and fill from the start (gallery material dropped); the zoom-out begins with the camera move into the top view and continues through the row; typing about twice as fast, click at 17.5s.
- Follow-up 8 (same canvas): 60%-opacity Waldenburg caption "Prompts" under the shot 1 frames, crossfading to "Versions" as the wrapper forms and fading out during the pan before the milestone chip; the wrapped block is now the first block in the row (no blocks to its left) and the pan starts during the zoom-out.
- Follow-up 9 (same canvas): row stays vertically centered; highlighted block has 8 frames; caption and milestone chip share one fixed, constant-size slot 110px above the bottom edge (caption fades at 12–12.5s, chip at 13.1s); scene starts at 85% so shot 1 clears that slot.
- Follow-up 10 (same canvas): milestone lands on the 6th block after the wrapped one (8 frames) over a 5.4s pan; label and chip use the repo's `--sans` stack at Waldenburg Regular 400 (uploaded), both 26px; zoom-out starts at 2.2s; all easing softened to cubic-bezier(.3,0,.7,1) / (.25,.4,.35,1); click at 18.8s.
- Follow-up 11 (same canvas): zoom-out ends at 34% at 10.2s and holds 300ms; pan (10.5–15.9s) moves at constant speed between 0.8s quadratic ease-in/out; push-in removed; ending shifted 1.9s later (click 20.7s).
- Follow-up 12 (same canvas): typing reads elapsed time from a hidden CSS clock animation (stays in sync after edit mode or replay); 45°→41° drift removed so shot 1→2 is one rotation (4–6s); row blocks fade in only once the pan starts (10.5s, 0.18s stagger).
- Follow-up 13 (same canvas): milestone block is the last of 16 blocks (pan still 5.4s); chip types "Finally published my site!" with a two-letter backspace; zoom-out starts at 4.4s, after the rotation begins.
- Follow-up 14 (same canvas): black pointer with white outline; rotation 2.8–4.8s; zoom-out 3.2–7.6s at constant speed with 0.6s ease ramps; 300ms hold; pan 7.9–11.5s (3.6s); ending retimed (click 16.3s).
- Follow-up 15 (same canvas): row is 40 blocks; pan 8.1–10.5s (2.4s, 0.3s ramps); zoom split into a pull-back to 60% during the rotation and a 1s constant-speed zoom-out (0.15s ramps) on the wrapped block at 6.8–7.8s, then a 300ms hold; ending retimed (click 15.3s).
- Follow-up 16 (same canvas): row is 23 blocks; pan 8.3–10.7s with 0.6s ease ramps; wrapped-block zoom-out 6.8–8.0s with a 0.6s cubic landing; ending +0.2s (click 15.5s).
- Follow-up 17 (same canvas): row is 18 blocks; pan 8.6–11.4s with a 1.2s quartic landing; zoom-out 6.8–8.3s with a 0.9s quartic landing; ending +0.7s (click 16.2s).
- Follow-up 18 (same canvas): hold before the pan cut to 100ms; pan 8.4–12.2s (3.8s) with a 1.0s cubic ease-in and the 1.2s quartic landing; ending +0.8s (click 17.0s).
- Follow-up 19 (same canvas): wrapped-block zoom-out moved to 5.8–7.3s so it runs with the wrapper forming; pan 7.4–11.2s; ending 1s earlier (click 16.0s).
- Follow-up 20 (same canvas): zoom-out is one continuous move (3.2–6.4s, 0.3s ramp-in, 0.9s quartic landing) running with the rotation and the wrapper (4.8s); pan 6.5–10.3s; ending 0.9s earlier (click 15.1s).
- Follow-up 21 (same canvas): zoom-out starts at 3.8s (1s into the rotation), ends 7.0s; pan 7.1–10.9s; ending +0.6s (click 15.7s).
- Follow-up 22 (same canvas): zoom-out starts at 5.8s (after the rotation); wrapper and Versions caption at 6.5s, once the zoom has shrunk the block clear of the bottom label; pan 9.1–12.9s; ending +2s (click 17.7s).
- Follow-up (same canvas, no repo source changed): the wrapped-block zoom-out now starts at 4.8s, the moment the frames finish rotating; pan and ending move 1s earlier (click 16.7s); wrapper and Versions caption at 6.0s, once the block clears the caption.
- Follow-up (same canvas): gradual pull-back from 85% to 65% during the rotation (2.8–4.8s) so the frames stay ~25px above the label; the 4.8s zoom-out then settles at 7.07s, where "Prompts" switches to "Versions"; pan 7.15s, ending ~1s earlier (click 15.75s).
- Follow-up (same canvas): yellow highlight border 6px (2px wider, outward); wrapper forms at 4.9s, right after the top-view lines appear.
- Follow-up (same canvas): wrapper at 5.4s; shot 1 frames use a 55% translucent fill; pan 3.2s (was 3.8s), ending 0.6s earlier (click 15.15s).
- Follow-up (same canvas): wrapper 5.8–6.6s with "Prompts" → "Versions" at 6.6s once it is fully on; pan 2.7s; ending 0.5s earlier (click 14.65s).
- Follow-up (same canvas): shot 1 frame fill raised from 55% to 80% opacity.
- Follow-up (same canvas): pan 3.1s with a 1.0s quartic ease-in and 1.3s quintic landing; ending 0.4s later (click 15.05s).
- Follow-up (same canvas): "Prompts" → "Versions" at 5.8s, as the wrapper starts to appear mid zoom-out.
- 2026-10-19 · brand animation export: rendered the canvas to `exports/verso-brand-animation-4k60.mp4` (3840×2160, 60fps, H.264, 17.5s) via a scratchpad headless-Chrome frame stepper; `exports/` is gitignored.
- 2026-10-19 · brand animation: row cut to 14 blocks (pan still 3.1s); re-rendered `exports/verso-brand-animation-4k60.mp4` in place.

## 2026-10-19 · prompt #529 · Production Gallery transition investigation

- `AGENTS.md`: reconcile push counter to #57 from the existing push capture, SHA map, and local/remote commit `6fddca3`; prompt counter remains #528 until capture succeeds.
- `src/features/iteration-gallery/AlbumScene.ts`, `theater-camera.ts`: anchor the turn to the selected frame's projected center instead of independently interpolating camera position and rotation; prevents a long history from sweeping toward its end before Playback settles. Preserve the original pose for reverse navigation.
- `tests/theater-camera.test.ts`, `docs/design-system-rules.md`: cover the projected path across gallery depths, zooms, off-center targets, and reverse motion; document the shared frame-anchored transition rule.
- Validation: 36 focused camera/transition/timeline tests and TypeScript checks passed. Browser traces confirmed monotonic selected-frame movement for both a prompt and a push, with the clicked frame preserved; return navigation restored Gallery. Saved progress capture #529 and logged the user's clarification in `docs/prompt-log.md`.

## 2026-10-19 · prompt #530 · Prevent early Playback UI

- `src/features/iteration-gallery/gallery.css`: hide the full Playback row during the Gallery turn instead of only the transport buttons, preventing the timeline and scrollbars from appearing before the scheduled 640ms entrance.
- `docs/design-system-rules.md`: record the shared entrance-visibility rule, preserving layout measurements and reduced motion.
- Browser validation: before the fix, timeline UI reached full opacity during the camera turn. Afterward, transport/timeline/overview stayed at opacity 0 through all 89 sampled turning frames and the delay, then began appearing at ~649ms (the 640ms schedule plus one display frame); metadata appeared at ~182ms. The row finished fully visible.
