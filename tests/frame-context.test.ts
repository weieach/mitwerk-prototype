import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFrameContext } from '../src/features/workbench/frame-context.ts';
import { migrateState } from '../src/features/workbench/model.ts';
const frame={id:'frame-240',url:'/gallery/frame.png',label:'v27 · Sample',filename:'frame.png'};
test('frame contexts deduplicate by capture identity and preserve distinct frames',()=>{
 const initial=appendFrameContext([],frame);
 assert.equal(appendFrameContext(initial,{...frame,label:'Updated'}),initial);
 assert.deepEqual(appendFrameContext(initial,{...frame,id:'frame-241'}).map(f=>f.id),['frame-240','frame-241']);
});
test('saved frame context survives workspace migration independently of to-do context',()=>{
 const state=migrateState();
 state.frameAttachments={panel:[frame]};
 state.todoAttachments={panel:{text:'Keep the task'}};
 const loaded=migrateState(state);
 assert.deepEqual(loaded.frameAttachments?.panel,[frame]);
 assert.equal(loaded.todoAttachments?.panel.text,'Keep the task');
});
