import test from 'node:test';
import assert from 'node:assert/strict';
import { aspectRatioLabel, presentedFrame, referenceCapture, theaterFrameSize, wheelFrameDelta } from '../src/features/iteration-gallery/theater-layout.ts';
import type { GalleryFrame } from '../src/features/iteration-gallery/model.ts';
const frame = (id: string, kind: GalleryFrame['kind'], number: number) => ({ id, kind, number } as GalleryFrame);

test('changing the hover target retains the last decoded preview, leaving restores selection', () => {
  const selected = frame('selected', 'push', 4), previous = frame('previous', 'prompt', 12), next = frame('next', 'prompt', 13);
  assert.equal(presentedFrame(true, previous, selected, selected), previous);
  assert.equal(presentedFrame(true, next, selected, selected), next);
  assert.equal(presentedFrame(false, next, selected, selected), selected);
  assert.equal(presentedFrame(true, null, selected, selected), selected);
});
test('reference lookup uses capture metadata, distinguishing push and prompt counters', () => {
  const push = frame('push', 'push', 56), prompt = frame('prompt', 'prompt', 56);
  assert.equal(referenceCapture([push, prompt], { kind: 'prompt', number: 56 }), prompt);
  assert.equal(referenceCapture([push], { kind: 'prompt', number: 56 }), push);
  assert.equal(referenceCapture([], { kind: 'prompt', number: 56 }), undefined);
});
test('viewport size reads as a reduced aspect ratio', () => {
  assert.equal(aspectRatioLabel(2880, 1626), '480:271');
  assert.equal(aspectRatioLabel(1920, 1080), '16:9');
});
test('theater sizing uses the full available width', () => {
  const baseline = { width: 2880, height: 1626 }, available = { width: 600, height: 200 };
  const sized = theaterFrameSize(available, baseline, baseline);
  assert.equal(sized.width, 600);
  assert.equal(sized.height, 600 * 1626 / 2880);
  assert.equal(theaterFrameSize(available, baseline, { width: 390, height: 844 }).width, 600);
});

test('wheel deltas on the theater frame accumulate to one-frame steps', () => {
  assert.deepEqual(wheelFrameDelta(40, 0, 80), { accumulated: 40, move: 0 });
  assert.deepEqual(wheelFrameDelta(50, 40, 80), { accumulated: 0, move: 1 });
  assert.deepEqual(wheelFrameDelta(-80, 0, 80), { accumulated: 0, move: -1 });
  assert.deepEqual(wheelFrameDelta(10, 0, 80), { accumulated: 10, move: 0 });
});

test('prompt captions quote filename summaries and indicate the shared capture limit', async () => {
  const { theaterCaption, theaterCaptionLead } = await import('../src/features/iteration-gallery/theater-layout.ts');
  assert.equal(theaterCaptionLead({ kind: 'prompt', number: 63 }), 'Prompt #63: ');
  assert.equal(theaterCaptionLead({ kind: 'push', number: 15 }), 'Push #15: ');
  assert.equal(theaterCaptionLead({ kind: 'capture', number: 2 }), '');
  const { captureSummaryMaxLength: max } = await import('../src/shared/capture-format.mjs');
  assert.equal(theaterCaption({ kind: 'prompt', summary: 'Short prompt' }), '"Short prompt"');
  assert.equal(theaterCaption({ kind: 'prompt', summary: 'x'.repeat(max) }), `"${'x'.repeat(max)}..."`);
  assert.equal(theaterCaption({ kind: 'prompt', summary: 'x'.repeat(max + 5) }), `"${'x'.repeat(max)}..."`);
  assert.equal(theaterCaption({ kind: 'push', summary: 'Commit message' }), 'Commit message');
});
