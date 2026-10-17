import { editComposerTodo } from '../src/features/workbench/composer-state.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { addComposerTodo, defaultComposer, toggleComposerTodo, useTodoAsPrompt, todoTimestamp, todoVersionAt, hydrateComposerTodos, orderedComposerTodos } from '../src/features/workbench/composer-state.ts';
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
 assert.equal(todoTimestamp(state.todos[1].created,new Date('2026-10-17T18:00:00')),'Yesterday 10:20');
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
 assert.equal(result.draft,'Keep my draft\n------\nExecute this todo: \nCheck keyboard flow');
 assert.equal(result.composer.mode,'prompt');
 assert.equal(result.composer.todos,completed.todos);
 assert.equal(completed.mode,'todo');
 assert.equal(useTodoAsPrompt(state,'','one').draft,'Check keyboard flow');
 assert.equal(useTodoAsPrompt(state,'Draft\n','one').draft,'Draft\n------\nExecute this todo: \nCheck keyboard flow');
 assert.deepEqual(useTodoAsPrompt(state,'Keep','missing'),{composer:state,draft:'Keep'});
});

test('drawer relative dates cross calendar and year boundaries, not elapsed 24-hour periods', () => {
 assert.equal(todoTimestamp('2025-12-31T23:59:00', new Date('2026-01-01T00:01:00')), 'Yesterday 23:59');
 assert.equal(todoTimestamp('2026-01-01T09:04:00', new Date('2026-01-04T12:00:00')), '3 days ago');
 assert.equal(todoTimestamp('invalid'), '');
});

test('past drawer samples seed once; versions are resolved at creation and remain stable', () => {
 const today = new Date('2026-10-17T12:00:00');
 const history = [{timestamp:Date.parse('2026-10-01T12:00:00'),version:20},{timestamp:Date.parse('2026-10-15T12:00:00'),version:25}];
 const original = addComposerTodo({...defaultComposer(),mode:'todo'}, 'Keep my task', 'mine', '2026-10-17T09:04:00');
 const seeded = hydrateComposerTodos({panel:original,other:defaultComposer()},history,'panel',today);
 assert.equal(seeded.panel.todos.length,4);
 assert.equal(seeded.panel.open,true);
 assert.equal(seeded.panel.mode,'todo');
 assert.equal(seeded.panel.todos.find(t=>t.id==='mine')?.version,25);
 assert.equal(seeded.other.todos.length,0);
 assert.ok(seeded.panel.todos.slice(0,3).every(t=>Date.parse(t.created)<today.getTime()));
 assert.equal(original.todos.length,1);
 const edited = {...seeded,panel:toggleComposerTodo(seeded.panel,'drawer-sample-keyboard')};
 assert.deepEqual(hydrateComposerTodos(edited,[...history,{timestamp:today.getTime(),version:30}],'panel',new Date('2026-10-18')),edited);
 assert.equal(todoVersionAt([...history].reverse(),'2026-10-12T00:00:00'),20);
 assert.equal(todoVersionAt(history,'2026-09-01'),undefined);
});

test('drawer order is newest first with completed items last, without mutating saved order', () => {
 const base=defaultComposer();
 let state=addComposerTodo(base,'Older','old','2026-10-14T09:00:00');
 state=addComposerTodo(state,'Newest','new','2026-10-17T09:00:00');
 state=addComposerTodo(state,'Middle','middle','2026-10-16T09:00:00');
 assert.deepEqual(orderedComposerTodos(state.todos).map(todo=>todo.id),['new','middle','old']);
 const checked=toggleComposerTodo(state,'new');
 assert.deepEqual(orderedComposerTodos(checked.todos).map(todo=>todo.id),['middle','old','new']);
 assert.deepEqual(orderedComposerTodos(toggleComposerTodo(checked,'new').todos).map(todo=>todo.id),['new','middle','old']);
 assert.deepEqual(state.todos.map(todo=>todo.id),['old','new','middle']);
});

test('editing preserves identity and context; a committed empty edit removes only that todo', () => {
 const base=addComposerTodo(defaultComposer(),'Original','edit','today',{version:29});
 const checked=toggleComposerTodo(base,'edit');
 const edited=editComposerTodo(checked,'edit','  Revised text  ');
 assert.deepEqual(edited.todos[0],{...checked.todos[0],text:'Revised text'});
 assert.equal(base.todos[0].text,'Original');
 assert.equal(editComposerTodo(edited,'edit','  ').todos.length,0);
 assert.deepEqual(editComposerTodo(edited,'missing',''),edited);
});
