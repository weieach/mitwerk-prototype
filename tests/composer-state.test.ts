import test from 'node:test';
import assert from 'node:assert/strict';
import { addComposerTodo, defaultComposer, toggleComposerTodo, useTodoAsPrompt, todoTimestamp } from '../src/features/workbench/composer-state.ts';
import { migrateState } from '../src/features/workbench/model.ts';

test('to-do submission trims text, opens the drawer and leaves messages and other chats alone',()=>{
 const initial=migrateState(null);
 const composer={...defaultComposer(),mode:'todo' as const};
 const saved=addComposerTodo(composer,'  Check the keyboard flow\nthen the preview  ','todo-1','2026-10-17T12:05:00');
 assert.equal(saved.open,true);
 assert.deepEqual(saved.todos,[{id:'todo-1',text:'Check the keyboard flow\nthen the preview',created:'2026-10-17T12:05:00',complete:false}]);
 assert.equal(composer.todos.length,0);
 const restored=migrateState(JSON.parse(JSON.stringify({...initial,chatComposers:{panel:saved,research:defaultComposer()},drafts:{research:'Keep my draft'}})));
 assert.deepEqual(restored.tasks,initial.tasks);
 assert.deepEqual(restored.chatComposers?.panel,saved);
 assert.equal(restored.chatComposers?.research.todos.length,0);
 assert.equal(restored.drafts.research,'Keep my draft');
 assert.equal(addComposerTodo(composer,' \n ','empty','date'),composer);
});

test('completion toggles only the selected item and dates display local creation time',()=>{
 let state=addComposerTodo(defaultComposer(),'First','one','2026-10-17T17:05:00');
 state=addComposerTodo(state,'Second','two','2026-10-16T10:20:00');
 const completed=toggleComposerTodo(state,'one');
 assert.equal(completed.todos[0].complete,true);
 assert.equal(completed.todos[1].complete,false);
 assert.equal(state.todos[0].complete,false);
 assert.equal(toggleComposerTodo(completed,'one').todos[0].complete,false);
 assert.equal(todoTimestamp(state.todos[0].created,new Date('2026-10-17T18:00:00')),'Today 17:05');
 assert.equal(todoTimestamp(state.todos[1].created,new Date('2026-10-17T18:00:00')),'Oct 16 10:20');
});

test('gallery sample refresh preserves edited messages, custom titles and appended work',()=>{
 const state=migrateState(null);
 const old={...state,sampleContentVersion:1,tasks:state.tasks.map(task=>task.id==='panel'?{...task,title:'My gallery',messages:[...task.messages.map(message=>message.id==='m2'?{...message,versionOutput:undefined}:message),
 {id:'m3',role:'user' as const,name:'You',time:'10:28',text:'Keep out-of-range versions visible but dimmed. Clicking a frame should rotate it into theater view, where I can play the sequence like a timelapse. Show the frame first, then the timeline, then the other controls.'},
 {id:'m4',role:'mit' as const,name:'Design Mit',time:'10:42',text:'My edited response'},
 {id:'added',role:'user' as const,name:'You',time:'11:00',text:'My new feedback'},
 ]}:task),drafts:{panel:'Keep this draft'}};
 const updated=migrateState(old);
 const task=updated.tasks.find(task=>task.id==='panel')!;
 assert.equal(task.title,'My gallery');
 assert.deepEqual(task.messages.map(message=>message.id),['m1','m2','m4','added']);
 assert.equal(task.messages[1].versionOutput?.prompt,276);
 assert.equal(task.messages[2].text,'My edited response');
 assert.equal(updated.drafts.panel,'Keep this draft');
 assert.deepEqual(migrateState(updated),updated);
});


test('reusing a drawer item preserves its completion, context and draft while switching to Prompt',()=>{
 const state=addComposerTodo({...defaultComposer(),mode:'todo'},'Check keyboard flow','one','2026-10-17T17:05:00',{assetIds:['file']});
 const completed=toggleComposerTodo(state,'one');
 const result=useTodoAsPrompt(completed,'Keep my draft','one');
 assert.equal(result.draft,'Keep my draft\nCheck keyboard flow');
 assert.equal(result.composer.mode,'prompt');
 assert.equal(result.composer.todos,completed.todos);
 assert.equal(completed.mode,'todo');
 assert.equal(useTodoAsPrompt(state,'','one').draft,'Check keyboard flow');
 assert.equal(useTodoAsPrompt(state,'Draft\n','one').draft,'Draft\nCheck keyboard flow');
 assert.deepEqual(useTodoAsPrompt(state,'Keep','missing'),{composer:state,draft:'Keep'});
});
