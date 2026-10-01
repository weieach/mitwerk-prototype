import type { AnnotationFrame, AnnotationState } from './model.ts';
import { annotationFrame } from './model.ts';
// Requested demo content is separate from the general annotation behavior.
const samples = [{ key: 'review-frame-controls', prompt: 240, todo: true, text: 'Check the Select frame menu and endpoint arrows at narrow panel widths. Keep the controls readable and keyboard accessible.' },
  { key: 'preserve-frame-context', prompt: 240, todo: false, text: 'The compact footer leaves more room for the visual history. Preserve this frame as a reference when refining the annotation and playback controls.' },
  { key: 'consistent-sidebar-icons', prompt: 225, todo: true, text: 'Check that folder and chat icons share the same size. Keep the project name unchanged on hover and dim only its arrow.' },
  { key: 'quiet-gallery-outlines', prompt: 225, todo: false, text: 'The lighter block outlines make the saved frames easier to scan. Keep this balance when adding more bookmarks to the gallery.' },
  { key: 'retained-task-context', prompt: 252, todo: true, text: 'Verify that attaching a different to-do updates Task details, and that removing the composer chip preserves the selected task and its status.' },
  { key: 'consistent-mit-tags', prompt: 252, todo: false, text: 'The shared hue helps the Mit roles feel related. Preserve the subtle accent differences and light borders across all conversation outputs.' }];
export function seedAnnotationSamples(state: AnnotationState, frames: AnnotationFrame[]): AnnotationState {
  let next = state;
  for (const sample of samples) {
    if (next.seeded.includes(sample.key)) continue;
    const frame = frames.find(frame => frame.kind === 'prompt' && frame.number === sample.prompt);
    if (!frame) continue;
    const date = new Date(frame.timestamp).toISOString();
    next = { items: [...next.items, { id: `sample-${sample.key}`, frame: annotationFrame(frame), text: sample.text, todo: sample.todo, status: 'To do', projectId: 'mobile', createdAt: date, updatedAt: date }], seeded: [...next.seeded, sample.key] };
  }
  return next;
}
