import { useSyncExternalStore } from 'react';
import { annotationMilestones, annotationStorageKey as key, emptyAnnotations, removeAnnotation, saveAnnotation } from './model';
import { milestoneStorageKey, milestonesChangedEvent, parseMilestones } from '../version-tree/idea-stream';
import type { AnnotationState, FrameAnnotation, AnnotationFrame } from './model';
import { seedAnnotationSamples } from './samples';
function read(): AnnotationState {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(value?.items) && Array.isArray(value?.seeded)) return value;
  } catch { /* A new store can be created without changing workspace data. */ }
  return emptyAnnotations;
}
let state = read();
const listeners = new Set<() => void>();
function emit() { listeners.forEach(listener => listener()); }
function commit(next: AnnotationState) {
  if (next === state) return;
  // Do not claim a saved annotation when storage is unavailable.
  const priorMilestones = localStorage.getItem(milestoneStorageKey);
  const saved = parseMilestones(priorMilestones);
  const milestones = annotationMilestones(state, next, saved);
  const changed = JSON.stringify(saved) !== JSON.stringify(milestones);
  if (changed) localStorage.setItem(milestoneStorageKey, JSON.stringify(milestones));
  try { localStorage.setItem(key, JSON.stringify(next)); }
  catch (error) {
    if (changed) {
      if (priorMilestones === null) localStorage.removeItem(milestoneStorageKey);
      else localStorage.setItem(milestoneStorageKey, priorMilestones);
    }
    throw error;
  }
  state = next; emit();
  if (changed) window.dispatchEvent(new Event(milestonesChangedEvent));
}
window.addEventListener('storage', event => { if (event.key === key) { state = read(); emit(); } });
export function useAnnotations() {
  return useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => state).items;
}
export function putAnnotation(note: FrameAnnotation) { commit(saveAnnotation(state, note)); }
export function deleteAnnotation(id: string) { commit(removeAnnotation(state, id)); }
export function seedAnnotations(frames: AnnotationFrame[]) { commit(seedAnnotationSamples(state, frames)); }
export function updateAnnotation(id: string, changes: Partial<Pick<FrameAnnotation, 'status' | 'chatId'>>) {
  const note = state.items.find(item => item.id === id);
  if (note) putAnnotation({ ...note, ...changes, updatedAt: new Date().toISOString() });
}
