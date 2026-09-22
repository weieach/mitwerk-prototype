import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVersions, dateTicks, inRange, parseCaptureName, playbackStep, rangeStart } from '../src/features/iteration-gallery/model.ts';
import type { Capture } from '../src/features/iteration-gallery/model.ts';
import { buildAlbum, imageSize } from '../src/features/iteration-gallery/geometry.ts';
import { galleryTokens as t } from '../src/features/iteration-gallery/tokens.ts';
import { readCaptureCatalog } from '../server/gallery-catalog.ts';

const date = (day: number, hour = 12) => new Date(2026, 8, day, hour).getTime();
function capture(id: string, day: number, kind: Capture['kind'] = 'prompt', number = 1): Capture {
  return { id, filename: id, url: id, width: 1600, height: 900, timestamp: date(day), kind, number, branch: null, summary: id, added: null, removed: null };
}

test('parses current prompt and push filenames without confusing summary numbers with metadata', () => {
  const prompt = parseCaptureName('[prompt #51] +2.9k-880 · 3 changes · follow up-2026-09-22-091247.png')!;
  assert.equal(prompt.kind, 'prompt'); assert.equal(prompt.number, 51); assert.equal(prompt.branch, null);
  assert.equal(prompt.summary, '3 changes · follow up'); assert.equal(prompt.added, '2.9k'); assert.equal(prompt.removed, '880');
  const branched = parseCaptureName('[prompt #53] iteration-gallery-prelim-render · +702-16 · gallery prelim-2026-09-22-095011.png')!;
  assert.equal(branched.branch, 'iteration-gallery-prelim-render'); assert.equal(branched.summary, 'gallery prelim');
  const push = parseCaptureName('[push #10] 57 files · +416 -61 · saved branch-2026-09-22-091613-v2.png')!;
  assert.equal(push.summary, 'saved branch'); assert.equal(push.number, 10); assert.equal(push.branch, null);
  assert.equal(push.timestamp, new Date(2026, 8, 22, 9, 16, 13).getTime());
});

test('supports legacy captures and rejects invalid dates or unsupported names', () => {
  assert.equal(parseCaptureName('[prompt] earlier format-2026-09-17-120000.png')?.number, null);
  assert.equal(parseCaptureName('Screenshot 2026-09-17 at 16.41.09.png')?.summary, 'Saved project frame');
  for (const name of ['bad.png', '[prompt #1] bad-2026-02-30-120000.png', 'bad-2026-09-17-246099.png', 'clip.gif']) assert.equal(parseCaptureName(name), null);
});

test('push boundaries group frames chronologically and leave a pending version', () => {
  const a = capture('a', 17), push = capture('push', 18, 'push', 6), b = capture('b', 19);
  const versions = buildVersions([b, push, a]);
  assert.deepEqual(versions.map(v => [v.number, v.frames.map(f => f.id)]), [[6, ['a', 'push']], [7, ['b']]]);
  assert.deepEqual(buildVersions([]), []);
  assert.equal(buildVersions([a])[0].number, 1);
});

test('date ranges include local calendar boundaries and exclude future frames', () => {
  const now = date(22);
  assert.equal(rangeStart('3', now), new Date(2026, 8, 20).getTime());
  assert.equal(inRange(capture('today', 22), 'today', now), true);
  assert.equal(inRange(capture('yesterday', 21), 'today', now), false);
  assert.equal(inRange(capture('future', 23), 'all', now), false);
  assert.equal(inRange(capture('old', 17), '7', now), true);
});

test('image geometry preserves portrait and landscape ratios with padding on all sides', () => {
  const portrait = { ...capture('portrait', 21), width: 400, height: 900 };
  for (const frame of [portrait, capture('landscape', 22)]) {
    const size = imageSize(frame);
    assert.ok(Math.abs(size.width / size.height - frame.width / frame.height) < 1e-9);
  }
  const album = buildAlbum(buildVersions([portrait, capture('landscape', 22)]), 'all', date(23));
  const block = album.blocks[0];
  for (const plane of album.planes) {
    assert.ok(plane.x >= t.padding && plane.y >= t.padding);
    assert.ok(plane.x + plane.width <= block.width - t.padding);
    assert.ok(plane.y + plane.height <= block.height - t.padding);
    assert.ok(plane.depth > block.start + t.padding && plane.depth < block.end - t.padding);
  }
});

test('date filtering splits blocks without changing frame depth or version identity', () => {
  const versions = buildVersions([capture('old', 17), capture('new', 22), capture('push', 22, 'push', 10)]);
  const all = buildAlbum(versions, 'all', date(22));
  const today = buildAlbum(versions, 'today', date(22));
  assert.deepEqual(today.blocks.map(b => b.active), [false, true]);
  assert.deepEqual(today.planes.map(p => p.depth), all.planes.map(p => p.depth));
  assert.equal(today.blocks[0].end, today.blocks[1].start);
  assert.equal(today.planes[0].active, false);
  assert.ok(today.planes.slice(1).every(p => p.active));
});

test('version depth stays equal for unequal frame counts; day ticks follow first capture', () => {
  const versions = buildVersions([capture('a', 17), capture('b', 17), capture('p1', 18, 'push', 1), capture('p2', 22, 'push', 2)]);
  const album = buildAlbum(versions, 'all', date(23));
  assert.equal(album.blocks[1].start - album.blocks[0].start, t.versionDepth);
  assert.equal(album.blocks[0].end - album.blocks[0].start, album.blocks[1].end - album.blocks[1].start);
  const ticks = dateTicks(versions.flatMap(v => v.frames));
  assert.deepEqual(ticks.map(tick => tick.id), ['a', 'p1', 'p2']);
  assert.notEqual(ticks[1].position - ticks[0].position, ticks[2].position - ticks[1].position);
});

test('playback wraps, stops and bounces without duplicate endpoints', () => {
  assert.deepEqual(playbackStep(2, 3, 1, 'once'), { index: 2, direction: 1, playing: false });
  assert.deepEqual(playbackStep(2, 3, 1, 'loop'), { index: 0, direction: 1, playing: true });
  assert.deepEqual(playbackStep(2, 3, 1, 'ping-pong'), { index: 1, direction: -1, playing: true });
  assert.deepEqual(playbackStep(0, 3, -1, 'ping-pong'), { index: 1, direction: 1, playing: true });
  assert.equal(playbackStep(0, 1, 1, 'loop').playing, false);
  assert.equal(playbackStep(0, 0, 1, 'loop').playing, false);
});

test('local catalog discovers real PNG dimensions and safely encodes filenames', () => {
  const catalog = readCaptureCatalog(process.cwd());
  for (const frame of catalog.frames) {
    assert.ok(frame.width > 0 && frame.height > 0);
    assert.equal(decodeURIComponent(frame.url.slice('gallery/images/'.length)), frame.filename);
    assert.ok(Number.isFinite(frame.timestamp));
  }
  assert.deepEqual(readCaptureCatalog('/nonexistent-iteration-gallery-test'), { frames: [], ignored: 0 });
});
