import test from 'node:test';
import assert from 'node:assert/strict';
import { galleryTokens as t } from '../src/features/iteration-gallery/tokens.ts';
import { adjacentTimelineIndex, timelineScrollWindow, timelineWheelDelta, adjacentPushIndex, buildTimeline, fitTimeline, nearestTimelineFrame, timelineBranch, timelinePointerIndex, timelineRangeLabelAt, timelineDisabledRegions } from '../src/features/iteration-gallery/timeline.ts';

test('version jumps target adjacent saved pushes, including the current version closing push', () => {
  const frames = ['prompt', 'push', 'prompt', 'prompt', 'push', 'prompt', 'push'].map(kind => ({ kind: kind as 'prompt' | 'push' }));
  assert.equal(adjacentTimelineIndex(frames, 3, -1, 'frame'), 2);
  assert.equal(adjacentTimelineIndex(frames, 3, 1, 'frame'), 4);
  assert.equal(adjacentTimelineIndex(frames, 3, -1, 'version'), 1);
  assert.equal(adjacentTimelineIndex(frames, 3, 1, 'version'), 4);
  assert.equal(adjacentTimelineIndex(frames, 4, -1, 'version'), 1);
  assert.equal(adjacentTimelineIndex(frames, 4, 1, 'version'), 6);
  assert.equal(adjacentTimelineIndex(frames, 0, -1, 'version'), null);
  assert.equal(adjacentTimelineIndex(frames, 6, 1, 'version'), null);
  assert.equal(adjacentTimelineIndex(frames, 6, 1, 'frame'), null);
  assert.equal(adjacentTimelineIndex([{ kind: 'prompt' }, { kind: 'prompt' }], 0, 1, 'version'), null);
  assert.equal(adjacentTimelineIndex([], 0, 1, 'frame'), null);
});

test('overview tracks the visible fraction, clamps overscroll, and fills when all blocks fit', () => {
  assert.deepEqual(timelineScrollWindow(400, 1000, 300), { start: .3, size: .4, maxScroll: 600 });
  assert.deepEqual(timelineScrollWindow(400, 1000, 900), { start: .6, size: .4, maxScroll: 600 });
  assert.deepEqual(timelineScrollWindow(400, 1000, -50), { start: 0, size: .4, maxScroll: 600 });
  assert.deepEqual(timelineScrollWindow(800, 500, 0), { start: 0, size: 1, maxScroll: 0 });
  assert.deepEqual(timelineScrollWindow(1000, 1000, 0), { start: 0, size: 1, maxScroll: 0 });
});

test('unequal commit counts preserve equal version spacing and exact frame lookup', () => {
  const timeline = buildTimeline([{ id: 'a', version: 4 }, { id: 'b', version: 5 }, { id: 'c', version: 5 }, { id: 'd', version: 5 }]);
  const [a, b] = timeline.versions;
  assert.equal(a.start, 0);
  assert.equal(b.end, 1);
  assert.ok(Math.abs((a.end - a.start) - (b.end - b.start)) < 1e-8);
  assert.ok(b.start > a.end);
  assert.deepEqual(timeline.versions.map(v => v.marks.length), [1, 3]);
  const gap = t.blockGap * t.timeline.gapScale;
  assert.ok(Math.abs((b.start - a.end) / (a.end - a.start) - gap / (t.versionDepth - gap)) < 1e-8);
  for (const version of timeline.versions) {
    for (const mark of version.marks) assert.ok(mark.position > version.start && mark.position < version.end);
  }
  // The dense next version has the closest frame even at the start of this gutter.
  assert.equal(nearestTimelineFrame(timeline.marks, a.end), 1);
  assert.equal(nearestTimelineFrame(timeline.marks, b.start), 1);
  for (const mark of timeline.marks) assert.equal(nearestTimelineFrame(timeline.marks, mark.position), mark.index);
  assert.equal(nearestTimelineFrame(timeline.marks, -1), 0);
  assert.equal(nearestTimelineFrame(timeline.marks, 2), 3);
});
test('single frames, empty ranges and nonconsecutive versions need no special fixtures', () => {
  assert.deepEqual(buildTimeline([]), { versions: [], marks: [], pushes: [] });
  assert.equal(buildTimeline([{ id: 'a', version: 9 }]).marks[0].position, .5);
  const timeline = buildTimeline([{ id: 'a', version: 3 }, { id: 'b', version: 8 }]);
  assert.deepEqual(timeline.versions.map(v => v.number), [3, 8]);
  assert.ok(timeline.marks[0].position < .25);
  assert.ok(timeline.marks[1].position > .75);
});

test('off-main frames mark their version block with that branch', () => {
  assert.equal(timelineBranch([{ branch: null }, { branch: 'main' }]), 'main');
  assert.equal(timelineBranch([{ branch: 'main' }, { branch: 'iteration-gallery-prelim-render' }]), 'iteration-gallery-prelim-render');
  const timeline = buildTimeline([
    { id: 'a', version: 1, branch: 'main' },
    { id: 'b', version: 2, branch: 'webgl-3d-implementation' },
  ]);
  assert.deepEqual(timeline.versions.map(version => version.branch), ['main', 'webgl-3d-implementation']);
});

test('out-of-range versions stay on the timeline but reject the playhead', () => {
  const timeline = buildTimeline([
    { id: 'old', version: 1, enabled: false },
    { id: 'recent', version: 2, enabled: true },
  ]);
  assert.equal(timeline.versions[0].enabled, false);
  assert.equal(timeline.versions[1].marks[0].index, 0);
  assert.equal(timelinePointerIndex(timeline, timeline.versions[0].start + .01), null);
  assert.equal(timelinePointerIndex(timeline, timeline.versions[1].marks[0].position), 0);
  assert.equal(timelineRangeLabelAt(timeline.versions), timeline.versions[1].start);
  assert.equal(timelineRangeLabelAt(buildTimeline([{ id: 'a', version: 1 }]).versions), null);
});

test('skip controls find push captures and never fall back to prompt frames', () => {
  const frames = [{ kind: 'prompt' }, { kind: 'push' }, { kind: 'prompt' }, { kind: 'capture' }, { kind: 'push' }, { kind: 'prompt' }] as const;
  const list = [...frames];
  assert.equal(adjacentPushIndex(list, 0, 1), 1);
  assert.equal(adjacentPushIndex(list, 1, 1), 4);
  assert.equal(adjacentPushIndex(list, 3, -1), 1);
  assert.equal(adjacentPushIndex(list, 4, -1), 1);
  assert.equal(adjacentPushIndex(list, 4, 1), null);
  assert.equal(adjacentPushIndex(list, 1, -1), null);
  assert.equal(adjacentPushIndex([{ kind: 'prompt' }], 0, 1), null);
});

test('push targets use the preceding version, keep exact gutter geometry, and float after the last block', () => {
  const timeline = buildTimeline([
    { id: 'p1', version: 3, kind: 'prompt' }, { id: 'push3', version: 3, kind: 'push' },
    { id: 'p2', version: 8, kind: 'prompt' }, { id: 'push8', version: 8, kind: 'push' },
  ]);
  const [first, last] = timeline.pushes;
  assert.equal(first.frameId, 'push3'); assert.equal(first.index, null);
  assert.deepEqual(timeline.versions[0].marks.map(mark => mark.id), ['p1', 'push3']);
  const busy = buildTimeline([
    { id: 'a', version: 1, kind: 'prompt' }, { id: 'b', version: 1, kind: 'prompt' }, { id: 'push', version: 1, kind: 'push' },
  ]);
  assert.deepEqual(busy.versions[0].marks.map(mark => mark.id), ['a', 'b']);
  assert.equal(first.start, timeline.versions[0].end);
  assert.equal(first.end, timeline.versions[1].start);
  assert.equal(timelinePointerIndex(timeline, (first.start + first.end) / 2), null);
  assert.equal(last.start, 1); assert.ok(last.end > 1); assert.equal(last.floating, true);
  assert.ok(Math.abs(last.end - last.start - (first.end - first.start)) < 1e-8);
  assert.equal(timeline.versions.at(-1)!.end, 1);
});

test('push targets never substitute prompt frames for missing or filtered pushes', () => {
  const timeline = buildTimeline([
    { id: 'old', version: 1, kind: 'push', enabled: false },
    { id: 'wip', version: 2, kind: 'prompt' },
  ]);
  assert.deepEqual(timeline.pushes.map(node => node.index), [null, null]);
  assert.equal(timelinePointerIndex(timeline, (timeline.pushes[0].start + timeline.pushes[0].end) / 2), null);
  const single = buildTimeline([{ id: 'only', version: 19, kind: 'push' }]);
  assert.equal(single.pushes[0].index, null); assert.equal(single.pushes[0].frameId, 'only'); assert.equal(single.pushes[0].start, 1);
  assert.deepEqual(single.versions[0].marks.map(mark => mark.id), ['only']);
});


test('responsive slots fit the final push and center rulers without gutter overlap', () => {
  for (const count of [1, 7, 20, 40, 200]) for (const width of [240, 620, 1400]) {
    const sizing = fitTimeline(count, width);
    const frames = Array.from({ length: count }, (_, i) => [
      { id: `a${i}`, version: i + 1 }, { id: `b${i}`, version: i + 1 },
      { id: `p${i}`, version: i + 1, kind: 'push' as const },
    ]).flat();
    const timeline = buildTimeline(frames, sizing.gapDepth);
    const trackWidth = width * sizing.contentScale * sizing.trackFraction;
    assert.ok(Math.abs(timeline.pushes.at(-1)!.end * trackWidth - width * sizing.contentScale) < 1e-8);
    for (const [i, version] of timeline.versions.entries()) {
      const rulersCenter = version.marks.reduce((sum, mark) => sum + mark.position, 0) / version.marks.length;
      assert.ok(Math.abs(rulersCenter - (version.start + version.end) / 2) < 1e-8);
      assert.ok(version.end > version.start);
      const push = timeline.pushes[i];
      assert.equal(push.start, version.end);
      if (i + 1 < count) assert.equal(push.end, timeline.versions[i + 1].start);
      for (const mark of version.marks) assert.equal(timelinePointerIndex(timeline, mark.position), mark.index);
    }
  }
});


test('at most twenty equal version slots fit before horizontal scrolling starts', () => {
  const width = 600;
  assert.equal(fitTimeline(20, width).contentScale, 1);
  assert.equal(fitTimeline(40, width).contentScale, 2);
  const twenty = fitTimeline(20, width), forty = fitTimeline(40, width);
  assert.equal(twenty.gapDepth, forty.gapDepth);
});


test('timeline wheel input maps vertical mouse scrolling and horizontal trackpads without doubling diagonal motion', () => {
  assert.equal(timelineWheelDelta(0, 120, 0, 600), 120);
  assert.equal(timelineWheelDelta(-80, 3, 0, 600), -80);
  assert.equal(timelineWheelDelta(2, -3, 1, 600), -48);
  assert.equal(timelineWheelDelta(0, 1, 2, 600), 600);
});

test('range recovery left-aligns the first enabled block, or shows the end when the range cannot fill the viewport', async () => {
  const { timelineRangeScroll } = await import('../src/features/iteration-gallery/timeline.ts');
  const versions = [{enabled:false,start:0},{enabled:true,start:.8},{enabled:true,start:.9}];
  assert.deepEqual(timelineRangeScroll(versions,400,1000,980),{left:600});
  assert.deepEqual(timelineRangeScroll([{enabled:true,start:.2}],400,1000,980),{left:196});
  assert.deepEqual(timelineRangeScroll([{enabled:true,start:0}],400,1000,980),{left:0});
  assert.deepEqual(timelineRangeScroll(versions,1000,1000,980),{left:0});
  assert.equal(timelineRangeScroll([{enabled:false,start:0}],400,1000,980),null);
  assert.equal(timelineRangeScroll([],400,1000,980),null);
});


test('disabled region outlines merge neighboring versions but never enclose enabled ones', () => {
  const versions = [false, false, true, false, false].map((enabled, i) => ({ enabled, start: i * .2, end: i * .2 + .18 }));
  assert.deepEqual(timelineDisabledRegions(versions), [{ start: 0, end: versions[1].end }, { start: versions[3].start, end: versions[4].end }]);
  assert.deepEqual(timelineDisabledRegions([]), []);
  assert.deepEqual(timelineDisabledRegions(versions.map(v => ({ ...v, enabled: true }))), []);
  assert.deepEqual(timelineDisabledRegions(versions.map(v => ({ ...v, enabled: false }))), [{ start: 0, end: versions[4].end }]);
});

test('milestone jumps and unit autoplay step between the pushes of milestone versions', async () => {
  const { adjacentTimelineIndex, unitPlaybackStep, firstJumpIndex } = await import('../src/features/iteration-gallery/timeline.ts');
  const frames = [
    { kind: 'prompt' as const, version: 1 }, { kind: 'push' as const, version: 1 },
    { kind: 'prompt' as const, version: 2 }, { kind: 'push' as const, version: 2 },
    { kind: 'prompt' as const, version: 3 }, { kind: 'push' as const, version: 3 },
  ];
  const milestone = (version: number) => version !== 2;
  assert.equal(adjacentTimelineIndex(frames, 0, 1, 'milestone', milestone), 1);
  assert.equal(adjacentTimelineIndex(frames, 1, 1, 'milestone', milestone), 5);
  assert.equal(adjacentTimelineIndex(frames, 5, -1, 'milestone', milestone), 1);
  assert.equal(adjacentTimelineIndex(frames, 1, 1, 'milestone'), null);
  assert.equal(firstJumpIndex(frames, 'milestone', milestone), 1);
  assert.equal(firstJumpIndex(frames, 'version', milestone, -1), 5);
  assert.deepEqual(unitPlaybackStep(frames, 1, 1, 'version', 'once'), { index: 3, direction: 1, playing: true });
  assert.deepEqual(unitPlaybackStep(frames, 5, 1, 'version', 'once'), { index: 5, direction: 1, playing: false });
  assert.deepEqual(unitPlaybackStep(frames, 5, 1, 'milestone', 'loop', milestone), { index: 1, direction: 1, playing: true });
  assert.deepEqual(unitPlaybackStep(frames, 5, 1, 'version', 'ping-pong'), { index: 3, direction: -1, playing: true });
  assert.deepEqual(unitPlaybackStep([{ kind: 'prompt' as const, version: 1 }], 0, 1, 'version', 'loop'), { index: 0, direction: 1, playing: false });
});

test('a capture version milestone prefers the saved text, honors deletions, and falls back to the seeded label', async () => {
  const { versionMilestone, captureMilestoneKey } = await import('../src/features/version-tree/idea-stream.ts');
  assert.equal(versionMilestone({ [captureMilestoneKey(34)]: '  Ship it ' }, 34), 'Ship it');
  assert.equal(versionMilestone({ [captureMilestoneKey(10)]: '' }, 10), '');
  assert.equal(versionMilestone({}, 10), 'Save a copy of the codebase on every push');
  assert.equal(versionMilestone({}, 9), '');
});


test('milestone fit keeps every push inside the viewport even in narrow panels', () => {
  for (const count of [1, 20, 45, 200]) for (const width of [240, 620, 1400]) {
    const sizing = fitTimeline(count, width, true);
    const timeline = buildTimeline(Array.from({ length: count }, (_, i) => ({ id: `p${i}`, version: i + 1, kind: 'push' as const })), sizing.gapDepth);
    const trackWidth = width * sizing.contentScale * sizing.trackFraction;
    assert.equal(sizing.contentScale, 1);
    for (const push of timeline.pushes) {
      assert.ok(push.start >= 0 && push.end > push.start);
      assert.ok(push.end * trackWidth <= width + 1e-8);
    }
    assert.ok(Math.abs(timeline.pushes.at(-1)!.end * trackWidth - width) < 1e-8);
  }
});
