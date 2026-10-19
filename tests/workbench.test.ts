import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, migrateState, seedTasks, tasksForProject, saveMit, archiveProject, mentionedMits, joinTaskMits, isTodoChat, todoContext } from '../src/features/workbench/model.ts';

test('legacy workspace migration preserves task messages, drafts and renamed project',()=>{
 const tasks=seedTasks();
 const state=migrateState({tasks,drafts:{nicole:'Unsent reply'},projectName:'Our renamed project',instructions:'Keep the original scope'});
 assert.equal(state.projects[0].name,'Our renamed project');
 assert.equal(state.projects[0].instructions,'Keep the original scope');
 assert.deepEqual(state.tasks[0].messages,tasks[0].messages);
 assert.equal(state.drafts.nicole,'Unsent reply');
 assert.equal(state.tasks.find(t=>t.id==='nicole')?.projectId,undefined);
 assert.equal(tasksForProject(state.tasks,'mobile').length,3);
 assert.equal(tasksForProject(state.tasks,'onboarding').length,0);
});
test('multiple projects and membership survive loading without copying tasks into another project',()=>{
 const state=migrateState(null);
 state.projects.push({id:'new',name:'Team work',description:'',members:['User Example','Maya Lin'],instructions:'New scope'});
 state.tasks.push({...state.tasks[0],id:'new-task',projectId:'new',input:[],output:[],messages:[]});
 const restored=migrateState(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(restored.projects.map(p=>[p.id,p.name,p.members,p.instructions]),state.projects.map(p=>[p.id,p.name,p.members,p.instructions]));
 assert.equal(tasksForProject(restored.tasks,'new').length,1);
 assert.equal(tasksForProject(restored.tasks,'mobile').length,3);
 assert.deepEqual(tasksForProject(restored.tasks,'new')[0].output,[]);
});

test('renaming and customizing a Mit retains identity and historical messages',()=>{
 const state=migrateState(null); const history=state.tasks[0].messages;
 const customized={...state.mits[0],name:'Interface partner',instructions:'Ask before changing scope',skills:['Writing & editing'],tools:[],review:['When the scope changes']};
 const next=saveMit(state,customized);
 assert.equal(next.tasks[0].mit,'Interface partner');
 assert.equal(next.tasks[0].mitId,customized.id);
 assert.deepEqual(next.tasks[0].messages,history);
 assert.equal(next.tasks.find(t=>t.id==='nicole')?.mit,'Nicole Wei');
 assert.deepEqual(migrateState(JSON.parse(JSON.stringify(next))).mits[0],customized);
});
test('new Mits persist without replacing the existing team',()=>{
 const state=migrateState(null);
 const mit={id:'content',name:'Content partner',role:'Write product copy',instructions:'Use plain language',skills:[],tools:[],review:[]};
 const next=saveMit(state,mit);
 assert.equal(next.mits.length,4);
 assert.equal(migrateState(next).mits[3].name,'Content partner');
 assert.deepEqual(next.tasks,state.tasks);
});

test('archive and restore preserve project contents and survive reload',()=>{
 const original=migrateState(null);
 const archived=archiveProject(original,'mobile',true);
 assert.equal(migrateState(archived).projects[0].archived,true);
 assert.deepEqual(archived.tasks,original.tasks);
 assert.deepEqual(archived.drafts,original.drafts);
 const restored=archiveProject(archived,'mobile',false);
 assert.equal(restored.projects[0].archived,false);
 assert.deepEqual(restored.projects[0].members,original.projects[0].members);
 assert.equal(restored.projects[1],original.projects[1]);
});

test('mentions resolve exact names without matching emails or partial Mit names',()=>{
 const state=migrateState(null);
 assert.deepEqual(mentionedMits('@Design Mit please review with @Research Mit.',state.mits).map(m=>m.id),['design','research']);
 assert.deepEqual(mentionedMits('hello@Design Mit and @Design MitExtra',state.mits),[]);
});
test('mentioned Mits join only the conversation project, without duplicating membership',()=>{
 const state=migrateState(null);
 const joined=joinTaskMits(state,'panel',['research','research','missing']);
 assert.equal(joined.tasks[0].mitId,'research');
 assert.equal(joined.projects[0].mitIds?.filter(id=>id==='research').length,1);
 assert.deepEqual(joined.projects[1],state.projects[1]);
 assert.deepEqual(joined.tasks[0].messages,state.tasks[0].messages);
 assert.deepEqual(migrateState(joined).projects[0].mitIds,joined.projects[0].mitIds);
});

test('legacy subtasks become peers without losing saved task content or drafts',()=>{
 const original=migrateState(null);
 const legacy={...original,tasks:original.tasks.map(t=>t.id==='access'?{...t,parentId:'panel'}:t),drafts:{access:'Keep this unsent draft'}};
 const restored=migrateState(legacy);
 assert.equal(restored.tasks.length,original.tasks.length);
 assert.deepEqual(restored.tasks,original.tasks);
 assert.equal('parentId' in restored.tasks.find(t=>t.id==='access')!,false);
 assert.equal(restored.drafts.access,'Keep this unsent draft');
 assert.equal(legacy.tasks.find(t=>t.id==='access')?.parentId,'panel');
 assert.deepEqual(migrateState(restored),restored);
});

test('migration removes only unused New chat placeholders and remains idempotent',()=>{
 const blank={...seedTasks()[0],id:'empty',title:'New chat',project:false,projectId:undefined,input:[],output:[],messages:[]};
 const state=migrateState({tasks:[blank,{...blank,id:'draft'},{...blank,id:'file',input:['brief']},{...blank,id:'named',title:'Planned task'},{...blank,id:'project',project:true,projectId:'mobile'},{...blank,id:'todo',origin:'todo'},{...blank,id:'context'}],todoAttachments:{context:{text:'Preserve attached context'}},drafts:{draft:'Keep my draft'}});
 assert.deepEqual(state.tasks.map(t=>t.id),['draft','file','named','todo','context']);
 assert.equal(state.drafts.draft,'Keep my draft');
 assert.deepEqual(migrateState(state).tasks,state.tasks);
 const empty=migrateState({tasks:[blank]});
 assert.deepEqual(empty.tasks,[]);
 assert.deepEqual(migrateState(empty).tasks,[]);
});


test('product sample migration updates old examples once while retaining added work',()=>{
 const seeded=migrateState(null);
 const old={...seeded,sampleContentVersion:undefined,projectName:'Mobile app component revamp',
  projects:seeded.projects.map(p=>p.id==='mobile'?{...p,name:'Mobile app component revamp',members:['Waiting Wong']}:p),
  tasks:seeded.tasks.map(t=>t.id==='panel'?{...t,title:'Explore a clearer profile panel',creator:'Waiting Wong',status:'Complete' as const,messages:[
   {id:'m1',role:'user' as const,name:'You',time:'10:24',text:'Old profile example'},
   {id:'custom-message',role:'user' as const,name:'Waiting Wong',time:'11:30',text:'Keep this added feedback'},
  ]}:t),drafts:{panel:'Keep this unsent draft'}};
 const migrated=migrateState(old);
 const task=migrated.tasks.find(t=>t.id==='panel')!;
 assert.equal(task.title,'Building an iteration gallery');
 assert.equal(task.creator,'User Example');
 assert.equal(task.status,'Complete');
 assert.equal(task.messages.at(-1)?.text,'Keep this added feedback');
 assert.equal(task.messages.at(-1)?.name,'User Example');
 assert.equal(migrated.drafts.panel,'Keep this unsent draft');
 assert.deepEqual(migrated.projects[0].members,['User Example']);
 assert.equal(migrated.projects[0].name,'verso product prototype');
 assert.equal(task.messages.some(m=>m.text==='Old profile example'),false);
 const edited={...migrated,tasks:migrated.tasks.map(t=>t.id==='panel'?{...t,title:'My revised task',messages:t.messages.slice(1)}:t)};
 assert.deepEqual(migrateState(edited),edited);
});


test('conversation origin survives migration independently of agent and status',()=>{
 const state=migrateState(null);
 assert.equal(isTodoChat(state.tasks.find(t=>t.id==='panel')!),false);
 assert.equal(isTodoChat(state.tasks.find(t=>t.id==='access')!),true);
 const regular={...state.tasks[0],id:'sidebar-chat',origin:'chat' as const,status:'Ready for review' as const};
 const fromTodo={...regular,id:'annotation-chat',origin:'todo' as const,annotationSourceId:'note-id',todoPrompt:'Keep the full prompt as context'};
 const restored=migrateState({...state,tasks:[regular,fromTodo],drafts:{'sidebar-chat':'Unsent draft'},todoAttachments:{'sidebar-chat':{text:'Attached without changing chat origin'}}});
 assert.equal(isTodoChat(restored.tasks[0]),false);
 assert.equal(isTodoChat(restored.tasks[1]),true);
 assert.equal(todoContext(restored.tasks[1]),'Keep the full prompt as context');
 assert.equal(restored.drafts['sidebar-chat'],'Unsent draft');
 assert.equal(restored.todoAttachments?.['sidebar-chat'].text,'Attached without changing chat origin');
 assert.deepEqual(migrateState(restored),restored);
});


test('unsent frame references stay in-session while drafts and sent references survive reload', () => {
 const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
 let saved = '';
 Object.defineProperty(globalThis, 'localStorage', { configurable:true, value:{ getItem:()=>saved || null, setItem:(_key:string,value:string)=>{saved=value;} } });
 try {
  const state = migrateState(null);
  const frame = {id:'test-frame',url:'/gallery/test.png',label:'Test reference',filename:'test.png'};
  state.frameAttachments = {panel:[frame]};
  state.drafts.panel = 'Keep this draft';
  state.tasks.find(task=>task.id==='panel')!.messages[0].frames = [frame];
  // A legacy persisted reference must not become a default chip.
  saved = JSON.stringify(state);
  assert.deepEqual(loadState().frameAttachments, {});
  saveState(state);
  assert.deepEqual(state.frameAttachments.panel, [frame]);
  const restored = loadState();
  assert.deepEqual(restored.frameAttachments, {});
  assert.equal(restored.drafts.panel, 'Keep this draft');
  assert.deepEqual(restored.tasks.find(task=>task.id==='panel')!.messages[0].frames, [frame]);
 } finally {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
  else Reflect.deleteProperty(globalThis, 'localStorage');
 }
});

test('the MitWerk to verso rename updates saved sample names and instructions but keeps custom text', async () => {
 const { migrateState, defaultInstructions, sampleProjectName } = await import('../src/features/workbench/model.ts');
 const legacy = defaultInstructions.replace('verso’s', 'MitWerk’s');
 const migrated = migrateState({ sampleContentVersion: 2, projectName: 'MitWerk product prototype', instructions: legacy,
  projects: [{ id: 'mobile', name: 'MitWerk product prototype', description: '', members: [], instructions: legacy }, { id: 'mine', name: 'MitWerk notes', description: '', members: [], instructions: 'Keep MitWerk as written' }] } as never);
 assert.equal(migrated.projectName, sampleProjectName);
 assert.equal(migrated.instructions, defaultInstructions);
 assert.equal(migrated.projects[0].name, sampleProjectName);
 assert.equal(migrated.projects[1].name, 'MitWerk notes');
 assert.equal((migrated.projects[1] as { instructions?: string }).instructions, 'Keep MitWerk as written');
});
