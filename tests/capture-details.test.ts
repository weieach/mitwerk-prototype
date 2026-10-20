import test from 'node:test';
import assert from 'node:assert/strict';
import { inferCaptureDetails } from '../src/features/workbench/capture-details.ts';

test('capture details follow first mention order and limit distinct keywords to two', () => {
  assert.equal(inferCaptureDetails('Fix LIVE SERVER first, then playback, then the gallery in dark mode.'), 'live server and playback');
  assert.equal(inferCaptureDetails('Gallery, GALLERY, then Idea Stream and playback'), 'gallery and idea stream');
});

test('capture details recognize complete phrases across whitespace, not partial words', () => {
  assert.equal(inferCaptureDetails('Use Dark\nMode in the idea   stream.'), 'dark mode and idea stream');
  assert.equal(inferCaptureDetails('galleryish playbacker live servers dark model'), 'default view');
});

test('empty drafts restore the placeholder; nonmatching messages use the default view', () => {
  assert.equal(inferCaptureDetails('  \n '), '');
  assert.equal(inferCaptureDetails('Increase the max width of chat panel'), 'default view');
  assert.equal(inferCaptureDetails('Check keyboard navigation in playback'), 'playback');
});
