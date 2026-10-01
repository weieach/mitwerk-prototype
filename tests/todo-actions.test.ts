import test from 'node:test';
import assert from 'node:assert/strict';
import { seedTasks, isTodoChat } from '../src/features/workbench/model.ts';
import { updateTodoTasks } from '../src/features/workbench/todo-actions.ts';
import type { FrameAnnotation } from '../src/features/annotations/model.ts';
const base={...seedTasks()[0],origin:'todo' as const};
test('editing to-do preserves conversation title and history',()=>{
 const tasks=[base]; const [edited]=updateTodoTasks(tasks,{kind:'task',id:base.id},undefined,' Revised task ');
 assert.equal(edited.todoPrompt,'Revised task');assert.equal(edited.title,base.title);assert.equal(edited.messages,base.messages);assert.equal(tasks[0],base);
});
test('deleting to-do keeps its chat but removes task designation',()=>{
 const [removed]=updateTodoTasks([base],{kind:'task',id:base.id},undefined,null);
 assert.equal(isTodoChat(removed),false);assert.equal(removed.messages,base.messages);
});
test('removing an annotation task cannot revive its linked task or alter unrelated recent chat',()=>{
 const linked={...base,id:'linked',annotationSourceId:'note'};
 const recent={...base,id:'recent'};
 const note={id:'note',chatId:'recent'} as FrameAnnotation;
 const result=updateTodoTasks([linked,recent],{kind:'annotation',id:'note'},note,null);
 assert.equal(isTodoChat(result[0]),false);assert.equal(result[1],recent);
});
