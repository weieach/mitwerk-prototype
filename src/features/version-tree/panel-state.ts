import { refreshCaptureHistory } from './capture-history.ts';
import { graphReducer, parseStoredGraphState, type GraphAction, type GraphState } from './model.ts';

export const treeModes = [
  { id: 'test', label: 'Test visual' },
  { id: 'history', label: 'Commit history' },
] as const;
export type TreeMode = typeof treeModes[number]['id'];
export const panelStorageKey = 'mitwerk.version-tree.panels.v1';
export type TreePanels = { mode: TreeMode; test: GraphState; history: GraphState };
export type PanelAction = { type: 'history'; graph: GraphState } | { type: 'switch'; mode: TreeMode } | { type: 'graph'; mode: TreeMode; action: GraphAction };

/** One-time migration: both views start from independent copies of the saved tree. */
export function createTreePanels(seed: GraphState): TreePanels {
  return { mode: 'test', test: structuredClone(seed), history: structuredClone(seed) };
}

export function canEditTree(mode: TreeMode) { return mode === 'test'; }

export function panelReducer(state: TreePanels, event: PanelAction): TreePanels {
  if (event.type === 'history') {
    const history = refreshCaptureHistory(state.history, event.graph);
    return JSON.stringify(history) === JSON.stringify(state.history) ? state : { ...state, history };
  }
  if (event.type === 'switch') return { ...state, mode: event.mode };
  // History navigation is allowed; prototype editing cannot mutate its baseline.
  if (!canEditTree(event.mode) && event.action.type !== 'select' && event.action.type !== 'set-active-branch') return state;
  return { ...state, [event.mode]: graphReducer(state[event.mode], event.action) };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export function loadTreePanels(seed: GraphState, storage: StorageLike | null): TreePanels {
  try {
    const raw = storage?.getItem(panelStorageKey);
    if (raw) {
      const value = JSON.parse(raw);
      const test = parseStoredGraphState(value.test), history = parseStoredGraphState(value.history);
      if (test) return { test, history: history ?? structuredClone(seed), mode: value.mode === 'history' ? 'history' : 'test' };
    }
  } catch { /* Storage may be unavailable or contain an older invalid snapshot. */ }
  return createTreePanels(seed);
}

export function saveTreePanels(state: TreePanels, storage: StorageLike | null) {
  try { storage?.setItem(panelStorageKey, JSON.stringify(state)); } catch { /* Keep working in memory. */ }
}

export function panelBrowserStorage(): StorageLike | null {
  try { return window.localStorage; } catch { return null; }
}

/** Capture mode is explicit and cannot overwrite a person's saved panel preference. */
export function captureTreeMode(search: string): TreeMode | null {
  const params = new URLSearchParams(search);
  return params.get('screenshot') === '1' ? params.get('treeMode') === 'test' ? 'test' : 'history' : null;
}
