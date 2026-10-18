import { annotationStorageKey } from '../features/annotations/model.ts';
import { milestoneStorageKey } from '../features/version-tree/idea-stream.ts';

/** Browser-created milestones last for one page load; notes and to-dos stay saved. */
export function resetPrototypeMilestones(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
  storage.removeItem(milestoneStorageKey);
  const raw = storage.getItem(annotationStorageKey);
  if (!raw) return;
  let state;
  try { state = JSON.parse(raw); } catch { return; }
  if (!Array.isArray(state?.items)) return;
  const items = state.items.filter((item: { kind?: string } | null) => item?.kind !== 'milestone');
  if (items.length !== state.items.length) storage.setItem(annotationStorageKey, JSON.stringify({ ...state, items }));
}

// Imported before App, so stores and initial React state see the reset together.
if (typeof window !== 'undefined') {
  try { resetPrototypeMilestones(localStorage); } catch { /* Storage restrictions must not prevent loading the prototype. */ }
}
