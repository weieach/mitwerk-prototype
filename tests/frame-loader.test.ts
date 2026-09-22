import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FrameLoader } from '../src/features/iteration-gallery/frame-loader.ts';

test('concurrent playback and preloading wait for the same decoded image', async () => {
  let finish!: (image: HTMLImageElement) => void;
  let calls = 0;
  const loader = new FrameLoader(3, () => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = loader.load('frame.png');
  assert.equal(loader.load('frame.png'), first);
  let ready = false;
  void first.then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false);
  const image = {} as HTMLImageElement;
  finish(image);
  assert.equal(await first, image);
  assert.equal(calls, 1);
});

test('decode failures can be retried and the image cache stays bounded', async () => {
  const calls: string[] = [];
  const loader = new FrameLoader(2, async url => {
    calls.push(url);
    if (calls.length === 1) throw new Error('temporary load failure');
    return {} as HTMLImageElement;
  });
  await assert.rejects(loader.load('a'));
  await loader.load('a');
  await loader.load('b');
  await loader.load('a'); // recently used images remain resident
  await loader.load('c');
  await loader.load('b');
  assert.deepEqual(calls, ['a', 'a', 'b', 'c', 'b']);
});
