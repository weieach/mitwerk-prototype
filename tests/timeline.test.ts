import test from 'node:test';
import assert from 'node:assert/strict';
import { galleryTokens as t } from '../src/features/iteration-gallery/tokens.ts';
import { adjacentPushIndex, buildTimeline, nearestTimelineFrame, timelineBranch, timelinePointerIndex, timelineRangeLabelAt } from '../src/features/iteration-gallery/timeline.ts';

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
  assert.deepEqual(buildTimeline([]), { versions: [], marks: [] });
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
