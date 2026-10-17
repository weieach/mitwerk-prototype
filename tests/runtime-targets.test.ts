import test from 'node:test';
import assert from 'node:assert/strict';
import { liveFrameIds } from '../src/features/iteration-gallery/runtime-targets.ts';
import { resolveFrameRequest } from '../src/features/iteration-gallery/model.ts';
import type { GalleryFrame, GalleryVersion } from '../src/features/iteration-gallery/model.ts';

test('live entry uses the newest capture and pushed snapshot, regardless of array ordering', () => {
  const frames = [
    { id:'current', kind:'prompt', number:80, timestamp:400 },
    { id:'old-push', kind:'push', number:4, timestamp:100 },
    { id:'push', kind:'push', number:5, timestamp:300 },
    { id:'old-prompt', kind:'prompt', number:79, timestamp:200 },
  ] as GalleryFrame[];
  assert.deepEqual([...liveFrameIds(frames)].sort(), ['current','push']);
  assert.deepEqual([...liveFrameIds([])], []);
  assert.equal(resolveFrameRequest([{frames}] as GalleryVersion[], {live:true})?.id, 'current');
  assert.deepEqual(frames.map(frame => frame.id), ['current','old-push','push','old-prompt']);
});
