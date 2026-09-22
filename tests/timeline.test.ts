import test from 'node:test';
import assert from 'node:assert/strict';
import { adjacentPushIndex, buildTimeline, nearestTimelineFrame } from '../src/features/iteration-gallery/timeline.ts';

test('unequal commit counts preserve equal version spacing and exact frame lookup', () => {
  const timeline = buildTimeline([{ id: 'a', version: 4 }, { id: 'b', version: 5 }, { id: 'c', version: 5 }, { id: 'd', version: 5 }]);
  assert.deepEqual(timeline.versions.map(v => [v.start, v.end, v.marks.length]), [[0, .5, 1], [.5, 1, 3]]);
  for (const mark of timeline.marks) assert.equal(nearestTimelineFrame(timeline.marks, mark.position), mark.index);
  assert.equal(nearestTimelineFrame(timeline.marks, -1), 0);
  assert.equal(nearestTimelineFrame(timeline.marks, 2), 3);
});
test('single frames, empty ranges and nonconsecutive versions need no special fixtures', () => {
  assert.deepEqual(buildTimeline([]), { versions: [], marks: [] });
  assert.equal(buildTimeline([{ id: 'a', version: 9 }]).marks[0].position, .5);
  const timeline = buildTimeline([{ id: 'a', version: 3 }, { id: 'b', version: 8 }]);
  assert.deepEqual(timeline.versions.map(v => v.number), [3, 8]);
  assert.deepEqual(timeline.marks.map(m => m.position), [.25, .75]);
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
