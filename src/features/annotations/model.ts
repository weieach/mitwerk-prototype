import type { GalleryFrame } from '../iteration-gallery/model.ts';
import { captureMilestoneKey } from '../version-tree/idea-stream.ts';
export type AnnotationStatus = 'To do' | 'In progress' | 'Ready for review' | 'Complete';
export type AnnotationKind = 'note' | 'todo' | 'milestone';
export type AnnotationFrame = Pick<GalleryFrame, 'id' | 'url' | 'number' | 'kind' | 'version' | 'summary' | 'timestamp'>;
export type FrameAnnotation = {
  id: string; frame: AnnotationFrame; text: string; todo: boolean; kind?: AnnotationKind; status: AnnotationStatus;
  createdAt: string; updatedAt: string; chatId?: string; projectId?: string;
};
export type AnnotationState = { items: FrameAnnotation[]; seeded: string[] };
export const annotationStorageKey = 'mitwerk-frame-annotations-v1';
export const emptyAnnotations: AnnotationState = { items: [], seeded: [] };
/** Only clear a linked milestone if it still contains this annotation's text. */
export function annotationMilestones(previous: AnnotationState, next: AnnotationState, saved: Record<string, string>) {
  const result = { ...saved };
  for (const note of previous.items.filter(note => note.kind === 'milestone')) {
    const replacement = next.items.find(item => item.id === note.id);
    if (replacement?.kind === 'milestone' && replacement.text === note.text) continue;
    const key = captureMilestoneKey(note.frame.version);
    if (result[key] === note.text) result[key] = '';
  }
  for (const note of next.items.filter(note => note.kind === 'milestone')) {
    const original = previous.items.find(item => item.id === note.id);
    if (original?.kind === 'milestone' && original.text === note.text) continue;
    result[captureMilestoneKey(note.frame.version)] = note.text;
  }
  return result;
}
export function annotationFrame(frame: AnnotationFrame): AnnotationFrame {
  const { id, url, number, kind, version, summary, timestamp } = frame;
  return { id, url, number, kind, version, summary, timestamp };
}
export function saveAnnotation(state: AnnotationState, input: FrameAnnotation): AnnotationState {
  const text = input.text.trim();
  if (!text) return state;
  const kind: AnnotationKind = input.kind === 'milestone' ? 'milestone' : input.todo ? 'todo' : 'note';
  const note = { ...input, text, kind, todo: kind === 'todo', frame: annotationFrame(input.frame) };
  return { ...state, items: state.items.some(item => item.id === note.id)
    ? state.items.map(item => item.id === note.id ? note : item) : [...state.items, note] };
}
export function removeAnnotation(state: AnnotationState, id: string): AnnotationState {
  return { ...state, items: state.items.filter(item => item.id !== id) };
}
export function annotationContext(note: FrameAnnotation) {
  return `[Frame annotation ${note.id}]\n${note.frame.kind === 'prompt' ? 'Prompt' : 'Frame'} #${note.frame.number ?? '—'} · v${note.frame.version}\n${note.frame.summary}\nReference: ${note.frame.url}\n\n${note.text}`;
}
export function appendAnnotationContext(draft: string, note: FrameAnnotation) {
  const context = annotationContext(note);
  return draft.includes(`[Frame annotation ${note.id}]`) ? draft : [draft.trim(), context].filter(Boolean).join('\n\n');
}
