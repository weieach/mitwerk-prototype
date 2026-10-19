import { durableCaptureScreen } from '../../shared/capture-buckets.ts';
import { workbenchStorageKey } from './composer-events.ts';
import { buildVersions, type Capture } from '../iteration-gallery/model.ts';
import type { ChatComposerState } from './composer-state.ts';
import type { FrameContext } from './frame-context.ts';
import { userName } from './user-profile.ts';
export type TaskStatus = 'To do' | 'In progress' | 'Ready for review' | 'Complete';
export type View = 'Home' | 'Projects' | 'Todos' | 'Inbox' | 'Mits' | 'Library' | 'Settings' | 'dialog' | 'project' | 'Co-workers';
export type Message = { demoAction?: 'refresh-live'; sessionOnly?: boolean; sourcePrompt?: number; versionOutput?: {inviteMilestone?:boolean;version?:number;prompt:number;imageUrl?:string;frameId?:string}; annotationContext?: string; frames?:FrameContext[]; id: string; role: 'user' | 'mit' | 'colleague'; name: string; text: string; assetId?: string; assetIds?: string[]; time: string };
export type Task = { origin?: 'chat' | 'todo'; todoPrompt?: string; annotationSourceId?: string; id: string; title: string; status: TaskStatus; creator: string; mit: string; mitId?: string; participantMitIds?:string[]; project: boolean; projectId?: string; kind: 'mit' | 'colleague'; unread: boolean; updated: string; created?: string; messages: Message[]; input: string[]; output: string[] };
export type Asset = { id: string; title: string; kind: 'document' | 'image' | 'prototype'; detail: string; url?: string; content?: string; local?: boolean; previewPrompt?: number; previewUrl?: string };
export const statuses: TaskStatus[] = ['To do', 'In progress', 'Ready for review', 'Complete'];
export const team = ['Design Mit', 'Research Mit', 'Accessibility Mit'];
export const assets: Asset[] = [
  { id: 'brief', title: 'verso product brief', kind: 'document', detail: 'Project context · 3 min read', content: `verso — make the work visible

The challenge
AI-assisted creation produces many prompts, commits and visual iterations. Help the creator understand what changed, explore alternatives and return to a useful moment without losing the surrounding conversation.

Version blocks
Represent saved screenshots as padded, translucent 3D version blocks. Preserve each image’s aspect ratio. Versions are evenly spaced; dates reflect the captures within them. A selected time range highlights the relevant blocks while older work stays visible in a disabled state.

Version stream
Use Git ancestry and capture metadata to connect commits, branches and merges. Keep Commit history separate from Test visual so experiments never alter recorded history.

Review and replay
Hover to inspect a frame, open theater to scrub or play the sequence, and enter a saved prototype from a push frame. A top-view token chart shows cumulative usage for the selected range.

Prototype scope
Use reusable components and shared design tokens. Current token values are simulated. XR hand interactions are a separate exploration.` },
  { id: 'ia', title: 'Iteration data model', kind: 'document', detail: 'Reference · Capture and Git relationships', content: `From conversation to version history

Prompt → frame
Each saved prompt frame includes its timestamp, prompt number, summary and reference files. Read this metadata from the capture filename rather than hardcoding individual frames.

Push → version
A push closes a version’s frame sequence. Its preview uses the last prompt frame from that version; a saved codebase archive supports entering the interactive prototype.

Git → stream
Git supplies parent commits, branch refs and merges. Keep source capture identifiers separate from displayed version numbers. Summarize uncaptured collaborator work as an unnumbered incoming branch node.

Selection → shared context
Opening a commit card moves the theater playhead to its corresponding push frame. Time-range filtering changes the active frames in the visualizer without rewriting the history.` },
  { id: 'prototype', title: 'Version blocks', kind: 'prototype', detail: 'Saved frame · Current output', previewPrompt: 240, url: '/?view=history' },
  { id: 'notes', title: 'Iteration review notes', kind: 'document', detail: 'Design Mit · Sample review notes', content: `Version blocks — review notes

3D gallery
Drag to orbit the blocks. Use Reset view to fit the sequence and double-click it to center. Hovered frames lift slightly and expose their summary; dates and version labels adapt as the camera approaches the top view.

Theater
Rotate the selected frame into a frontal view, then introduce the timeline and remaining controls. Preserve the last decoded image while the next frame loads. Hovering the timeline previews a frame; leaving restores the selected frame.

Timeline and versions
Each rectangle represents a version, with smaller marks for its prompt frames. Push nodes provide access to the archived prototype. Keep play controls centered and range navigation at the ends of the row.

Review next
Check focus visibility, keyboard access, narrow reading-window layouts and reduced-motion behavior. Confirm that commit selection resolves to the correct push frame.

About these conversations
These are sample exchanges describing the verso prototype, not transcripts of live Mit runs.` },
];
export function seedTasks(): Task[] {
  return [
    { id: 'panel', origin: 'chat', title: 'Building an iteration gallery', status: 'Ready for review', creator: userName, mit: 'Design Mit', project: true, kind: 'mit', unread: true, updated: '10:42', input: ['brief','ia'], output: ['prototype','notes'], messages: [
      { id:'m1', sourcePrompt:276, role:'user', name:userName, time:'08:56', text:'When i scroll in the gallery, the view jitters a lot (rapidly zooming up and down at a small scale). investigate why & fix' },
      { id:'m2', versionOutput:{prompt:276}, role:'mit', name:'Design Mit', time:'08:56', text:'The jitter came from a feedback loop: scrolling updated the camera zoom, then a delayed React update reapplied an older value.\n\nThe gallery camera now owns zoom directly. The percentage is a readout, and zoom buttons send commands to the live camera. Resizing also redraws directly, keeping scrolling smooth without changing the gallery’s orbit or playback transitions.' },
    ] },
    { id:'research', title:'Mapping commits, branches and frames', status:'Complete', creator:userName, mit:'Research Mit', project:true, kind:'mit', unread:false, updated:'Yesterday', input:['brief'], output:['ia'], messages:[
      {id:'r1',role:'user',name:userName,time:'09:10',text:'How should the version stream relate to the gallery? A saved screenshot is not always a Git commit, and I need branches and merges to remain understandable.'},
      {id:'r2',role:'mit',name:'Research Mit',time:'09:14',text:'Treat capture history and Git ancestry as related sources. Capture filenames describe the visual frames; Git supplies the commit parents and branch refs. Match push captures to commits, but keep the original capture identifier separate from the displayed version number.\n\nTest visual should use its own editable graph so adding sample nodes cannot change Commit history.'},
      {id:'r3',role:'user',name:userName,time:'09:18',text:'Include work merged from a collaborator. If their branch has no local prompt captures, show its branch name on a floating node rather than inventing numbered versions. Selecting a commit should open its matching push frame in theater.'},
      {id:'r4',role:'mit',name:'Research Mit',time:'09:23',text:'The reference now distinguishes prompt frames, push versions and Git commits. Incoming collaborator work can appear as an unnumbered branch origin, while recorded Git parents remain available. Commit-to-frame navigation uses the source capture identifier, so a display numbering change will not break the link.',assetId:'ia'},
    ] },
    { id:'access', title:'Reviewing theater playback and navigation', status:'To do', creator:userName, mit:'Accessibility Mit', project:true, kind:'mit', unread:false, updated:'Yesterday', input:['brief','prototype'], output:[], messages:[
      {id:'a1',role:'user',name:userName,time:'11:05',text:'Review the theater controls and timeline. Keyboard users should be able to select a frame, play or pause, jump to the next push, and return to the gallery. Keep focus visible in the narrow reading window.'},
      {id:'a2',role:'mit',name:'Accessibility Mit',time:'11:07',text:'I’ll check the control labels, focus order and range navigation. Timeline hover should remain a temporary preview; moving away restores the selected frame. Keyboard selection needs an equivalent path that does not depend on hover.\n\nI’ll also check reduced-motion behavior for the camera transition and ensure the controls’ full padded areas cannot accidentally trigger a drag out of theater.'},
      {id:'a3',role:'user',name:userName,time:'11:09',text:'Also check that changing playback speed or loop does not move the selected frame. The previous and next controls should move between pushes, not individual prompts. Record anything that still needs fixing before marking this complete.'},
    ] },
    { id:'nicole', title:'Nicole Wei', status:'In progress', creator:'Nicole Wei', mit:'Nicole Wei', project:false, kind:'colleague', unread:true, updated:'11:08', input:[],output:[], messages:[{id:'n1',role:'colleague',name:'Nicole Wei',time:'11:08',text:'I’ve been looking at the reading window. Can we keep the chat visible when opening an output? It would help us discuss the design while looking at it.'}] },
  ];
}
const originalGalleryExchange: Message[] = [
      { id:'m1', role:'user', name:userName, time:'10:24', text:'Build an iteration gallery from the screenshots saved during this project. Each version should become a translucent, wireframed 3D block, with its frames arranged along the time axis. Keep the screenshots’ proportions and leave some padding inside the blocks.' },
      { id:'m2', versionOutput:{version:40,prompt:5,imageUrl:'examples/iteration-preview.png'}, role:'mit', name:'Design Mit', time:'10:25', text:'I’ll parse the capture filenames into frames and versions, then render the blocks with WebGL. Versions will be evenly spaced, with a separate date ruler showing when the frames were saved. The block geometry and spacing will come from shared tokens.\n\nDragging will orbit the gallery. Hovering a frame will lift it slightly and show its summary without opening it.' },
];
const previousGalleryMessages: Message[] = [
      { id:'m3', role:'user', name:userName, time:'10:28', text:'Keep out-of-range versions visible but dimmed. Clicking a frame should rotate it into theater view, where I can play the sequence like a timelapse. Show the frame first, then the timeline, then the other controls.' },
      { id:'m4', role:'mit', name:'Design Mit', time:'10:42', text:'The sample direction is ready to review. The gallery groups frames by version and supports date-range filtering, orbiting and hover inspection. Theater uses a segmented version timeline, and its preview stays visible while the next image loads.\n\nOpen the Iteration Visualizer to explore the blocks. The review notes cover the camera transition, timeline behavior and checks for the next iteration.', assetId:'prototype' },
];
const KEY = workbenchStorageKey;
export const defaultInstructions = 'Build verso’s iteration visualizer and version stream with reusable components and shared design tokens. Derive frames from capture metadata and branching from Git. Keep test data separate from recorded history; preserve clear labels, keyboard access and stable playback.';
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
export type SavedState = { chatComposers?:Record<string,ChatComposerState>; frameAttachments?:Record<string,FrameContext[]>;taskDetailsLinks?:Record<string,{taskId?:string;annotationId?:string}>;todoAttachments?:Record<string,{text:string;annotationId?:string}>; tasks:Task[]; drafts:Record<string,string>; projectName:string; instructions:string; sampleContentVersion?:number; projects:Project[]; mits:Mit[]};
const legacySampleTitles: Record<string, string> = {
 panel: 'Explore a clearer profile panel', research: 'Map everyday profile actions', access: 'Check keyboard navigation',
};
const legacyInstructions = 'Keep the existing information architecture. Make everyday actions easy to find. Use the MitWerk palette, clear labels and accessible focus states.';
/** The brand is "verso" (formerly MitWerk); saved sample names and instructions follow the rename, custom text is kept. */
export const sampleProjectName = 'verso product prototype';
const legacyBrand = { projectName: 'MitWerk product prototype', instructions: defaultInstructions.replace('verso’s', 'MitWerk’s') };
const rebrandName = (name: string) => name === legacyBrand.projectName ? sampleProjectName : name;
const rebrandInstructions = (text: string) => text === legacyBrand.instructions ? defaultInstructions : text;

/** Refresh bundled examples once; retain appended conversation, drafts and custom projects. */
function migrateSampleContent(raw: Partial<SavedState> | null): Partial<SavedState> | null {
 if (!raw) return raw;
 const renameUser = (name: string) => name === 'Waiting Wong' ? userName : name;
 const refresh = (raw.sampleContentVersion ?? 0) < 1;
 const seeds = new Map(seedTasks().map(task => [task.id, task]));
 return {...raw,
  projectName: refresh && raw.projectName === 'Mobile app component revamp' ? sampleProjectName : raw.projectName === undefined ? undefined : rebrandName(raw.projectName),
  instructions: refresh && raw.instructions === legacyInstructions ? defaultInstructions : raw.instructions === undefined ? undefined : rebrandInstructions(raw.instructions),
  projects: raw.projects?.map(project => ({...project, name: rebrandName(project.name), members: project.members.map(renameUser),
   ...(typeof project.instructions === 'string' ? { instructions: rebrandInstructions(project.instructions) } : {}),
   ...(refresh && project.id === 'mobile' ? {
    name: project.name === 'Mobile app component revamp' ? sampleProjectName : project.name,
    description: project.description === 'A calmer profile experience, shaped together.' ? 'Explore how conversations, saved frames and Git history make the design process visible.' : project.description,
    instructions: project.instructions === legacyInstructions ? defaultInstructions : project.instructions,
   } : {}),
  })),
  tasks: raw.tasks?.map(task => {
   const sample = refresh && legacySampleTitles[task.id] && (task.projectId === 'mobile' || task.project && !task.projectId) ? seeds.get(task.id) : undefined;
   const seedIds = new Set(sample?.messages.map(message => message.id));
   return {...task, creator: renameUser(sample && task.id === 'access' && task.creator === 'Nicole Wei' ? userName : task.creator),
    ...(sample ? {
     title: task.title === legacySampleTitles[task.id] ? sample.title : task.title,
     output: [...new Set([...task.output, ...sample.output])],
     messages: [...sample.messages, ...task.messages.filter(message => !seedIds.has(message.id)).map(message => ({...message, name: message.role === 'user' ? userName : renameUser(message.name)}))],
    } : {}),
    ...(!sample ? {messages: task.messages.map(message => ({...message, name: message.role === 'user' ? userName : renameUser(message.name)}))} : {}),
   };
  }),
 };
}
export function migrateState(raw:Partial<SavedState>|null): SavedState {
 raw = migrateSampleContent(raw);
 if(raw && (raw.sampleContentVersion ?? 0)<2) {
  const seed=seedTasks().find(task=>task.id==='panel')!;
  raw={...raw,tasks:raw.tasks?.map(task=>task.id==='panel' && (task.projectId==='mobile'||task.project&&!task.projectId) ? {
   ...task,title:task.title==='Implementing 3D version blocks'?seed.title:task.title,
   messages:task.messages.filter(message=>!previousGalleryMessages.some(old=>old.id===message.id&&old.text===message.text)).map(message=> {
    const example=seed.messages.find(item=>item.id===message.id&&item.text===message.text);
    return example?.versionOutput&&!message.versionOutput?{...message,versionOutput:example.versionOutput}:message;
   }),
  }:task)};
 }
 if (raw && (raw.sampleContentVersion ?? 0) < 3) {
  const sample = seedTasks().find(task => task.id === 'panel')!;
  raw = {...raw, tasks: raw.tasks?.map(task => task.id === 'panel' ? {...task,
   messages: task.messages.map(message => originalGalleryExchange.some(old => old.id === message.id && old.text === message.text)
    ? {...sample.messages.find(next => next.id === message.id)!, name: message.name} : message),
  } : task)};
 }
 const projectName=typeof raw?.projectName==='string'?raw.projectName:sampleProjectName;
 const instructions=typeof raw?.instructions==='string'?raw.instructions:defaultInstructions;
 const projects=Array.isArray(raw?.projects)&&raw.projects.length?raw.projects:[
  {id:'mobile',name:projectName,description:'Explore how conversations, saved frames and Git history make the design process visible.',members:[userName,'Nicole Wei'],instructions},
  {id:'onboarding',name:'Workspace onboarding',archived:true,description:'Help a new team find its first shared task. Sample project.',members:[userName,'Alex Chen','Maya Lin'],instructions:''},
 ];
 const tasks=(Array.isArray(raw?.tasks)?raw.tasks:seedTasks()).filter(t=>!(t.kind==='mit'&&t.title==='New chat'&&t.origin!=='todo'&&!t.annotationSourceId&&((!t.project&&!t.projectId)||t.origin==='chat')&&!t.messages.length&&!t.input.length&&!t.output.length&&!raw?.drafts?.[t.id]?.trim()&&!raw?.todoAttachments?.[t.id]&&!raw?.chatComposers?.[t.id]?.todos.length));
 const mits=Array.isArray(raw?.mits)&&raw.mits.length?raw.mits:seedMits();
 return {chatComposers:raw?.chatComposers||{},sampleContentVersion:3,projects:projects.map(p=>({...p,archived:p.archived ?? p.id==='onboarding',mitIds:[...new Set([...(p.mitIds||[]),...tasks.filter(t=>t.projectId===p.id||(t.project&&!t.projectId&&p.id==='mobile')).map(t=>t.mitId||mits.find(m=>m.name===t.mit)?.id).filter((id):id is string=>!!id)])]})),mits,projectName,instructions,tasks:tasks.map(legacy=>{const {parentId: _parentId,...t}=legacy as Task & {parentId?:string};return {...t,origin:t.origin ?? (t.annotationSourceId ? 'todo' : seedTasks().find(sample=>sample.id===t.id)?.origin ?? 'todo'),mitId:t.kind==='mit'?(t.mitId||mits.find(m=>m.name===t.mit)?.id):undefined,projectId:t.projectId||(t.project?'mobile':undefined)};}),drafts:raw?.drafts||{},frameAttachments:raw?.frameAttachments||{},todoAttachments:raw?.todoAttachments||{},taskDetailsLinks:raw?.taskDetailsLinks||{}};
}
export function loadState(): SavedState {
 try {
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  if(raw && (!Array.isArray(raw.tasks)||!raw.tasks.every((t:Task)=>typeof t.id==='string' && typeof t.title==='string' && typeof t.mit==='string' && statuses.includes(t.status) && Array.isArray(t.input) && Array.isArray(t.output) && Array.isArray(t.messages))))return migrateState(null);
  // Unsent frame references are session-only, like queued file attachments.
  return { ...durableConversationState(durableCaptureState(migrateState(raw))), frameAttachments: {} };
 }catch{return migrateState(null);}
}
export function tasksForProject(tasks:Task[],id:string){return tasks.filter(t=>t.projectId===id);}
function durableCaptureState(state: SavedState): SavedState {
 return { ...state, chatComposers: Object.fromEntries(Object.entries(state.chatComposers ?? {}).map(([id, composer]) => [id, { ...composer, capture: { ...composer.capture, screen: durableCaptureScreen(composer.capture.screen) } }])) };
}
/** Sent demo turns live only in memory. Also discard turns saved by earlier builds. */
function durableConversationState(state: SavedState): SavedState {
 const seeds = new Map(seedTasks().map(task => [task.id, new Set(task.messages.map(message => message.id))]));
 return {...state, tasks: state.tasks.map(task => {
  let localTurn = false;
  return {...task, messages: task.messages.filter(message => {
   if (message.sessionOnly) { localTurn = true; return false; }
   if (seeds.get(task.id)?.has(message.id) || message.sourcePrompt !== undefined || message.versionOutput) {
    localTurn = false;
    return true;
   }
   if (message.role === 'user') { localTurn = true; return false; }
   return !(localTurn && message.role === 'mit');
  })};
 })};
}
export function saveState(state:SavedState) { localStorage.setItem(KEY,JSON.stringify({ ...durableConversationState(durableCaptureState(state)), frameAttachments: {} })); }
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

/** Default launch destination; resolve against saved tasks without replacing user data. */
export const defaultWorkbenchEntry = { taskId: 'panel', assetId: 'prototype' } as const;
export function workbenchEntry(state: SavedState) {
  const task = state.tasks.find(task => task.id === defaultWorkbenchEntry.taskId);
  const asset = task && [...task.input, ...task.output].includes(defaultWorkbenchEntry.assetId)
    ? assets.find(asset => asset.id === defaultWorkbenchEntry.assetId) : undefined;
  return { task, asset };
}

/** Task state is independent of who participates in a conversation. */
export function isTodoChat(task: Task) { return task.kind === 'mit' && task.origin !== 'chat'; }
export function todoContext(task: Task) { return task.todoPrompt || task.messages.find(message => message.role === 'user')?.text || task.title; }

/** Resolve saved-frame links through the same version grouping used by playback. */
export function hydratePromptMessages(tasks: Task[], captures: Capture[]): Task[] {
 const frames = buildVersions(captures).flatMap(version => version.frames);
 return tasks.map(task => ({...task, messages: task.messages.map(message => {
  if (message.sessionOnly) return message;
  const prompt = message.sourcePrompt ?? message.versionOutput?.prompt;
  const frame = frames.find(frame => frame.kind === 'prompt' && frame.number === prompt);
  if (!frame) return message;
  return {...message,
   ...(message.sourcePrompt ? {text: frame.fullPrompt ?? message.text} : {}),
   ...(message.versionOutput ? {versionOutput: {prompt: frame.number!, version: frame.version, imageUrl: frame.url, frameId: frame.id}} : {}),
  };
 })}));
}
