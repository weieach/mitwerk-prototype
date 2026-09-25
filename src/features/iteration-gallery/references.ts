import type { GalleryFrame } from './model';

export type VisualReference = { name: string; url: string; prompt: number };

export function promptReferences(references: VisualReference[], prompts: number[]) {
  const wanted = new Set(prompts);
  return [...new Map(references.filter(file => wanted.has(file.prompt)).map(file => [file.url, file])).values()];
}

/** A prompt shows its own attachments; a push shows attachments from its version. */
export function frameReferences(frame: GalleryFrame, catalog: GalleryFrame[], references: VisualReference[]) {
  const prompts = frame.kind === 'push' ? catalog.filter(item => item.version === frame.version && item.kind === 'prompt') : [frame];
  return promptReferences(references, prompts.flatMap(item => item.kind === 'prompt' && item.number !== null ? [item.number] : []));
}
