import test from 'node:test';
import assert from 'node:assert/strict';
import { ideaTodosByNode } from '../src/features/version-tree/idea-todos.ts';
import { defaultComposer, toggleComposerTodo } from '../src/features/workbench/composer-state.ts';
import { projectIdeaStream } from '../src/features/version-tree/idea-stream.ts';
import type { VersionNode } from '../src/features/version-tree/model.ts';
const node = (id: string, version: number): VersionNode => ({id, label:'Arbitrary label',title:'Done',saveType:'auto',createdAt:'',prompts:[],files:[],summary:'',branchId:'main',parentId:null,relation:'commit',capture:{version,pushed:true,branches:[],added:null,removed:null}});
const composer = {...defaultComposer(),todos:[{id:'one',text:'Drawer task',complete:false,version:4,created:''},{id:'unknown',text:'Unassigned',complete:false,created:''}]};
test('projects only the supplied drawer, preserving exact item identity and stable versions', () => {
 const mapped = ideaTodosByNode([node('sha',4),node('other',5)],composer.todos);
 assert.equal(mapped.size,1);
 assert.deepEqual(mapped.get('sha')?.map(todo=>todo.id),['one']);
 assert.equal(mapped.get('sha')?.[0],composer.todos[0]);
 assert.equal(ideaTodosByNode([node('new-sha',4)],composer.todos).get('new-sha')?.[0],composer.todos[0]);
 // Switching to an empty conversation must not retain the previous drawer's items.
 assert.equal(ideaTodosByNode([node('sha',4)],[]).size,0);
});
test('completion and ordering use the same drawer records without a separate status store', () => {
 const updated=toggleComposerTodo(composer,'one');
 const pending={...composer.todos[0],id:'two',text:'Pending item'};
 const mapped=ideaTodosByNode([node('sha',4)],[...updated.todos,pending]);
 assert.deepEqual(mapped.get('sha')?.map(todo=>[todo.id,todo.complete]),[['two',false],['one',true]]);
 assert.equal(mapped.get('sha')?.[1],updated.todos[0]);
});
test('todo versions stay explicit through folded history, including a WIP identity', () => {
 const nodes=[node('a',3),{...node('b',4),parentId:'a'},{...node('c',5),parentId:'b'}];
 const todos=ideaTodosByNode(nodes,composer.todos);
 const projected=projectIdeaStream(nodes,{},new Set(),new Set(todos.keys()));
 assert.ok(projected.nodes.some(node=>node.id==='b'));
 assert.equal(projected.folded.size,0);
 const draft={...node('wip',4),capture:{...node('wip',4).capture!,pushed:false}};
 assert.equal(ideaTodosByNode([draft],composer.todos).get('wip')?.length,1);
});
