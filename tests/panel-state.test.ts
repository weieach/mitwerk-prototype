import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGraphState, graphStorageKey } from '../src/features/version-tree/model.ts';
import { createTreePanels, loadTreePanels, panelReducer, panelStorageKey, saveTreePanels } from '../src/features/version-tree/panel-state.ts';

test('both panels start with independent copies of the saved tree', () => {
  const seed = createInitialGraphState();
  const panels = createTreePanels(seed);
  assert.deepEqual(panels.test, seed);
  assert.deepEqual(panels.history, seed);
  assert.notEqual(panels.test.nodes, panels.history.nodes);
  assert.notEqual(panels.test.nodes[0].files, seed.nodes[0].files);
});

test('sandbox commits and branches never change history or the seed', () => {
  const seed = createInitialGraphState();
  let panels = createTreePanels(seed);
  const history = JSON.stringify(panels.history);
  const sourceId = seed.nodes[0].id;
  panels = panelReducer(panels, { type: 'graph', mode: 'test', action: { type: 'add-commit', sourceId } });
  panels = panelReducer(panels, { type: 'graph', mode: 'test', action: { type: 'add-branch', sourceId } });
  assert.equal(panels.test.nodes.length, seed.nodes.length + 2);
  assert.equal(JSON.stringify(panels.history), history);
  assert.equal(JSON.stringify(seed), history);
  const testGraph = panels.test;
  panels = panelReducer(panels, { type: 'switch', mode: 'history' });
  assert.equal(panels.test, testGraph);
});

test('history rejects every mutation but allows local navigation', () => {
  const panels = createTreePanels(createInitialGraphState());
  const sourceId = panels.history.nodes[0].id;
  for (const type of ['add-branch', 'add-commit', 'delete-current', 'delete-future', 'revert', 'restore', 'reset'] as const) {
    assert.equal(panelReducer(panels, { type: 'graph', mode: 'history', action: { type, sourceId } }), panels);
  }
  const navigated = panelReducer(panels, { type: 'graph', mode: 'history', action: { type: 'select', id: null } });
  assert.equal(navigated.history.selectedId, null);
  assert.equal(navigated.test, panels.test);
});

test('reload preserves both modes without touching legacy persistence', () => {
  const seed = createInitialGraphState();
  const values = new Map([[graphStorageKey, JSON.stringify(seed)]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  let panels = loadTreePanels(seed, storage);
  panels = panelReducer(panels, { type: 'graph', mode: 'test', action: { type: 'add-commit', sourceId: seed.nodes[0].id } });
  panels = panelReducer(panels, { type: 'switch', mode: 'history' });
  saveTreePanels(panels, storage);
  assert.deepEqual(loadTreePanels(seed, storage), panels);
  assert.equal(values.get(graphStorageKey), JSON.stringify(seed));
  values.set(panelStorageKey, 'invalid');
  assert.deepEqual(loadTreePanels(seed, storage), createTreePanels(seed));
  assert.doesNotThrow(() => saveTreePanels(panels, null));
});
