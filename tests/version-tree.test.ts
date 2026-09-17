import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGraphState, graphReducer, graphStorageKey, loadGraphState, parseStoredGraphState, saveGraphState } from '../src/features/version-tree/model.ts';
import { createTestGraphState } from './graph-fixture.ts';
import { geometry, layoutGraph } from '../src/features/version-tree/layout.ts';
import { treeTheme } from '../src/features/version-tree/tokens.ts';

const getNode = (state, id) => {
  const node = state.nodes.find(candidate => candidate.id === id);
  assert.ok(node, `Expected node ${id}`);
  return node;
};

const routePoints = path => {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g).map(Number);
  return Array.from({ length: numbers.length / 2 }, (_, i) => numbers.slice(i * 2, i * 2 + 2));
};

test('prototype starts with two references and fills only the extended empty node', () => {
  const initial = createInitialGraphState();
  assert.equal(initial.nodes[0].files.filter(file => file.kind === 'reference').length, 2);
  for (const type of ['add-branch', 'add-commit']) {
    const first = graphReducer(initial, { type, sourceId: initial.selectedId });
    const empty = getNode(first, first.selectedId);
    assert.equal(empty.title, '');
    assert.deepEqual(empty.files, []);
    const next = graphReducer(first, { type, sourceId: empty.id });
    const filled = getNode(next, empty.id);
    assert.ok(filled.title && filled.summary && filled.prompts.length);
    assert.equal(filled.files.filter(file => file.kind === 'reference').length, 2);
    assert.equal(getNode(next, next.selectedId).title, '');
    assert.equal(empty.title, '', 'Previous state remains immutable');
    assert.notEqual(filled.files, initial.nodes[0].files);
    assert.notEqual(filled.files[0], initial.nodes[0].files[0]);
    assert.equal(getNode(next, 'v1'), initial.nodes[0], 'Populated content is preserved');
  }
});

function assertGraphInvariants(state) {
  const layout = layoutGraph(state.nodes);
  assert.equal(new Set(state.nodes.map(node => node.id)).size, state.nodes.length);
  assert.equal(new Set(state.nodes.map(node => node.label)).size, state.nodes.length);
  assert.equal(new Set(layout.nodes.map(node => `${node.column}:${node.row}`)).size, state.nodes.length);
  assert.equal(layout.edges.length, state.nodes.length - 1);
  if (state.selectedId !== null) assert.ok(state.nodes.some(node => node.id === state.selectedId));
  for (const node of layout.nodes) {
    assert.ok(node.x >= 0 && node.y >= 0);
    assert.ok(node.x + geometry.cardOffsetX + geometry.cardWidth < layout.width);
    assert.ok(node.y + geometry.cardOffsetY + geometry.cardHeight < layout.height);
    if (!node.parentId) continue;
    const parent = getNode(layout, node.parentId);
    if (node.relation === 'commit') {
      assert.equal(node.x, parent.x, 'A commit continues its parent’s vertical line');
      assert.equal(node.row, parent.row + 1, 'A commit is immediately below its parent');
      assert.equal(node.branchId, parent.branchId);
    } else {
      assert.equal(node.y, parent.y, 'A branch stays on its parent’s horizontal level');
      assert.ok(node.x > parent.x, 'A branch has a new column to the right');
      assert.notEqual(node.branchId, parent.branchId);
    }
  }
  return layout;
}

test('seed versions form two branches and three vertical levels', () => {
  const state = createTestGraphState();
  const layout = assertGraphInvariants(state);
  assert.equal(layout.nodes.length, 4);
  assert.equal(new Set(layout.nodes.map(node => node.column)).size, 2);
  assert.equal(new Set(layout.nodes.map(node => node.row)).size, 3);
  assert.equal(state.selectedId, 'v2');
  assert.deepEqual(layout, layoutGraph(state.nodes), 'Layout is deterministic');
});

test('branch actions create empty versions and keep existing positions stable', () => {
  let state = createTestGraphState();
  const before = layoutGraph(state.nodes);
  for (let i = 0; i < 5; i += 1) {
    state = graphReducer(state, { type: 'add-branch', sourceId: 'v2' });
    const newNode = getNode(state, state.selectedId);
    assert.equal(newNode.title, '');
    assert.equal(newNode.summary, '');
    assert.equal(newNode.createdAt, '');
    assert.deepEqual(newNode.files, []);
    assert.deepEqual(newNode.prompts, []);
    const after = assertGraphInvariants(state);
    for (const previous of before.nodes) {
      const current = getNode(after, previous.id);
      assert.deepEqual([current.x, current.y], [previous.x, previous.y]);
    }
  }
});

test('inserting a commit preserves descendants and shifts only its continuation', () => {
  const before = createTestGraphState();
  const state = graphReducer(before, { type: 'add-commit', sourceId: 'v2' });
  const inserted = getNode(state, state.selectedId);
  assert.equal(inserted.parentId, 'v2');
  assert.equal(inserted.branchId, 'main');
  assert.equal(getNode(state, 'v3').parentId, inserted.id);
  assert.equal(getNode(state, 'v2-1').parentId, 'v2');
  assert.equal(getNode(before, 'v3').parentId, 'v2', 'Reducer does not mutate old state');
  const layout = assertGraphInvariants(state);
  assert.equal(getNode(layout, 'v3').row, 3);
  assert.equal(getNode(layout, 'v2-1').row, 1);
});

test('repeated commits at one station form a connected line without overlapping', () => {
  let state = createTestGraphState();
  for (let i = 0; i < 30; i += 1) {
    state = graphReducer(state, { type: 'add-commit', sourceId: 'v2' });
    assertGraphInvariants(state);
  }
  const current = getNode(state, state.selectedId);
  assert.equal(current.parentId, 'v2');
  assert.equal(getNode(layoutGraph(state.nodes), 'v3').row, 32);
});

test('nested branching and commits preserve spatial invariants as the graph grows', () => {
  let state = createTestGraphState();
  let random = 91827;
  for (let i = 0; i < 160; i += 1) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const sourceId = state.nodes[random % state.nodes.length].id;
    state = graphReducer(state, { type: i % 3 === 0 ? 'add-branch' : 'add-commit', sourceId });
    assertGraphInvariants(state);
  }
  assert.equal(state.nodes.length, 164);
});

test('stations and connector bends land on actual isometric grid intersections', () => {
  let state = createTestGraphState();
  for (const sourceId of ['v1', 'v2', 'v3', 'v2-1']) {
    state = graphReducer(state, { type: 'add-branch', sourceId });
    state = graphReducer(state, { type: 'add-commit', sourceId: state.selectedId });
    state = graphReducer(state, { type: 'add-branch', sourceId: state.selectedId });
  }
  const layout = layoutGraph(state.nodes);
  const points = [
    ...layout.nodes.map(node => [node.x, node.y]),
    ...layout.edges.flatMap(edge => routePoints(edge.path)),
  ];
  for (const [x, y] of points) {
    const latticeX = x / geometry.gridUnit;
    const latticeY = y / geometry.gridRise;
    assert.ok(Math.abs(latticeX - Math.round(latticeX)) < 0.00001, 'Point lies on a grid column');
    assert.ok(Math.abs(latticeY - Math.round(latticeY)) < 0.00001, 'Point lies on a grid row');
    // In the repeating X pattern, odd columns intersect diagonals on odd
    // rows, and even columns on even rows. Integer coordinates alone are
    // insufficient: opposite parity would shift routes half a tile off-grid.
    assert.equal((Math.round(latticeX) + Math.round(latticeY)) % 2, 0,
      `Point (${x}, ${y}) lies on the diagonal grid intersection`);
  }
});

function segmentIntersectsCard(a, b, card) {
  // Clip the line to the interior of a rectangle. This catches diagonal routes
  // as well as vertical and horizontal lines, without approximate sampling.
  let min = 0;
  let max = 1;
  for (const [axis, low, high] of [[0, card.left, card.right], [1, card.top, card.bottom]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 0.00001) {
      if (a[axis] <= low || a[axis] >= high) return false;
    } else {
      const enter = (low - a[axis]) / delta;
      const exit = (high - a[axis]) / delta;
      min = Math.max(min, Math.min(enter, exit));
      max = Math.min(max, Math.max(enter, exit));
      if (max <= min) return false;
    }
  }
  return max > min;
}

test('routes follow the isometric axes and avoid every metadata card', () => {
  let state = createTestGraphState();
  for (const sourceId of ['v1', 'v2', 'v3', 'v2-1']) {
    state = graphReducer(state, { type: 'add-branch', sourceId });
    state = graphReducer(state, { type: 'add-commit', sourceId: state.selectedId });
    state = graphReducer(state, { type: 'add-branch', sourceId: state.selectedId });
  }
  const layout = assertGraphInvariants(state);
  const cards = layout.nodes.map(node => ({
    id: node.id,
    // Reserve the full tokenized route width and its outer clearance.
    left: node.x + geometry.cardOffsetX - treeTheme.routeWidth / 2 - treeTheme.routeClearance,
    right: node.x + geometry.cardOffsetX + geometry.cardWidth + treeTheme.routeWidth / 2 + treeTheme.routeClearance,
    top: node.y + geometry.cardOffsetY - treeTheme.routeWidth / 2 - treeTheme.routeClearance,
    bottom: node.y + geometry.cardOffsetY + geometry.cardHeight + treeTheme.routeWidth / 2 + treeTheme.routeClearance,
  }));
  for (const edge of layout.edges) {
    const points = routePoints(edge.path);
    const source = getNode(layout, edge.sourceId);
    const target = getNode(layout, edge.targetId);
    assert.ok(Math.abs(points[0][0] - source.x) < 0.001);
    assert.ok(Math.abs(points[0][1] - source.y) < 0.001);
    assert.ok(Math.abs(points.at(-1)[0] - target.x) < 0.001);
    assert.ok(Math.abs(points.at(-1)[1] - target.y) < 0.001);
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const dx = Math.abs(b[0] - a[0]);
      const dy = Math.abs(b[1] - a[1]);
      assert.ok(dx < 0.001 || dy < 0.001 || Math.abs(dy / dx - 1 / Math.sqrt(3)) < 0.0001,
        'Each route segment follows a vertical, horizontal, or 30-degree axis');
      for (const card of cards) {
        assert.equal(segmentIntersectsCard(a, b, card), false, `Route ${edge.id} intersects card ${card.id}`);
      }
    }
  }
});

test('selection, stale actions, and reset are safe and immutable', () => {
  const original = createTestGraphState();
  assert.equal(graphReducer(original, { type: 'select', id: 'missing' }), original);
  assert.equal(graphReducer(original, { type: 'add-branch', sourceId: 'missing' }), original);
  const selected = graphReducer(original, { type: 'select', id: 'v1' });
  assert.equal(selected.selectedId, 'v1');
  assert.equal(original.selectedId, 'v2');
  const cleared = graphReducer(selected, { type: 'select', id: null });
  assert.equal(cleared.selectedId, null);
  assert.equal(graphReducer(cleared, { type: 'select', id: null }), cleared);
  const reset = graphReducer(selected, { type: 'reset' });
  assert.deepEqual(reset, createInitialGraphState());
  assert.notEqual(reset.nodes, original.nodes);
  assert.notEqual(reset.nodes[0].files, original.nodes[0].files);
});

test('graph state is restored from storage and ignores corrupt snapshots', () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value); },
  };
  const grown = graphReducer(createInitialGraphState(), { type: 'add-commit', sourceId: 'v1' });
  saveGraphState(grown, storage);
  assert.equal(memory.has(graphStorageKey), true);
  const restored = loadGraphState(storage);
  assert.deepEqual(restored, grown);
  assert.notEqual(restored.nodes, grown.nodes);

  memory.set(graphStorageKey, '{not json');
  assert.deepEqual(loadGraphState(storage), createInitialGraphState());
  assert.equal(parseStoredGraphState({ nodes: [], selectedId: null }), null);
  assert.equal(parseStoredGraphState({ nodes: grown.nodes, selectedId: 'missing' })?.selectedId, 'v1');
  const missingParent = { nodes: grown.nodes.map(node => node.id === grown.selectedId ? { ...node, parentId: 'missing' } : node), selectedId: grown.selectedId };
  assert.equal(parseStoredGraphState(missingParent), null);
});

test('invalid ancestry gives a clear error instead of an infinite layout traversal', () => {
  const state = createTestGraphState();
  assert.throws(() => layoutGraph([...state.nodes, state.nodes[0]]), /unique/);
  const missingParent = state.nodes.map(node => node.id === 'v1' ? { ...node, parentId: 'missing' } : node);
  assert.throws(() => layoutGraph(missingParent), /Missing parent/);
  const cycle = state.nodes.map(node => node.id === 'v1' ? { ...node, parentId: 'v3' } : node);
  assert.throws(() => layoutGraph(cycle), /cycle/);
});
