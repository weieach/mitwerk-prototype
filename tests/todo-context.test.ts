import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateState, seedTasks } from '../src/features/workbench/model.ts';
import { todoChoices, attachTodoToChat } from '../src/features/workbench/todo-context.ts';
import { mitRole, mitRoleTone } from '../src/features/workbench/mit-role.ts';
import type { FrameAnnotation } from '../src/features/annotations/model.ts';
const note: FrameAnnotation = {id:'note',text:'Review this frame',todo:true,status:'To do',createdAt:'2026-09-30T12:00:00Z',updatedAt:'2026-09-30T12:00:00Z',frame:{id:'frame',url:'frame.png',number:240,kind:'prompt',version:27,summary:'A frame',timestamp:0}};
test('picker merges unfinished sources newest first and deduplicates linked annotation chats',()=>{
 const sample=seedTasks()[0];
 const tasks=[{...sample,id:'older',origin:'todo' as const,status:'To do' as const,created:'2026-09-29T12:00:00Z'}, {...sample,id:'newer',origin:'todo' as const,created:'2026-09-30T13:00:00Z'}, {...sample,id:'linked',origin:'todo' as const,annotationSourceId:'note'}, {...sample,id:'complete',origin:'todo' as const,status:'Complete' as const},sample];
 tasks.push({...sample,id:'legacy-note-chat',origin:'todo',messages:[{id:'legacy',role:'user',name:'User Example',time:'12:00',text:'[Frame annotation note] Legacy frame context'}]});
 assert.deepEqual(todoChoices(tasks,[{...note,chatId:'legacy-note-chat'}]).map(item=>item.id),['newer','annotation:note','older']);
 assert.deepEqual(todoChoices(tasks,[{...note,chatId:'legacy-note-chat',status:'Complete'}]).map(item=>item.id),['newer','older']);
});
test('attaching context on repeat visits preserves draft and other chats and refreshes source text',()=>{
 const state=migrateState({drafts:{access:'Keep my unsent text'},todoAttachments:{panel:{text:'Other context'}}});
 const attached=attachTodoToChat(state,'access',{text:note.text,annotationId:note.id});
 const revisited=attachTodoToChat(attached,'access',{text:'Updated note',annotationId:note.id});
 assert.equal(revisited.drafts.access,'Keep my unsent text');
 assert.deepEqual(revisited.todoAttachments,{panel:{text:'Other context'},access:{text:'Updated note',annotationId:'note'}});
 assert.equal(state.todoAttachments?.access,undefined);
});
test('role labels and tones retain individual agent attribution',()=>{
 assert.equal(mitRole('Accessibility Mit'),'Accessibility');
 assert.equal(mitRole('Mit'),'General');
 assert.notEqual(mitRoleTone('Design'),mitRoleTone('Accessibility'));
 assert.equal(mitRoleTone('Writing'),mitRoleTone('writing'));
});

test('task details retain the last attached task independently of its composer chip',async()=>{
 const { taskDetailsForChat } = await import('../src/features/workbench/todo-context.ts');
 const state=migrateState(null);
 const chat=state.tasks.find(task=>task.id==='access')!;
 const source=state.tasks.find(task=>task.id==='research')!;
 const attached=attachTodoToChat(state,chat.id,{text:source.title,taskId:source.id});
 const removed={...attached,todoAttachments:{}};
 assert.equal(taskDetailsForChat(removed,chat,[]).title,source.title);
 const updated={...removed,tasks:removed.tasks.map(task=>task.id===source.id?{...task,status:'In progress' as const}:task)};
 assert.equal(taskDetailsForChat(updated,chat,[]).status,'In progress');
 assert.equal(taskDetailsForChat(migrateState(updated),chat,[]).title,source.title);
 const annotation=attachTodoToChat(updated,chat.id,{text:note.text,annotationId:note.id});
 assert.equal(taskDetailsForChat({...annotation,todoAttachments:{}},chat,[note]).annotationId,note.id);
 assert.equal(taskDetailsForChat(annotation,chat,[{...note,text:'Edited task'}]).title,'Edited task');
});

test('task details expose the full prompt for shortened titles and legacy annotation chats',async()=>{
 const { taskDetailsForChat } = await import('../src/features/workbench/todo-context.ts');
 const state=migrateState(null);
 const chat={...state.tasks[0],id:'legacy',title:'Short title',messages:[{id:'m',role:'user' as const,name:'User Example',time:'12:00',text:'[Frame annotation note] Context'}]};
 assert.equal(taskDetailsForChat(state,chat,[{...note,chatId:'legacy'}]).title,note.text);
 assert.equal(taskDetailsForChat(state,{...chat,todoPrompt:'A complete task prompt'},[]).title,'A complete task prompt');
 const linked=attachTodoToChat(state,chat.id,{taskId:'research',text:'Explicit task'});
 assert.equal(taskDetailsForChat(linked,chat,[{...note,chatId:'legacy'}]).taskId,'research');
});
