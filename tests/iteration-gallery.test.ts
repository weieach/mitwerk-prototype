import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVersions, formatFrameDate, formatFrameLabel, galleryBranchPaint, hoverCaptionLines, wrapTextToWidth, dateTicks, edgePanArmed, edgePanStrength, promptShare, representativeFrames, inRange, parseCaptureName, playbackStep, rangeCounts, rangeStart, ratioLabel } from '../src/features/iteration-gallery/model.ts';
import type { Capture } from '../src/features/iteration-gallery/model.ts';
import { albumBlockBounds, albumEnvelope, albumFloorY, boxCorners, buildAlbum, containingBlock, coverRadius, dateLabelPose, featuredFrameAxis, frameFocus, hoverCaptionHeight, imageSize, resetCameraDestination, resetLook, versionLabelPose } from '../src/features/iteration-gallery/geometry.ts';
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

test('range counts collapse to one number when the filter includes everything', () => {
  const versions = buildVersions([
    capture('old', 17), capture('p6', 18, 'push', 6), capture('mid', 21), capture('p10', 22, 'push', 10),
  ]);
  const now = date(22);
  const today = rangeCounts(versions, 'today', now);
  assert.equal(today.frames, 1); assert.equal(today.frameTotal, 4);
  assert.equal(today.versions, 1); assert.equal(today.versionTotal, 2);
  assert.equal(ratioLabel(today.frames, today.frameTotal, 'saved frame', 'saved frames'), '1/4 saved frames');
  assert.equal(ratioLabel(today.versions, today.versionTotal, 'version', 'versions'), '1/2 versions');
  const all = rangeCounts(versions, 'all', now);
  assert.equal(ratioLabel(all.frames, all.frameTotal, 'saved frame', 'saved frames'), '4 saved frames');
  assert.equal(ratioLabel(all.versions, all.versionTotal, 'version', 'versions'), '2 versions');
  assert.equal(promptShare(today.frames, today.frameTotal), 0.25);
  assert.equal(promptShare(0, 0), 0);
  assert.equal(galleryBranchPaint('main', ['iteration-gallery-prelim-render']), '#000000');
  assert.notEqual(galleryBranchPaint('iteration-gallery-prelim-render', ['iteration-gallery-prelim-render']), '#000000');
});

test('date ranges include local calendar boundaries and exclude future frames', () => {
  const now = date(22);
  assert.equal(rangeStart('3', now), new Date(2026, 8, 20).getTime());
  assert.equal(inRange(capture('today', 22), 'today', now), true);
  assert.equal(inRange(capture('yesterday', 21), 'today', now), false);
  assert.equal(inRange(capture('future', 23), 'all', now), false);
  assert.equal(inRange(capture('old', 17), '7', now), true);
});

test('image geometry preserves portrait and landscape ratios; frames have shared padding inside every block', () => {
  const portrait = { ...capture('portrait', 21), width: 400, height: 900 };
  for (const frame of [portrait, capture('landscape', 22)]) {
    const size = imageSize(frame);
    assert.ok(Math.abs(size.width / size.height - frame.width / frame.height) < 1e-9);
  }
  const mixed = buildVersions([portrait, capture('p', 21, 'push', 1), capture('landscape', 22)]);
  const album = buildAlbum(mixed, 'all', date(23));
  const envelope = albumEnvelope(mixed);
  assert.ok(album.blocks.every(block => block.width === envelope.width && block.height === envelope.height));
  for (const plane of album.planes) {
    const block = album.blocks.find(item => item.version === plane.frame.version)!;
    assert.equal(plane.x, t.padding);
    assert.equal(plane.y, t.padding);
    assert.equal(plane.width + plane.x * 2, block.width);
    assert.equal(plane.height + plane.y * 2, block.height);
    assert.ok(plane.depth > block.start + t.padding && plane.depth < block.end - t.padding);
  }
  assert.ok(hoverCaptionHeight(240, 400) >= 240 * t.hoverCaptionFrame * t.hoverCaptionScale);
  assert.ok(hoverCaptionHeight(40, 800) >= 800 * t.hoverCaptionViewport * t.hoverCaptionScale);
  assert.ok(hoverCaptionHeight(240, 400) < 240 * t.hoverCaptionFrame);
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
  assert.deepEqual(readCaptureCatalog('/nonexistent-iteration-gallery-test'), { frames: [], ignored: 0, references: [] });
});


test('representative frames sample versions evenly and stay on gallery frames', () => {
  const versions = Array.from({ length: 12 }, (_, index) => ({ number: index + 1, index,
    frames: [
      { ...capture(`prompt-${index}`, 22), version: index + 1, position: index },
      { ...capture(`push-${index}`, 22, 'push'), version: index + 1, position: index + .5 },
    ],
  }));
  const selected = representativeFrames(versions, 'today', date(22, 23));
  assert.deepEqual(selected.map(frame => frame.version), [1, 4, 8, 12]);
  assert.ok(selected.every(frame => frame.kind === 'push'));
  versions[11].frames.pop();
  assert.equal(representativeFrames(versions, 'today', date(22, 23)).at(-1)?.id, 'prompt-11');
  assert.deepEqual(representativeFrames(versions, 'today', date(23)), []);
  assert.equal(representativeFrames(versions.slice(0, 2), 'all', date(22, 23)).length, 1);
  versions[0].frames[1].timestamp = date(23);
  assert.equal(representativeFrames(versions, 'today', date(22, 23))[0].id, 'prompt-0');
});

test('reset look stays on the block volume even when guides extend farther out', () => {
  const versions = buildVersions([capture('a', 17), capture('push', 18, 'push', 6), capture('b', 19)]);
  const album = buildAlbum(versions, 'all', date(22));
  const bounds = albumBlockBounds(album);
  const look = resetLook(album);
  const dest = resetCameraDestination(album);
  assert.deepEqual({ center: dest.center, span: dest.span }, look);
  assert.ok(dest.position.x !== dest.center.x || dest.position.z !== dest.center.z);
  assert.equal(look.center.x, bounds.center.x);
  assert.equal(look.center.z, bounds.center.z);
  assert.equal(look.center.y, bounds.center.y);
  assert.ok(look.center.x > 0 && look.center.x < album.width);
  assert.ok(look.span > 0);
  assert.equal(t.overviewFitScale, 1.2);
  assert.ok(t.webgl.hoverEdgeWidth > t.webgl.edgeWidth);
  const fitPoints = [
    ...boxCorners(bounds),
    { x: bounds.max.x + t.rulerTickLength + t.rulerLabelGap + t.axisTitle.valueGap, y: bounds.min.y, z: bounds.center.z },
    { x: bounds.min.x, y: bounds.max.y + t.rulerTickLength + t.rulerLabelGap + t.axisTitle.valueGap, z: bounds.center.z },
  ];
  assert.equal(look.span, coverRadius(bounds.center, fitPoints) * 2 * t.overviewPadding / t.overviewFitScale);
  const far = { x: bounds.center.x + 800, y: bounds.center.y + 800, z: bounds.center.z };
  assert.ok(coverRadius(bounds.center, [far]) > coverRadius(bounds.center, [{ x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }]));
  const plane = album.planes[0];
  const planeBlock = containingBlock(album, plane);
  assert.ok(planeBlock);
  assert.equal(planeBlock.version, plane.frame.version);
  assert.ok(plane.depth >= planeBlock.start && plane.depth <= planeBlock.end);
  assert.deepEqual(frameFocus(plane), { x: plane.x + plane.width / 2, y: -plane.y - plane.height / 2 + plane.height * t.webgl.frontViewLift, z: -plane.depth });
  const versionPose = versionLabelPose(album, 0);
  assert.equal(versionPose.face, 'ground');
  assert.equal(versionPose.y, albumFloorY(album));
  assert.ok(versionPose.x > album.width);
  const datePose = dateLabelPose(20);
  assert.equal(datePose.face, 'wall');
  assert.equal(datePose.x, 0);
  assert.ok(datePose.y > 0);
  assert.equal(datePose.z, -20);
  const featured = featuredFrameAxis(album, plane);
  assert.equal(featured.date.face, 'wall');
  assert.equal(featured.date.z, -plane.depth);
  assert.equal(featured.date.text, 'Sep 17, 12:00');
  assert.ok(featured.date.y < dateLabelPose(plane.depth).y);
  assert.equal(featured.version.face, 'ground');
  assert.equal(featured.version.z, -plane.depth);
  assert.ok(featured.version.x < versionPose.x);
  assert.equal(featured.version.text, `v${plane.frame.version}`);
});

test('edge travel ramps toward the border and waits for the dwell delay', () => {
  assert.equal(edgePanStrength(300, 300, 600, 600), 0);
  assert.equal(edgePanStrength(-1, 300, 600, 600), 0);
  assert.equal(edgePanStrength(601, 300, 600, 600), 0);
  assert.ok(edgePanStrength(590, 300, 600, 600) > edgePanStrength(550, 300, 600, 600));
  assert.equal(edgePanStrength(600, 300, 600, 600), 1);
  assert.equal(edgePanStrength(0, 0, 0, 0), 0);
  assert.equal(edgePanArmed(0), false);
  assert.equal(edgePanArmed(t.edgePan.delayMs - 1), false);
  assert.equal(edgePanArmed(t.edgePan.delayMs), true);
});

test('saved-frame labels use bracketed versions and dashed local times', () => {
  assert.equal(formatFrameDate(new Date(2026, 8, 17, 16, 41).getTime()), 'Sep 17, 4:41');
  assert.equal(formatFrameLabel({ version: 10, timestamp: new Date(2026, 8, 17, 16, 41).getTime() }), '[v10] - Sep 17, 4:41');
  assert.equal(formatFrameLabel({ version: 11, timestamp: new Date(2026, 8, 22, 10, 7).getTime() }), '[v11] - Sep 22, 10:07');
  assert.equal(formatFrameLabel({ version: 2, timestamp: new Date(2026, 8, 17, 0, 5).getTime() }), '[v2] - Sep 17, 12:05');
});

test('hover captions contain only the quoted summary', () => {
  assert.deepEqual(hoverCaptionLines({ summary: '  short prompt  ' }), [ '"short prompt"']);
  assert.deepEqual(hoverCaptionLines({ summary: 'Commit message' }), [ '"Commit message"']);
});

test('caption wrapping stays within the measured width', () => {
  const measure = (value: string) => value.length;
  assert.deepEqual(wrapTextToWidth('one two three', 7, measure), ['one two', 'three']);
  assert.deepEqual(wrapTextToWidth('supercalifragilistic', 5, measure), ['super', 'calif', 'ragil', 'istic']);
  assert.deepEqual(wrapTextToWidth('fits', 10, measure), ['fits']);
});
