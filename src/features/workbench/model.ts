export type TaskStatus = 'To do' | 'In progress' | 'Ready for review' | 'Complete';
export type View = 'Home' | 'Projects' | 'Todos' | 'Inbox' | 'Mits' | 'Library' | 'Settings' | 'dialog' | 'project' | 'Co-workers';
export type Message = { id: string; role: 'user' | 'mit' | 'colleague'; name: string; text: string; assetId?: string; assetIds?: string[]; time: string };
export type Task = { id: string; title: string; status: TaskStatus; creator: string; mit: string; mitId?: string; participantMitIds?:string[]; project: boolean; projectId?: string; kind: 'mit' | 'colleague'; unread: boolean; updated: string; created?: string; messages: Message[]; input: string[]; output: string[] };
export type Asset = { id: string; title: string; kind: 'document' | 'image' | 'prototype'; detail: string; url?: string; content?: string; local?: boolean };
export const statuses: TaskStatus[] = ['To do', 'In progress', 'Ready for review', 'Complete'];
export const team = ['Design Mit', 'Research Mit', 'Accessibility Mit'];
export const assets: Asset[] = [
  { id: 'brief', title: 'Component brief', kind: 'document', detail: 'Project knowledge · 3 min read', content: 'Mobile app component revamp\n\nThe challenge\nMake a sleep tracker’s profile panel easier to understand and quicker to navigate. This sample brief gives the team a shared starting point.\n\nWhat we are exploring\nA clear separation between personal information, sleep preferences and account settings. Progressive disclosure should keep everyday actions close without crowding the first view.\n\nKeep in place\nExisting information, familiar navigation labels and accessible controls. Avoid introducing a new account flow.\n\nReview together\nCan someone find their sleep goal without opening several menus? Is the panel easy to close? Does the layout work at a narrow viewport?\n\nDeliverables\nAn interactive component, a short explanation of the changes, and a reviewable version history.' },
  { id: 'ia', title: 'Information architecture', kind: 'image', detail: 'Reference image · PNG', url: '/demo/information-architecture.png' },
  { id: 'prototype', title: 'Profile panel', kind: 'prototype', detail: 'Interactive prototype · Current output', url: '/demo/profile-panel.html' },
  { id: 'notes', title: 'Design notes', kind: 'document', detail: 'Design Mit · Review notes', content: 'Profile panel — design notes\n\nA clearer starting point\nPersonal details sit at the top. Sleep preferences and account settings have their own sections, so identity and configuration no longer compete.\n\nInteraction\nThe menu opens a compact profile panel. Preferences can be expanded in place, and a clearly labelled close control returns to the main screen.\n\nWhat to review\nCheck the language of the sleep-goal control and the visibility of the close action. Try the prototype with keyboard navigation.\n\nOpen question\nShould reminders follow the device’s quiet hours or use their own schedule?\n\nAbout this output\nThis is sample content for the MitWerk frontend demonstration, not the result of a live AI run.' },
];
export function seedTasks(): Task[] {
  return [
    { id: 'panel', title: 'Explore a clearer profile panel', status: 'Ready for review', creator: 'Waiting Wong', mit: 'Design Mit', project: true, kind: 'mit', unread: true, updated: '10:42', input: ['brief','ia'], output: ['prototype','notes'], messages: [
      { id:'m1', role:'user', name:'You', time:'10:24', text:'Let’s rethink the profile panel. The current layout puts personal information and settings at the same level. I’d like it to feel calmer, without hiding the things people use every day.' },
      { id:'m2', role:'mit', name:'Design Mit', time:'10:25', text:'I’ll separate identity from preferences and keep the everyday actions within reach. I’m using the component brief and your information architecture as context.\n\nI’ll keep the existing content and focus this iteration on hierarchy, spacing and how the panel opens.' },
      { id:'m3', role:'user', name:'You', time:'10:28', text:'Yes. Keep the sleep goal easy to find, and make sure the panel has an obvious way to close.' },
      { id:'m4', role:'mit', name:'Design Mit', time:'10:42', text:'The first direction is ready for a look.\n\nPersonal details now lead the panel, with sleep preferences below. Account settings sit in a quieter, separate section. The close control stays visible while you explore.\n\nOpen the prototype to try it, or check the design notes before we decide what to refine.', assetId:'prototype' },
    ] },
    { id:'research', title:'Map everyday profile actions', status:'Complete', creator:'Research Mit', mit:'Research Mit', project:true, kind:'mit', unread:false, updated:'Yesterday', input:['brief'], output:['notes'], messages:[{id:'r1',role:'mit',name:'Research Mit',time:'Yesterday',text:'The sample review groups actions into identity, sleep preferences and account settings. The component brief captures the questions for the next iteration.',assetId:'brief'}] },
    { id:'access', title:'Check keyboard navigation', status:'To do', creator:'Nicole Wei', mit:'Accessibility Mit', project:true, kind:'mit', unread:false, updated:'Yesterday', input:['brief','prototype'], output:[], messages:[{id:'a1',role:'colleague',name:'Nicole Wei',time:'Yesterday',text:'Let’s check focus order, the close action and labels on the preference controls once the layout is ready.'}] },
    { id:'nicole', title:'Nicole Wei', status:'In progress', creator:'Nicole Wei', mit:'Nicole Wei', project:false, kind:'colleague', unread:true, updated:'11:08', input:[],output:[], messages:[{id:'n1',role:'colleague',name:'Nicole Wei',time:'11:08',text:'I’ve been looking at the reading window. Can we keep the chat visible when opening an output? It would help us discuss the design while looking at it.'}] },
  ];
}
const KEY = 'mitwerk-workbench-v1';
export const defaultInstructions = 'Keep the existing information architecture. Make everyday actions easy to find. Use the MitWerk palette, clear labels and accessible focus states.';
export type Project = {mitIds?:string[];archived?:boolean;id:string; name:string; description:string; members:string[]; instructions:string};
export const colleagues = [
 {name:'Nicole Wei', role:'Product designer', detail:'Interaction design · Reading experience'},
 {name:'Alex Chen', role:'Frontend engineer', detail:'Prototyping · Implementation'},
 {name:'Maya Lin', role:'Product manager', detail:'Planning · Research'},
];
export type Mit = {id:string; name:string; role:string; instructions:string; skills:string[]; tools:string[]; review:string[]};
export const skillOptions=['Interface exploration','Research synthesis','Accessibility review','Writing & editing'];
export const toolOptions=['Workspace files','Figma','GitHub'];
export const reviewOptions=['Before sharing externally','Before editing source files','When the scope changes'];
export function seedMits():Mit[]{return team.map((name,i)=>({id:['design','research','accessibility'][i],name,role:['Explore interface directions and turn feedback into prototypes.','Organize context, questions and supporting evidence.','Review keyboard navigation and inclusive interactions.'][i],instructions:'Explain your reasoning and ask when important context is missing.',skills:[skillOptions[i]],tools:['Workspace files'],review:[...reviewOptions]}));}
export function saveMit(state:SavedState,mit:Mit):SavedState {
 const old=state.mits.find(m=>m.id===mit.id);
 return {...state,mits:old?state.mits.map(m=>m.id===mit.id?mit:m):[...state.mits,mit],tasks:state.tasks.map(t=>t.kind==='mit'&&(t.mitId===mit.id||(!t.mitId&&t.mit===old?.name))?{...t,mitId:mit.id,mit:mit.name}:t)};
}
export type SavedState = {tasks:Task[]; drafts:Record<string,string>; projectName:string; instructions:string; projects:Project[]; mits:Mit[]};
export function migrateState(raw:Partial<SavedState>|null): SavedState {
 const projectName=typeof raw?.projectName==='string'?raw.projectName:'Mobile app component revamp';
 const instructions=typeof raw?.instructions==='string'?raw.instructions:defaultInstructions;
 const projects=Array.isArray(raw?.projects)&&raw.projects.length?raw.projects:[
  {id:'mobile',name:projectName,description:'A calmer profile experience, shaped together.',members:['Waiting Wong','Nicole Wei'],instructions},
  {id:'onboarding',name:'Workspace onboarding',description:'Help a new team find its first shared task. Sample project.',members:['Waiting Wong','Alex Chen','Maya Lin'],instructions:''},
 ];
 const tasks=(Array.isArray(raw?.tasks)?raw.tasks:seedTasks()).filter(t=>!(t.kind==='mit'&&t.title==='New chat'&&!t.project&&!t.projectId&&!t.messages.length&&!t.input.length&&!t.output.length&&!raw?.drafts?.[t.id]?.trim()));
 const mits=Array.isArray(raw?.mits)&&raw.mits.length?raw.mits:seedMits();
 return {projects:projects.map(p=>({...p,mitIds:[...new Set([...(p.mitIds||[]),...tasks.filter(t=>t.projectId===p.id||(t.project&&!t.projectId&&p.id==='mobile')).map(t=>t.mitId||mits.find(m=>m.name===t.mit)?.id).filter((id):id is string=>!!id)])]})),mits,projectName,instructions,tasks:tasks.map(legacy=>{const {parentId: _parentId,...t}=legacy as Task & {parentId?:string};return {...t,mitId:t.kind==='mit'?(t.mitId||mits.find(m=>m.name===t.mit)?.id):undefined,projectId:t.projectId||(t.project?'mobile':undefined)};}),drafts:raw?.drafts||{}};
}
export function loadState(): SavedState {
 try {
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  if(raw && (!Array.isArray(raw.tasks)||!raw.tasks.every((t:Task)=>typeof t.id==='string' && typeof t.title==='string' && typeof t.mit==='string' && statuses.includes(t.status) && Array.isArray(t.input) && Array.isArray(t.output) && Array.isArray(t.messages))))return migrateState(null);
  return migrateState(raw);
 }catch{return migrateState(null);}
}
export function tasksForProject(tasks:Task[],id:string){return tasks.filter(t=>t.projectId===id);}
export function saveState(state:SavedState) { localStorage.setItem(KEY,JSON.stringify(state)); }
export function now() { return new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
export function uid() { return crypto.randomUUID(); }

export function archiveProject(state:SavedState,id:string,archived:boolean):SavedState{return {...state,projects:state.projects.map(p=>p.id===id?{...p,archived}:p)};}

export function mentionedMits(text:string,mits:Mit[]):Mit[]{
 return mits.filter(m=>{const token='@'+m.name;let start=text.indexOf(token);while(start>=0){const before=text[start-1],after=text[start+token.length];if((!before||/\s/.test(before))&&(!after||/[\s.,!?;:，。！？；：]/.test(after)))return true;start=text.indexOf(token,start+token.length);}return false;});
}
export function joinTaskMits(state:SavedState,taskId:string,ids:string[]):SavedState{
 const task=state.tasks.find(t=>t.id===taskId);if(!task)return state;
 const valid=ids.filter(id=>state.mits.some(m=>m.id===id));if(!valid.length)return state;
 const primary=state.mits.find(m=>m.id===valid[0])!;
 return {...state,projects:state.projects.map(p=>p.id===task.projectId?{...p,mitIds:[...new Set([...(p.mitIds||[]),...valid])]}:p),tasks:state.tasks.map(t=>t.id===taskId?{...t,mitId:primary.id,mit:primary.name,participantMitIds:[...new Set([...(t.participantMitIds||[]),...(t.mitId?[t.mitId]:[]),...valid])]}:t)};
}
