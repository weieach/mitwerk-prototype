import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaptureHistory, refreshCaptureHistory } from '../src/features/version-tree/capture-history.ts';
import { createInitialGraphState } from '../src/features/version-tree/model.ts';
import { captureTreeMode, createTreePanels, panelReducer, loadTreePanels, panelStorageKey } from '../src/features/version-tree/panel-state.ts';
import { layoutGraph } from '../src/features/version-tree/layout.ts';
import type { Capture } from '../src/features/iteration-gallery/model.ts';
const frame = (id: string, kind: Capture['kind'], number: number, timestamp: number, branch: string | null = null): Capture => ({ id, filename: id, url: `gallery/images/${id}`, kind, number, timestamp, branch, summary: id, width: 100, height: 100, added: '1.2k', removed: '5' });

test('capture history groups prompts by push boundary and retains actual version numbers', () => {
  const captures = [frame('prompt-a', 'prompt', 1, 1), frame('push-6', 'push', 6, 2), frame('prompt-b', 'prompt', 2, 3, 'feature'), frame('push-8', 'push', 8, 4, 'feature'), frame('pending', 'prompt', 3, 5)];
  const graph = buildCaptureHistory(captures.reverse());
  assert.deepEqual(graph.nodes.map(node => node.label), ['V6', 'V8', 'V9']);
  assert.deepEqual(layoutGraph(graph.nodes).nodes.map(node => node.label), ['V6', 'V8', 'V9']);
  assert.equal(graph.nodes[0].title, 'push-6');
  assert.equal(graph.nodes[0].prompts.length, 1);
  assert.equal(graph.nodes[0].files[0].url, 'gallery/images/prompt-a');
  assert.deepEqual(graph.nodes[1].capture?.branches, ['feature']);
  assert.equal(graph.nodes[1].capture?.added, '1.2k'); // Do not sum cumulative prompt deltas.
  assert.equal(graph.nodes[2].capture?.pushed, false);
  assert.equal(new Set(graph.nodes.map(node => node.branchId)).size, 1); // No guessed Git forks.
});
test('refresh preserves navigation and the editable sandbox, and handles missing captures', () => {
  const graph = buildCaptureHistory([frame('push', 'push', 1, 1)]);
  const panels = createTreePanels(createInitialGraphState());
  const updated = panelReducer(panels, { type: 'history', graph });
  assert.equal(updated.test, panels.test);
  assert.equal(refreshCaptureHistory({ ...graph, selectedId: graph.nodes[0].id }, graph).selectedId, graph.nodes[0].id);
  assert.equal(refreshCaptureHistory({ ...graph, selectedId: null }, graph).selectedId, null);
  assert.deepEqual(buildCaptureHistory([]).nodes, []);
  const edited = panelReducer(updated, { type: 'graph', mode: 'test', action: { type: 'add-commit', sourceId: panels.test.nodes[0].id } });
  const storage = { getItem: () => JSON.stringify({ ...edited, history: buildCaptureHistory([]) }), setItem: () => {} };
  assert.deepEqual(loadTreePanels(createInitialGraphState(), storage).test, edited.test);
  assert.ok(panelStorageKey);
});
test('progress captures default to history while an explicit debug capture can use Test visual', () => {
  assert.equal(captureTreeMode('?screenshot=1'), 'history');
  assert.equal(captureTreeMode('?screenshot=1&treeMode=test'), 'test');
  assert.equal(captureTreeMode('?treeMode=history'), null);
});
