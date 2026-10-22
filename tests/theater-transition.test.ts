import test from 'node:test';
import assert from 'node:assert/strict';
import { containedFrameTarget, transitionProgress, frameBorderEntrance, timelineEntrance, timelineCaptureProgress, theaterEntranceDuration, theaterRotationProgress, rotationCaptureProgress } from '../src/features/iteration-gallery/theater-transition.ts';
import { galleryTokens } from '../src/features/iteration-gallery/tokens.ts';

test('theater handoff only completes at the end of the transformation', () => {
  assert.equal(transitionProgress(0, 1100).eased, 0);
  assert.equal(transitionProgress(550, 1100).eased, .5);
  assert.equal(transitionProgress(1099, 1100).complete, false);
  assert.deepEqual(transitionProgress(1200, 1100), { progress: 1, eased: 1, complete: true });
});
test('midpoint capture holds the live transition and never hands off to theater', () => {
  assert.equal(transitionProgress(100, 1100, .5).complete, false);
  assert.deepEqual(transitionProgress(5000, 1100, .5), { progress: .5, eased: .5, complete: false });
});
test('reduced-motion transformation completes immediately', () => {
  assert.deepEqual(transitionProgress(0, 0), { progress: 1, eased: 1, complete: true });
});

test('reverse transition targets the contained image in portrait and wide viewports', () => {
  assert.deepEqual(containedFrameTarget({ left: 10, top: 20, width: 300, height: 600 }, 1200, 600), { left: 10, top: 245, width: 300, height: 150 });
  assert.deepEqual(containedFrameTarget({ left: 10, top: 20, width: 600, height: 300 }, 600, 1200), { left: 235, top: 20, width: 150, height: 300 });
});

test('direct orbit follows horizontal and vertical displacement; release uses the shared return clock', async () => {
  const { dragAngles } = await import('../src/features/iteration-gallery/theater-transition.ts');
  const angle = (x: number, y: number) => dragAngles(x, y, 400, 600, Math.PI, Math.PI * .45);
  assert.equal(angle(100, 0).yaw, -Math.PI / 4);
  assert.equal(angle(-100, 0).yaw, Math.PI / 4);
  assert.equal(angle(0, 150).pitch, -Math.PI / 4);
  assert.deepEqual(angle(0, 0), { yaw: -0, pitch: -0 });
  assert.equal(angle(0, 9000).pitch, -Math.PI * .45);
});
test('control exclusion includes margins around the entire row', async () => {
  const { containsPoint } = await import('../src/features/iteration-gallery/theater-transition.ts');
  const rect = { left: 20, top: 30, width: 400, height: 40 };
  const margin = { left: 5, right: 5, top: 12, bottom: 12 };
  assert.equal(containsPoint(rect, 250, 20, margin), true);
  assert.equal(containsPoint(rect, 250, 80, margin), true);
  assert.equal(containsPoint(rect, 250, 84, margin), false);
});

test('the open gap between metadata and playback is not a reserved control row', async () => {
  const { reservedControlContains } = await import('../src/features/iteration-gallery/theater-transition.ts');
  const row = { left: 0, top: 0, width: 400, height: 400 };
  const metadata = { left: 24, top: 180, width: 352, height: 112 };
  const playback = { left: 24, top: 308, width: 352, height: 72 };
  assert.equal(reservedControlContains(row, metadata, 200, 220), true);
  assert.equal(reservedControlContains(row, playback, 200, 340), true);
  assert.equal(reservedControlContains(row, metadata, 200, 300), false);
  assert.equal(reservedControlContains(row, playback, 200, 300), false);
});


test('frame finishes before the timeline enters and UI handoff follows both stages', () => {
  const frameEnd = galleryTokens.theaterMotion.rotateMs / theaterEntranceDuration();
  for (const progress of [0, frameEnd / 2, frameEnd]) {
    assert.deepEqual(timelineEntrance(progress), { opacity: 0, offsetVh: -5 });
  }
  const middle = timelineCaptureProgress();
  assert.equal(theaterRotationProgress(middle).progress, 1);
  assert.equal(theaterRotationProgress(middle).eased, 1);
  assert.deepEqual(timelineEntrance(middle), { opacity: .5, offsetVh: -2.5 });
  assert.equal(transitionProgress(galleryTokens.theaterMotion.rotateMs, theaterEntranceDuration()).complete, false);
  assert.equal(transitionProgress(theaterEntranceDuration(), theaterEntranceDuration()).complete, true);
  assert.equal(frameBorderEntrance(0).opacity, 0);
  assert.equal(frameBorderEntrance(frameEnd).opacity, 1);
  assert.equal(timelineEntrance(frameEnd).opacity, 0);
  assert.equal(frameBorderEntrance(middle).opacity, 1);
  assert.equal(timelineEntrance(1).opacity, 1);
  assert.equal(Math.abs(timelineEntrance(1).offsetVh), 0);
});

test('capture freezes the actual staged clock and preserves the original rotation midpoint', () => {
  const frozen = transitionProgress(9000, theaterEntranceDuration(), timelineCaptureProgress());
  assert.equal(frozen.complete, false);
  assert.equal(timelineEntrance(frozen.progress).opacity, .5);
  assert.equal(theaterRotationProgress(frozen.progress).eased, 1);
  assert.equal(theaterRotationProgress(rotationCaptureProgress()).eased, .5);
  assert.equal(timelineEntrance(rotationCaptureProgress()).opacity, 0);
  const instant = transitionProgress(0, 0);
  assert.equal(timelineEntrance(instant.progress).opacity, 1);
  assert.equal(theaterRotationProgress(instant.progress).eased, 1);
});
