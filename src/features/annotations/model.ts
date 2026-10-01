import type { GalleryFrame } from '../iteration-gallery/model.ts';
export type AnnotationStatus = 'To do' | 'In progress' | 'Ready for review' | 'Complete';
export type AnnotationFrame = Pick<GalleryFrame, 'id' | 'url' | 'number' | 'kind' | 'version' | 'summary' | 'timestamp'>;
export type FrameAnnotation = {
  id: string; frame: AnnotationFrame; text: string; todo: boolean; status: AnnotationStatus;
  createdAt: string; updatedAt: string; chatId?: string; projectId?: string;
};
export type AnnotationState = { items: FrameAnnotation[]; seeded: string[] };
export const emptyAnnotations: AnnotationState = { items: [], seeded: [] };
export function annotationFrame(frame: AnnotationFrame): AnnotationFrame {
  const { id, url, number, kind, version, summary, timestamp } = frame;
  return { id, url, number, kind, version, summary, timestamp };
}
export function saveAnnotation(state: AnnotationState, input: FrameAnnotation): AnnotationState {
  const text = input.text.trim();
  if (!text) return state;
  const note = { ...input, text, frame: annotationFrame(input.frame) };
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
