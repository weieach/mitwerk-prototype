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
