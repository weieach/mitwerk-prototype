import test from 'node:test';
import assert from 'node:assert/strict';
import { frameReferences } from '../src/features/iteration-gallery/references.ts';
import { buildVersions, parseCaptureName } from '../src/features/iteration-gallery/model.ts';
import { isCaptureImage } from '../src/features/version-tree/model.ts';

const captures = ['[prompt #1] first-2026-09-24-010000.png', '[prompt #2] second-2026-09-24-010100.png', '[push #1] close-2026-09-24-010200.png', '[prompt #3] later-2026-09-24-010300.png'].map(filename => ({ ...parseCaptureName(filename)!, id: filename, filename, url: filename, width: 10, height: 10 }));
const frames = buildVersions(captures).flatMap(version => version.frames);
const refs = [1, 2, 3].map(prompt => ({ prompt, name: `[prompt #${prompt}] plan.png`, url: `gallery/references/${prompt}.png` }));

test('prompt references stay specific while pushes collect only their version references', () => {
  assert.deepEqual(frameReferences(frames[0], frames, refs), [refs[0]]);
  assert.deepEqual(frameReferences(frames[2], frames, refs), refs.slice(0, 2));
  assert.deepEqual(frameReferences(frames[3], frames, refs), [refs[2]]);
  assert.deepEqual(frameReferences(frames[0], frames, []), []);
});
test('linked planning images remain visible while captured screenshots are excluded from card chips', () => {
  assert.equal(isCaptureImage(refs[0]), false);
  assert.equal(isCaptureImage({ name: 'frame.png', url: 'gallery/images/frame.png' }), true);
});
