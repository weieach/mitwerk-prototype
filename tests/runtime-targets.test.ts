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

test('prototype version navigation follows saved pushes, deduplicates versions, and stops at either end', async () => {
 const { adjacentPrototypeFrames } = await import('../src/features/iteration-gallery/runtime-targets.ts');
 const frames = [
  {id:'v4',kind:'push',version:4,timestamp:40},
  {id:'prompt',kind:'prompt',version:3,timestamp:30},
  {id:'v1-old',kind:'push',version:1,timestamp:10},
  {id:'v2',kind:'push',version:2,timestamp:20},
  {id:'v1',kind:'push',version:1,timestamp:11},
 ] as GalleryFrame[];
 assert.deepEqual(adjacentPrototypeFrames(frames,2),{previous:frames[4],next:frames[0]});
 assert.deepEqual(adjacentPrototypeFrames(frames,1),{previous:null,next:frames[3]});
 assert.deepEqual(adjacentPrototypeFrames(frames,4),{previous:frames[3],next:null});
 assert.deepEqual(adjacentPrototypeFrames([],4),{previous:null,next:null});
});
