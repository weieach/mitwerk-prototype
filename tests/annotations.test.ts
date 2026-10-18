import test from 'node:test';
import assert from 'node:assert/strict';
import { annotationMilestones, appendAnnotationContext, emptyAnnotations, removeAnnotation, saveAnnotation } from '../src/features/annotations/model.ts';
import type { AnnotationFrame, FrameAnnotation } from '../src/features/annotations/model.ts';
import { seedAnnotationSamples } from '../src/features/annotations/samples.ts';
const frame:AnnotationFrame={id:'frame-240',number:240,kind:'prompt',version:26,url:'gallery/frame.png',summary:'Frame controls',timestamp:1000};
const note:FrameAnnotation={id:'one',frame,text:'  Review the footer  ',todo:true,status:'To do',createdAt:'now',updatedAt:'now'};
test('milestone annotations share version identity and preserve independently edited milestones', () => {
 const created = saveAnnotation(emptyAnnotations, {...note, text:'Decision', todo:false, kind:'milestone'});
 const saved = annotationMilestones(emptyAnnotations, created, {});
 assert.equal(saved['capture-version-26'], 'Decision');
 const edited = saveAnnotation(created, {...created.items[0], text:'Updated decision'});
 assert.equal(annotationMilestones(created, edited, saved)['capture-version-26'], 'Updated decision');
 const todo = saveAnnotation(created, {...created.items[0], todo:true, kind:'todo'});
 assert.equal(annotationMilestones(created, todo, saved)['capture-version-26'], '');
 assert.equal(annotationMilestones(created, emptyAnnotations, saved)['capture-version-26'], '');
 assert.equal(annotationMilestones(created, emptyAnnotations, {'capture-version-26':'Independent edit'})['capture-version-26'], 'Independent edit');
 assert.equal(annotationMilestones(created, created, {'capture-version-26':'Independent edit'})['capture-version-26'], 'Independent edit');
});
test('annotation updates keep frame identity, todo state and chat association without duplication',()=>{
 const created=saveAnnotation(emptyAnnotations,note);
 assert.equal(created.items[0].text,'Review the footer');
 const edited=saveAnnotation(created,{...created.items[0],text:'Revised note',todo:false,chatId:'chat-1'});
 assert.equal(edited.items.length,1);assert.equal(edited.items[0].frame.id,frame.id);assert.equal(edited.items[0].todo,false);assert.equal(edited.items[0].chatId,'chat-1');
 assert.equal(saveAnnotation(edited,{...note,text:'  '}),edited);
 assert.equal(removeAnnotation(edited,note.id).items.length,0);
 assert.equal(edited.items[0].kind,'note');
 const milestone=saveAnnotation(edited,{...note,kind:'milestone'}).items[0];
 assert.equal(milestone.todo,false);
});
test('seeds are only added when their frame exists and deletion is permanent across seeding',()=>{
 assert.equal(seedAnnotationSamples(emptyAnnotations,[]),emptyAnnotations);
 const seeded=seedAnnotationSamples(emptyAnnotations,[frame]);assert.equal(seeded.items.length,2);
 const removed=removeAnnotation(seeded,seeded.items[0].id);
 assert.equal(seedAnnotationSamples(removed,[frame]).items.length,1);
 assert.equal(seedAnnotationSamples(seeded,[frame]).items.length,2);
});
test('chat context includes frame and note, preserves draft, and is not appended twice',()=>{
 const draft=appendAnnotationContext('Existing draft',note);
 assert.ok(draft.startsWith('Existing draft\n\n'));
 assert.ok(draft.includes('Prompt #240 · v26'));assert.ok(draft.includes(frame.url));assert.ok(draft.includes(note.text));
 assert.equal(appendAnnotationContext(draft,note),draft);
});

import { adjacentPromptIndex } from '../src/features/iteration-gallery/timeline.ts';
test('prompt transport skips push nodes and stops at range boundaries', () => {
 const frames = [{kind:'push'}, {kind:'prompt'}, {kind:'push'}, {kind:'prompt'}, {kind:'push'}] as const;
 assert.equal(adjacentPromptIndex([...frames], 1, 1), 3);
 assert.equal(adjacentPromptIndex([...frames], 3, -1), 1);
 assert.equal(adjacentPromptIndex([...frames], 2, 1), 3);
 assert.equal(adjacentPromptIndex([...frames], 3, 1), null);
 assert.equal(adjacentPromptIndex([...frames], 1, -1), null);
});


test('new demo frames each get two annotations and one todo without duplicating prior seeds', () => {
 const frames = [225,252].map(number => ({...frame,id:`frame-${number}`,number}));
 const seeded = seedAnnotationSamples(emptyAnnotations,frames);
 assert.equal(seeded.items.length,4);
 assert.equal(seeded.items.filter(note=>note.todo).length,2);
 for (const source of frames) {
  const notes=seeded.items.filter(note=>note.frame.id===source.id);
  assert.equal(notes.length,2);
  assert.equal(notes.filter(note=>note.todo).length,1);
  assert.ok(notes.every(note=>note.projectId==='mobile'));
 }
 assert.equal(seedAnnotationSamples(seeded,frames),seeded);
 const removed=removeAnnotation(seeded,seeded.items[0].id);
 assert.equal(seedAnnotationSamples(removed,frames),removed);
});

test('reload clears browser milestones and annotation copies while preserving notes, todos and seeding', async () => {
 const { resetPrototypeMilestones } = await import('../src/shared/reset-prototype-milestones.ts');
 const { annotationStorageKey } = await import('../src/features/annotations/model.ts');
 const { milestoneStorageKey } = await import('../src/features/version-tree/idea-stream.ts');
 const annotations = { items:[note, {...note,id:'milestone',kind:'milestone',todo:false}, {...note,id:'plain',kind:'note',todo:false}], seeded:['sample'] };
 const values = new Map([[milestoneStorageKey, JSON.stringify({'capture-version-26':'Browser milestone'})], [annotationStorageKey, JSON.stringify(annotations)], ['theme','dark']]);
 const storage = {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
 resetPrototypeMilestones(storage);
 assert.equal(values.has(milestoneStorageKey),false);
 assert.deepEqual(JSON.parse(values.get(annotationStorageKey)!),{...annotations,items:[annotations.items[0],annotations.items[2]]});
 assert.equal(values.get('theme'),'dark');
 const preserved=values.get(annotationStorageKey);
 resetPrototypeMilestones(storage);
 assert.equal(values.get(annotationStorageKey),preserved);
});
