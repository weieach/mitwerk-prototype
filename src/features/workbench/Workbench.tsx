import type { RuntimeMode } from '../iteration-gallery/EmbeddedPrototype';
import { DrawerTodosContext } from './DrawerTodosContext';
import { BrandMenu } from './BrandMenu';
import { ComposerDrawer, ComposerModeSwitch, ComposerModelSelect } from './ComposerDrawer';
import { extractBucketToken, editComposerTodo, addComposerTodo, orderedComposerTodos, hydrateComposerTodos, todoVersionAt, type TodoVersion, defaultComposer, toggleComposerTodo, useTodoAsPrompt, type ChatComposerState } from './composer-state';
import { MessageOutput } from './MessageOutput';
import { PanelHeader } from '../../components/PanelHeader';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { appendFrameContext, attachFrame, attachFrameEvent, hasFrameDrag, readFrameDrag } from './frame-context';
import type { FrameContext } from './frame-context';
import { visibleMessageText } from './message-text';
import { TodoCard } from './TodoCard';
import { updateTodoTasks, type TodoTarget } from './todo-actions';
import { TodoCardContent } from './TodoCardContent';
import { attachTodoToChat, taskDetailsForChat, type TodoChoice } from './todo-context';
import { SidebarResize, useSidebarWidth } from './SidebarResize';
import { type WorkspacePane } from './WorkspaceTabs';
import { buildVersions, type Capture, type FrameRequest } from '../iteration-gallery/model';
import { useAnnotations, updateAnnotation, seedAnnotations, putAnnotation } from '../annotations/store';
import { annotationContext } from '../annotations/model';
import type { FrameAnnotation } from '../annotations/model';
import '@phosphor-icons/web/regular/style.css';
import { userName, userProfile, userInitials } from './user-profile';
import { projectColor } from './projectColor';
import { useTheme, type Theme } from '../../shared/theme';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bell, BookOpen, Check, ChevronRight, CircleCheck, Clock3, FileText, Folder, Image, Layers, LayoutGrid, ListTodo, LoaderCircle, MessageSquare, Moon, Paperclip, Plus, Search, Settings, Square, SquarePen, Sun, Workflow, X } from '../../components/PhosphorIcon';
import type { InterfaceIcon } from '../../components/PhosphorIcon';
import { ConversationCards, TodoContextChip, FrameContextChip, BucketContextChip } from './ConversationCards';
import { captureBucketStore } from '../../shared/capture-buckets';
import { panelIcons } from '../../components/panel-icons';
import { MentionInput } from './MentionInput';
import { MitsPage } from './MitsPage';
import { HomePage, ProjectsPage } from './CollaborationPages';
import ReadingWorkspace from '../../ReadingWorkspace';
import { assets as initialAssets, hydratePromptMessages, workbenchEntry, loadState, now, saveState, statuses, uid, tasksForProject, saveMit, archiveProject, isTodoChat, todoContext } from './model';
import mitwerkLogo from '../../assets/mitwerk-logo.png';
import type { Asset, SavedState, Task, TaskStatus, View, Mit } from './model';

type ModalState = 'search' | 'task' | 'project' | 'share' | null;
const nav: {name: View; icon:InterfaceIcon}[] = [{name:'Mits',icon:Workflow},{name:'Todos',icon:ListTodo},{name:'Library',icon:BookOpen}];
const assetIcons = {document:FileText, image:Image, prototype:LayoutGrid};
function Avatar({name, small=false, isMit, compact=false}:{name:string; small?:boolean;isMit?:boolean;compact?:boolean}) { const mit = isMit??name.includes('Mit'); return <span className={`mw-avatar ${mit?'is-mit':''} ${small?'small':''} ${compact?'compact':''}`} aria-hidden="true">{mit ? <Workflow size={compact?11:small?13:17}/> : name==='You' ? userInitials : name.split(' ').map(n=>n[0]).slice(0,2).join('')}</span>; }
function Status({status}:{status:TaskStatus}) { return <span className={`mw-status status-${statuses.indexOf(status)}`}>{status==='Complete'?<CircleCheck size={13}/>:<span className="status-dot"/>}<span className="status-label">{status}</span></span>; }
function IconButton({label, onClick, children, active=false, type="button", disabled=false}:{label:string;onClick?:()=>void;children:ReactNode;active?:boolean;type?:"button"|"submit";disabled?:boolean}) {return <button type={type} className={`mw-icon ${active?'active':''}`} title={label} aria-label={label} onClick={onClick} disabled={disabled}>{children}</button>;}
function ThemeToggle({theme, onChange, size}:{theme:Theme;onChange:(theme:Theme)=>void;size:number}) {const dark=theme==='dark';const label=dark?'Switch to light mode':'Switch to dark mode';return <button type="button" className="mw-icon theme-toggle" title={label} aria-label="Dark mode" aria-pressed={dark} onClick={()=>onChange(dark?'light':'dark')}>{dark?<Sun size={size}/>:<Moon size={size}/>}</button>;}
function Modal({title, onClose, children, className=""}:{title:string;onClose:()=>void;children:ReactNode;className?:string}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();return ()=>ref.current?.close();},[]);
 return <dialog ref={ref} className={`mw-modal ${className}`} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-label={title}><header><h2>{title}</h2><IconButton label="Close dialog" onClick={onClose}><X size={18}/></IconButton></header>{children}</dialog>;
}

export function Workbench() {
 const screenshotParams=new URLSearchParams(window.location.search);
 const screenshotMode=screenshotParams.get('screenshot')==='1';
 const chatCapture=screenshotMode?screenshotParams.get('chat')||'':'';
 const chatLayout=screenshotMode&&screenshotParams.get('layout')==='chat';
 const scrollTopCapture=screenshotMode&&screenshotParams.get('scroll')==='top';
 const todosCapture=screenshotMode&&screenshotParams.get('page')==='todos';
 const sideBySideCapture=screenshotMode&&screenshotParams.get('layout')==='side-by-side';
 const pinnedToast=screenshotMode&&screenshotParams.get('toast')==='1';
 const unavailableNotice="This isn't available yet.";
 const [state,setState] = useState<SavedState>(loadState);
 const [todoVersions, setTodoVersions] = useState<TodoVersion[]>([]);
 const annotations = useAnnotations();
 const boardTasks=state.tasks.filter(task=>isTodoChat(task)&&!annotations.some(note=>note.todo&&(note.id===task.annotationSourceId||note.chatId===task.id)));
 const [todoAction,setTodoAction] = useState<{target:TodoTarget;mode:'edit'|'delete'}|null>(null);
 const [todoText,setTodoText] = useState('');
 const [annotationChoice,setAnnotationChoice] = useState<FrameAnnotation|null>(null);
 const navigationCaptureOpened=useRef(false);
 useEffect(()=>{
  if(!todosCapture||screenshotParams.get('todoDialog')!=='navigation'||navigationCaptureOpened.current)return;
  const note=annotations.find(note=>note.todo&&!note.chatId);
  if(note){navigationCaptureOpened.current=true;setAnnotationChoice(note);}
 },[todosCapture,annotations]);
 const recentChat = useRef(localStorage.getItem('mitwerk-recent-chat') || '');
 const [entry]=useState(()=>workbenchEntry(state));
 const capturedTask=chatCapture?state.tasks.find(t=>t.title===chatCapture):undefined;
 const [view,setView]=useState<View>(todosCapture ? 'Todos' : capturedTask||entry.task ? 'dialog' : 'Home');
 const [activeId,setActiveId]=useState(capturedTask?.id ?? entry.task?.id ?? '');
 const [allAssets,setAssets]=useState(initialAssets);
 const [selectedProject,setSelectedProject]=useState(capturedTask?.projectId ?? entry.task?.projectId ?? state.projects[0]?.id ?? '');
 const [taskProjectId,setTaskProjectId]=useState('mobile');
 const [projectDescription,setProjectDescription]=useState('');
 const [queuedFiles,setQueuedFiles]=useState<Record<string,string[]>>({});
 const [reader,setReader]=useState<string|null>(sideBySideCapture || (!screenshotMode && !!entry.task) ? 'prototype' : screenshotMode && !capturedTask && !chatLayout && !todosCapture ? (entry.asset?.id ?? null) : null);
 const [frameRequest,setFrameRequest]=useState<FrameRequest|null>(()=>screenshotMode&&screenshotParams.get('liveOpen')==='1'?{live:true}:null);
 const [showImageAlbum,setShowImageAlbum]=useState(false);
 const [expanded,setExpanded]=useState(screenshotMode && !sideBySideCapture && !capturedTask && !chatLayout && !todosCapture && !!entry.asset);
 const [selectedPane,setSelectedPane]=useState<WorkspacePane>(screenshotMode && !sideBySideCapture && !capturedTask && !chatLayout && !todosCapture ? 'version' : 'chat');
 const [readerWidth,setReaderWidth]=useState(61);
 const [chatVisible,setChatVisible]=useState(true);
 const [ideaOpen,setIdeaOpen]=useState(screenshotMode&&screenshotParams.get('ideaStream')==='1');
 const [runtimeMode,setRuntimeMode]=useState<RuntimeMode|null>(null);
 const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width:600px)').matches);
 const [mobilePanel,setMobilePanel]=useState<'chat'|'version'|'live'>('version');
 useEffect(()=>{const media=window.matchMedia('(max-width:600px)');const update=()=>setMobile(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 const [collapsed,setCollapsed]=useState(true);
 const sidebarWidth=useSidebarWidth();
 const [sidebarInbox,setSidebarInbox]=useState(false);
 const [expandedProjects,setExpandedProjects]=useState<string[]>((capturedTask??entry.task)?.projectId ? [(capturedTask??entry.task)!.projectId!] : []);
 const [projectTab,setProjectTab]=useState('Overview');
 const [libraryTab,setLibraryTab]=useState('Skills');
 const [modal,setModal]=useState<ModalState>(null);
 const [search,setSearch]=useState('');
 const [newTitle,setNewTitle]=useState('');
 const [notice,setNotice]=useState(pinnedToast?unavailableNotice:'');
 const [pending,setPending]=useState<string[]>([]);
 const [assetTabs,setAssetTabs]=useState<Record<string,string[]>>({});
 const todoAttachments=state.todoAttachments || {};
 function setTodoAttachments(update:(current:NonNullable<SavedState['todoAttachments']>)=>NonNullable<SavedState['todoAttachments']>){setState(current=>({...current,todoAttachments:update(current.todoAttachments||{})}));}
 const [theme,setTheme]=useTheme();
 const [instructionsDraft,setInstructionsDraft]=useState(state.instructions);
 const [mitDraft,setMitDraft]=useState<Mit|null>(null);
 const [mitDetail,setMitDetail]=useState<string|null>(null);
 const timers=useRef(new Map<string,ReturnType<typeof setTimeout>>());
 const scrollRef=useRef<HTMLDivElement>(null);
 const composerRef=useRef<HTMLTextAreaElement>(null);
 const fileRef=useRef<HTMLInputElement>(null);
 const bodyRef=useRef<HTMLDivElement>(null);
 const drag=useRef(false);
 const boardDrag=useRef<string|null>(null);
 const boardClickSuppressed=useRef(false);
 const [boardTarget,setBoardTarget]=useState<TaskStatus|null>(null);
 const [frameDropTarget,setFrameDropTarget]=useState(false);
 const [boardDragging,setBoardDragging]=useState<string|null>(null);
 const assetTriggers=useRef<HTMLElement|null>(null);
 const launchTask:Task={origin:'chat',id:'__new_chat__',title:'New chat',status:'To do',creator:userName,mit:state.mits[0].name,mitId:state.mits[0].id,project:false,kind:'mit',unread:false,updated:'',input:[],output:[],messages:[]};
 const task=(activeId===launchTask.id?launchTask:state.tasks.find(t=>t.id===activeId)) ?? state.tasks[0] ?? launchTask;
 const isNewChat=task.kind==='mit'&&!task.projectId&&task.title==='New chat'&&task.messages.length===0;
 const isTaskChat=isTodoChat(task);
 const contextAttachment=todoAttachments[task.id];
 const frameAttachments=state.frameAttachments?.[task.id] || [];
 function removeFrameContext(id:string){setState(s=>({...s,frameAttachments:{...s.frameAttachments,[task.id]:(s.frameAttachments?.[task.id]||[]).filter(frame=>frame.id!==id)}}));}
 useEffect(()=>{
  const attach=(event:Event)=>{
   const frame=(event as CustomEvent<FrameContext>).detail;
   if(!frame?.id||!frame.url)return;
   setState(s=>({...s,frameAttachments:{...s.frameAttachments,[task.id]:appendFrameContext(s.frameAttachments?.[task.id]||[],frame)}}));
   setView('dialog');setReader('prototype');setSelectedPane('version');setExpanded(false);
   requestAnimationFrame(()=>composerRef.current?.focus());
  };
  window.addEventListener(attachFrameEvent,attach);
  return()=>window.removeEventListener(attachFrameEvent,attach);
 },[task.id]);
 useEffect(()=>{
  const clear=()=>setFrameDropTarget(false);
  window.addEventListener('dragend',clear);window.addEventListener('drop',clear);
  return()=>{window.removeEventListener('dragend',clear);window.removeEventListener('drop',clear);};
 },[]);
 const taskDetails=taskDetailsForChat(state,task,annotations);
 const openAssetIds=assetTabs[task.id] || [];
 const activeMit=state.mits.find(m=>m.id===task.mitId)||state.mits.find(m=>m.name===task.mit);
 const readerAssets=(view==='dialog'?allAssets.filter(a=>a.id===reader||[...task.input,...task.output,...task.messages.flatMap(m=>[...(m.assetIds||[]),...(m.assetId?[m.assetId]:[])])].includes(a.id)):view==='project'?allAssets.filter(a=>a.id===reader||state.tasks.filter(t=>t.projectId===selectedProject).some(t=>[...t.input,...t.output,...t.messages.flatMap(m=>[...(m.assetIds||[]),...(m.assetId?[m.assetId]:[])])].includes(a.id))):allAssets).slice().sort((a,b)=>Number(b.kind==='prototype')-Number(a.kind==='prototype'));
 const readerImages=readerAssets.filter(a=>a.kind==='image');
 const groupedImages=readerImages.length>1;
 const openedAsset=allAssets.find(a=>a.id===reader);
 const availablePanels=[...(chatVisible?['chat']:[]),...(openedAsset?['version']:[])];
 const mobileActive=availablePanels.includes(mobilePanel)?mobilePanel:availablePanels.at(-1);
 const chatShown=chatVisible&&!expanded&&(!mobile||mobileActive==='chat');
 const versionShown=!!openedAsset&&(!mobile||mobileActive==='version');
 const ideasShown=ideaOpen&&versionShown&&reader==='prototype';
 const liveShown=runtimeMode==='live'&&versionShown;
 function togglePanel(panel:'chat'|'version'|'ideas'|'live') {
  if(panel==='live'){setView('dialog');setReader('prototype');setSelectedPane('version');setMobilePanel('version');setExpanded(false);setFrameRequest({live:true});return;}
  if(panel==='ideas'){setIdeaOpen(!ideasShown);setSelectedPane('version');setReader('prototype');setMobilePanel('version');return;}
  setExpanded(false);setMobilePanel(panel);
  if(panel==='chat'){if(view!=='dialog'){setView('dialog');setChatVisible(true);}else setChatVisible(!chatShown);}
  if(panel==='version'){setSelectedPane('version');if(versionShown&&reader==='prototype'){setReader(null);setIdeaOpen(false);}else setReader('prototype');}
 }
 const draft=state.drafts[task.id] || '';
 const composer=state.chatComposers?.[task.id] ?? defaultComposer();
 function updateComposer(update:(current:ChatComposerState)=>ChatComposerState){setState(s=>({...s,chatComposers:{...s.chatComposers,[task.id]:update(s.chatComposers?.[task.id]??defaultComposer())}}));}
 function useDrawerTodo(id:string) {
  setState(s=>{const next=useTodoAsPrompt(s.chatComposers?.[task.id]??defaultComposer(),s.drafts[task.id]||'',id);return {...s,chatComposers:{...s.chatComposers,[task.id]:next.composer},drafts:{...s.drafts,[task.id]:next.draft}};});
  requestAnimationFrame(()=>{const input=composerRef.current;input?.focus();input?.setSelectionRange(input.value.length,input.value.length);});
 }
 useEffect(()=>{if(screenshotMode&&screenshotParams.get('todoDrawer')==='open')updateComposer(current=>({...current,open:true}));},[task.id]);
 const capturedTodoDraft = useRef(false);
 useEffect(() => {
  if (!screenshotMode || screenshotParams.get('todoDraft') !== '1' || capturedTodoDraft.current || !composer.sampleTodosSeeded) return;
  const todo = orderedComposerTodos(composer.todos).find(todo => !todo.complete);
  if (!todo) return;
  capturedTodoDraft.current = true;
  useDrawerTodo(todo.id);
 }, [composer.todos, composer.sampleTodosSeeded]);
 const working=pending.includes(task.id);
 const unread=state.tasks.filter(t=>t.kind==='mit'&&t.unread).length;
 const currentProject=state.projects.find(p=>p.id===selectedProject)??state.projects[0];
 const projectTasks=tasksForProject(state.tasks,currentProject.id);
 const attached=queuedFiles[task.id]||[];
 const dialogProject=state.projects.find(p=>p.id===task.projectId);
 const collaborationProps={state:{...state,tasks:state.tasks.filter(t=>t.kind==='mit')},onArchive:(id:string,archived:boolean)=>{setState(s=>archiveProject(s,id,archived));setNotice(archived?'Project archived. Find it in Projects → Archived.':'Project restored to Active.');},openProject,openTask,createProject:beginProject,findMits:()=>navigate('Mits')};
 const reviewCount=projectTasks.filter(t=>t.status==='Ready for review').length;
 useEffect(()=>{const abort=new AbortController();void fetch(`${import.meta.env.BASE_URL}gallery/manifest.json`,{signal:abort.signal}).then(r=>r.json()).then(c=>{if(!abort.signal.aborted&&Array.isArray(c.frames)){const frames=buildVersions(c.frames).flatMap(v=>v.frames);seedAnnotations(frames);setTodoVersions(frames);setState(state=>({...state,tasks:hydratePromptMessages(state.tasks,c.frames),chatComposers:hydrateComposerTodos(state.chatComposers??{},frames,'panel')}));setAssets(assets=>assets.map(asset=>({...asset,previewUrl:asset.previewPrompt?c.frames.find((frame:Capture)=>frame.kind==='prompt'&&frame.number===asset.previewPrompt)?.url:asset.previewUrl})));}}).catch(()=>{});return()=>abort.abort();},[]);
 useEffect(()=>{try {saveState(state);}catch{setNotice('Local storage is full. Changes will remain in this session.');}},[state]);
 useEffect(()=>{if(!notice||pinnedToast)return;const t=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(t);},[notice,pinnedToast]);
 useEffect(()=>{const el=scrollRef.current;if(!el)return;el.scrollTo({top:scrollTopCapture?0:el.scrollHeight,behavior:'instant'});},[task.id,task.messages.length,working,scrollTopCapture]);
 useEffect(()=>{if(todosCapture&&view==='Todos')document.documentElement.dataset.screenshotReady='1';},[todosCapture,view]);
 useEffect(()=>{const chatShot=chatLayout||Boolean(chatCapture);if(!chatShot||view!=='dialog')return;if(chatCapture&&task.title!==chatCapture)return;if(scrollTopCapture&&(scrollRef.current?.scrollTop??1)!==0)return;document.documentElement.dataset.screenshotReady='1';},[chatLayout,chatCapture,task.title,view,scrollTopCapture,task.messages.length]);
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);},[]);
 useEffect(()=>{const open=()=>{setView('Todos');setReader(null);setExpanded(false);setSelectedPane('chat');};window.addEventListener('mitwerk-open-todos',open);return()=>window.removeEventListener('mitwerk-open-todos',open);},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setModal('search');}if(e.key==='Escape'&&!document.querySelector('dialog[open]')){setReader(null);setExpanded(false);setSelectedPane('chat');}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 useEffect(()=>{const move=(e:PointerEvent)=>{if(!drag.current||!bodyRef.current)return;const r=bodyRef.current.getBoundingClientRect();setReaderWidth(Math.max(35,Math.min(70,(r.right-e.clientX)/r.width*100)));};const stop=()=>{drag.current=false;document.body.style.cursor='';};window.addEventListener('pointermove',move);window.addEventListener('pointerup',stop);window.addEventListener('pointercancel',stop);return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop);};},[]);
 function openTodoAction(target:TodoTarget,mode:'edit'|'delete',text:string){setTodoText(text);setTodoAction({target,mode});}
 function saveTodoAction(){
  if(!todoAction)return;
  const {target,mode}=todoAction;
  const text=mode==='delete'?null:todoText.trim();
  if(text==='')return;
  const note=target.kind==='annotation'?annotations.find(note=>note.id===target.id):undefined;
  try {
   if(note)putAnnotation({...note,...(text===null?{todo:false}:{text}),updatedAt:new Date().toISOString()});
   setState(current=>({...current,tasks:updateTodoTasks(current.tasks,target,note,text)}));
   setTodoAction(null);setNotice(text===null?'To-do deleted. Existing chats and frame notes are kept.':'To-do updated.');
  }catch{setNotice('Could not save this change. Please try again.');}
 }
 function updateTask(id:string,fn:(t:Task)=>Task){setState(s=>({...s,tasks:s.tasks.map(t=>t.id===id?fn(t):t)}));}
 function navigate(next:View){setChatVisible(true);setMobilePanel('chat');if(next==='Mits'||next==='Library'){setNotice(unavailableNotice);return;}if(window.matchMedia('(max-width:850px)').matches)setCollapsed(true);setView(next);setReader(next==='dialog'?'prototype':null);setExpanded(false);setSelectedPane('chat');}
 function openTask(id:string){recentChat.current=id;localStorage.setItem('mitwerk-recent-chat',id);const target=state.tasks.find(t=>t.id===id);if(target?.projectId)setSelectedProject(target.projectId);setActiveId(id);navigate('dialog');updateTask(id,t=>({...t,unread:false}));}
 function openAsset(id:string){
   const asset=allAssets.find(item=>item.id===id);
   if(asset?.previewPrompt){
     if(asset.previewUrl)window.open(asset.previewUrl,'_blank','noopener,noreferrer');
     else setNotice('This frame preview is still loading. Please try again in a moment.');
     return;
   }
   setAssetTabs(tabs=>({...tabs,[task.id]:[...new Set([...(tabs[task.id]||[]),id])]}));
   setSelectedPane(`asset:${id}`);setShowImageAlbum(false);assetTriggers.current=document.activeElement as HTMLElement;setReader(id);setExpanded(true);
 }

 function paneAsset(pane:WorkspacePane){return pane==='version'?'prototype':pane.startsWith('asset:')?pane.slice(6):null;}
 function selectPane(pane:WorkspacePane){
   setSelectedPane(pane);setShowImageAlbum(false);
   if(reader&&!expanded) { if(pane!=='chat')setReader(paneAsset(pane)); return; }
   setReader(paneAsset(pane));setExpanded(pane!=='chat');
 }
 function closeAssetTab(id:string){
   const remaining=openAssetIds.filter(value=>value!==id);
   setAssetTabs(tabs=>({...tabs,[task.id]:remaining}));
   if(selectedPane===`asset:${id}`){setSelectedPane('chat');setReader(expanded?null:'prototype');setExpanded(false);}
   else if(reader===id&&selectedPane==='chat')setReader('prototype');
   requestAnimationFrame(()=>document.getElementById('navigation-toggle')?.focus());
 }
 function toggleWorkspaceFullscreen(){
   if(!reader||expanded){setReader(paneAsset(selectedPane)||'prototype');setExpanded(false);}
   else {setReader(paneAsset(selectedPane));setExpanded(selectedPane!=='chat');}
 }
 function attachTodoContext(todo: Pick<TodoChoice, 'text' | 'annotationId' | 'taskId'>, chatId=task.id){
   setState(current=>attachTodoToChat(current,chatId,todo));
   requestAnimationFrame(()=>composerRef.current?.focus());
 }
 function annotationProject(note:FrameAnnotation){
   const projectId=note.projectId || state.tasks.find(t=>t.id===note.chatId)?.projectId
     || state.tasks.find(t=>[...t.input,...t.output].includes('prototype'))?.projectId;
   return state.projects.find(project=>project.id===projectId)?.name || 'Personal workspace';
 }
 function taskFrames(target:Task){
   const note=annotations.find(item=>item.id===target.annotationSourceId||item.chatId===target.id);
   return note ? [{id:note.frame.id,label:`Prompt #${note.frame.number} (v${note.frame.version})`}]
     : (state.frameAttachments?.[target.id] || []).map(frame=>({id:frame.id,label:frame.label}));
 }
 function openTaskTodo(target:Task){
   const note=annotations.find(note=>note.id===target.annotationSourceId);
   attachTodoContext({text:note?.text||todoContext(target),annotationId:note?.id,taskId:note?undefined:target.id},target.id);
   openTask(target.id);
 }
 function startMitTask(mit:Mit,projectId:string,title=`New task with ${mit.name}`){const id=uid();const t:Task={id,title,status:'To do',creator:userName,mit:mit.name,mitId:mit.id,project:!!projectId,projectId:projectId||undefined,kind:'mit',unread:false,updated:now(),created:new Date().toISOString(),input:[],output:[],messages:[]};setState(s=>({...s,tasks:[...s.tasks,t]}));setActiveId(id);if(projectId)setSelectedProject(projectId);navigate('dialog');}
 function newChat(){setSidebarInbox(false);setActiveId(launchTask.id);navigate('dialog');requestAnimationFrame(()=>composerRef.current?.focus());}
 function toggleInbox(){setCollapsed(false);setSidebarInbox(v=>!v);}
 function openProject(id:string){setSelectedProject(id);setProjectTab('Overview');setInstructionsDraft(state.projects.find(p=>p.id===id)?.instructions||'');navigate('project');}
 function beginProject(){setNewTitle('');setProjectDescription('');setModal('project');}
 function startCreate(type:ModalState){setTaskProjectId(currentProject.id);if(type==='project'){beginProject();return;}setNewTitle('');setModal(type);}
 function createTask(){const title=newTitle.trim();if(!title)return;if(modal==='project'){const id=uid();setState(s=>({...s,projects:[...s.projects,{id,name:title,description:projectDescription.trim(),members:[userName],instructions:''}]}));setSelectedProject(id);setProjectTab('Overview');setInstructionsDraft('');setModal(null);navigate('project');setNotice('Project created locally with the selected members. No invitations were sent.');return;}const id=uid();const t:Task={id,title,status:'To do',creator:userName,mit:task.kind==='mit'?task.mit:state.mits[0].name,mitId:task.kind==='mit'?activeMit?.id:state.mits[0].id,project:true,projectId:taskProjectId,kind:'mit',unread:false,updated:now(),created:new Date().toISOString(),input:[],output:[],messages:[]};setState(s=>({...s,tasks:[...s.tasks,t]}));setModal(null);setActiveId(id);if(t.projectId)setSelectedProject(t.projectId);navigate('dialog');}
 function runAnnotation(note:FrameAnnotation, destination:'new'|'recent'|string){
   const existing=destination==='recent' ? state.tasks.find(t=>t.id===(recentChat.current||activeId)&&t.kind==='mit') : destination==='new' ? undefined : state.tasks.find(t=>t.id===destination);
   const id=existing?.id??uid();
   const mit=state.mits[0];
   const next:Task=existing??{id,origin:'todo',todoPrompt:note.text,annotationSourceId:note.id,title:note.text.split('\n')[0].slice(0,80),status:'To do',creator:userName,mit:mit.name,mitId:mit.id,project:!!selectedProject,projectId:selectedProject||undefined,kind:'mit',unread:false,updated:now(),created:new Date().toISOString(),input:[],output:[],messages:[]};
   try { updateAnnotation(note.id,{chatId:id}); } catch { setNotice('Could not save the chat link. Please try again.'); return; }
   setState(s=>({...s,tasks:existing?s.tasks:[...s.tasks,next]}));
   attachTodoContext({text:note.text,annotationId:note.id},id);
   recentChat.current=id;localStorage.setItem('mitwerk-recent-chat',id);setActiveId(id);setAnnotationChoice(null);navigate('dialog');
   requestAnimationFrame(()=>composerRef.current?.focus());
 }
 function openAnnotationTodo(note:FrameAnnotation){
   if(note.chatId&&state.tasks.some(t=>t.id===note.chatId)){attachTodoContext({text:note.text,annotationId:note.id},note.chatId);openTask(note.chatId);}
   else setAnnotationChoice(note);
 }
 /** In To-do mode, a finished `/bucket ` token becomes the field's bucket chip. */
 function changeDraft(value:string){
  const token=composer.mode==='todo'?extractBucketToken(value,composerRef.current?.selectionStart??value.length):null;
  const bucket=token?captureBucketStore.add(token.bucket):null;
  if(token&&bucket){
   setState(s=>({...s,chatComposers:{...s.chatComposers,[task.id]:{...(s.chatComposers?.[task.id]??defaultComposer()),todoBucket:bucket}},drafts:{...s.drafts,[task.id]:token.text}}));
   requestAnimationFrame(()=>composerRef.current?.setSelectionRange(token.caret,token.caret));
   return;
  }
  setState(s=>({...s,drafts:{...s.drafts,[task.id]:value}}));
 }
 function send(){
   if(composer.mode==='todo') {
     if(!draft.trim())return;
     const created = new Date().toISOString();
     setState(s=>{const current=s.chatComposers?.[task.id]??defaultComposer();const saved=addComposerTodo(current,draft,uid(),created,{version:todoVersionAt(todoVersions,created),...(current.todoBucket?{bucket:current.todoBucket}:{})});return {...s,chatComposers:{...s.chatComposers,[task.id]:{...saved,todoBucket:undefined}},drafts:{...s.drafts,[task.id]:''}};});
     requestAnimationFrame(()=>composerRef.current?.focus());
     return;
   }
   if(working||(!draft.trim()&&!contextAttachment&&!attached.length&&!frameAttachments.length))return;
   const id=task.id===launchTask.id?uid():task.id;
   const linked=annotations.filter(note=>note.todo&&(contextAttachment?.annotationId===note.id||(note.chatId===task.id&&draft.includes(`[Frame annotation ${note.id}]`))));
   const source=linked.find(note=>note.id===contextAttachment?.annotationId);
   const text=[contextAttachment?`To-do: ${source?.text || visibleMessageText(contextAttachment.text)}`:'',draft.trim()].filter(Boolean).join('\n\n');
   const message={id:uid(),role:'user' as const,name:userName,time:now(),text,assetIds:attached,
     annotationContext:source?annotationContext(source):undefined,
     frames:source?appendFrameContext(frameAttachments,{id:source.frame.id,url:source.frame.url,filename:'',label:`Prompt #${source.frame.number} (v${source.frame.version})`}):frameAttachments};
   setState(s=>{
     const submitted={...task,id, title:task.title==='New chat'?(draft.trim()||contextAttachment?.text||frameAttachments[0]?.label||'Shared files').slice(0,80):task.title,
       status:isTaskChat?'In progress' as const:task.status,updated:now(),input:[...new Set([...task.input,...attached])],messages:[...task.messages,message]};
     const chatComposers={...s.chatComposers,[id]:s.chatComposers?.[task.id]??defaultComposer()};
     if(id!==task.id)delete chatComposers[task.id];
     return {...s,chatComposers,frameAttachments:{...s.frameAttachments,[task.id]:[]},drafts:{...s.drafts,[task.id]:''},tasks:s.tasks.some(t=>t.id===id)?s.tasks.map(t=>t.id===id?submitted:t):[...s.tasks,submitted]};
   });
   setTodoAttachments(current=>{const next={...current};delete next[task.id];return next;});
   setQueuedFiles(current=>({...current,[task.id]:[]}));
   if(id!==task.id)setActiveId(id);
   linked.forEach(note=>updateAnnotation(note.id,{status:'In progress'}));setPending(p=>[...p,id]);
   timers.current.set(id,setTimeout(()=>{
     updateTask(id,t=>({...t,status:isTodoChat(t)?'Ready for review':t.status,updated:now(),messages:[...t.messages,{id:uid(),role:'mit',name:t.mit,time:now(),text:linked.length
       ? `Demo run — I received your to-do and its saved frame reference.\n\n${linked.map(note=>`• ${note.text}`).join('\n')}\n\nI would inspect the referenced frame, apply the requested changes, and return an updated frame for review. No source files were changed.`
       : `Demo response — I received your message${contextAttachment?' and attached to-do context':''}${attached.length?' and files':''}${frameAttachments.length?' and saved frame context':''}. This conversation is ready to continue; no live agent has run or source files been changed.`}]}));
     linked.forEach(note=>updateAnnotation(note.id,{status:'Ready for review'}));setPending(p=>p.filter(value=>value!==id));timers.current.delete(id);
   },900));
 }
 function stop(){annotations.filter(note=>note.chatId===task.id&&note.status==='In progress').forEach(note=>updateAnnotation(note.id,{status:'To do'}));clearTimeout(timers.current.get(task.id));timers.current.delete(task.id);setPending(p=>p.filter(x=>x!==task.id));updateTask(task.id,t=>({...t,status:'To do'}));setNotice('Demo run stopped. Your message is kept in the conversation.');}
 function moveBoardTask(id:string,status:TaskStatus){const item=state.tasks.find(t=>t.id===id);if(!item||item.status===status||pending.includes(id))return;updateTask(id,t=>({...t,status,updated:now(),unread:false}));setNotice(`${item.title} moved to ${status}.`);}
 function setDetailsStatus(status:TaskStatus){
   if(taskDetails.annotationId) updateAnnotation(taskDetails.annotationId,{status});
   else if(taskDetails.taskId) updateTask(taskDetails.taskId,t=>({...t,status,updated:now(),unread:false}));
 }
 function setStatus(status:TaskStatus){annotations.filter(note=>note.chatId===task.id&&note.todo).forEach(note=>updateAnnotation(note.id,{status}));updateTask(task.id,t=>({...t,status,updated:now(),unread:false}));}
 async function attach(file:File){if(file.size>10*1024*1024){setNotice('Choose a file smaller than 10 MB.');return;}const image=file.type.startsWith('image/');const text=/\.(txt|md|json|csv)$/i.test(file.name);if(!image&&!text){setNotice('This demo supports images, TXT, Markdown, JSON and CSV files.');return;}const id=uid();const a:Asset={id,title:file.name,kind:image?'image':'document',detail:'Your attachment · This session',local:true};if(image)a.url=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file);});else a.content=await file.text();setAssets(s=>[...s,a]);setQueuedFiles(q=>({...q,[task.id]:[...(q[task.id]||[]),id]}));setNotice('File ready to send. Uploaded files are available for this session.');}
 function assetButton(a:Asset,compact=false){const I=assetIcons[a.kind];return <button key={a.id} type="button" data-asset-id={a.id} className={`mw-attachment ${reader===a.id?'selected':''} ${compact?'compact':''}`} onClick={()=>openAsset(a.id)}><span className={`asset-type ${a.kind}`}><I size={compact?15:18}/></span><span><strong>{a.title}</strong>{!compact&&<small>{a.detail}</small>}</span><ArrowUpRight size={compact?"var(--context-action-icon-size)":14}/></button>;}
 function taskRow(t:Task){return <button className="mw-task-row" key={t.id} onClick={()=>openTask(t.id)}><span className="task-title-cell"><MessageSquare size={16}/><span><strong>{t.title}</strong></span></span><Status status={t.status}/><span className="row-person"><Avatar isMit={t.kind==='mit'} name={t.mit} small/>{t.mit}</span><span className="row-time">{t.updated}</span><ChevronRight size={15}/></button>;}
 const results=state.tasks.filter(t=>t.kind==='mit'&&t.title.toLowerCase().includes(search.toLowerCase()));
 return <DrawerTodosContext.Provider value={{ todos: composer.todos, toggle: id => updateComposer(current => toggleComposerTodo(current, id)) }}><div className={`mw-app ${collapsed?'nav-collapsed':''} ${sidebarInbox?'sidebar-inbox-mode':''}`} data-theme={theme} data-page={view} style={sidebarWidth.style}>
  {todoAction&&<Modal title={todoAction.mode==='edit'?'Edit to-do':'Delete to-do?'} onClose={()=>setTodoAction(null)}><form onSubmit={e=>{e.preventDefault();saveTodoAction();}}>{todoAction.mode==='edit'?<label className="form-label">To-do<textarea autoFocus className="todo-edit-text" value={todoText} onChange={e=>setTodoText(e.target.value)} rows={5} required/></label>:<><p>Remove this to-do from your dashboard? Its existing chat and frame annotation will be kept.</p><p className="annotation-todo-context">{todoText}</p></>}<div className="modal-actions"><button type="button" className="mw-button" onClick={()=>setTodoAction(null)}>Cancel</button><button type="submit" className={`mw-button ${todoAction.mode==='edit'?'primary':'todo-delete'}`} disabled={todoAction.mode==='edit'&&!todoText.trim()}>{todoAction.mode==='edit'?'Save changes':'Delete to-do'}</button></div></form></Modal>}
  {annotationChoice&&<Modal className="todo-navigation-dialog" title="Where would you like to work on this to-do?" onClose={()=>setAnnotationChoice(null)}><div className="todo-navigation-actions"><button className="mw-button" onClick={()=>runAnnotation(annotationChoice,'recent')} disabled={!state.tasks.some(t=>t.id===(recentChat.current||activeId)&&t.kind==='mit')}>Continue recent chat</button><button className="mw-button primary" onClick={()=>runAnnotation(annotationChoice,'new')}>Start new chat</button></div></Modal>}
  {!collapsed&&<button className="navigation-backdrop" aria-label="Close navigation" onClick={()=>setCollapsed(true)}/>}
  <aside id="main-navigation" className="mw-sidebar" aria-label="Main navigation" inert={collapsed} onKeyDown={e=>{if(e.key==='Escape'){setCollapsed(true);requestAnimationFrame(()=>document.getElementById('navigation-toggle')?.focus());}}}>
   <div className="sidebar-main">
   <div className="mw-brand"><button className="workspace-brand" title="Collapse navigation" aria-label="Collapse navigation" onClick={()=>setCollapsed(true)}><img className="workspace-logo" src={mitwerkLogo} alt="MitWerk"/></button><div className="sidebar-header-actions"><IconButton label="Search workspace" onClick={()=>{setSearch('');setModal('search');}}><Search size={18}/></IconButton><ThemeToggle theme={theme} onChange={setTheme} size={18}/><button className={`mw-icon inbox-toggle ${sidebarInbox?'active':''}`} aria-label={sidebarInbox?'Close inbox':'Open inbox'} aria-pressed={sidebarInbox} title="Inbox" onClick={toggleInbox}><Bell size={18}/>{unread>0&&<span className="unread-dot"/>}</button></div></div>
   <div className="sidebar-nav">{sidebarInbox?<button className="mw-nav-item new-chat" onClick={newChat}><SquarePen size="var(--sidebar-nav-icon-size)"/><span>New chat</span></button>:<nav><button className="mw-nav-item new-chat" onClick={newChat}><SquarePen size="var(--sidebar-nav-icon-size)"/><span>New chat</span></button>{nav.map(({name,icon:I})=><button key={name} title={name} aria-current={view===name?'page':undefined} className={`mw-nav-item ${view===name?'active':''}`} onClick={()=>navigate(name)}><I size="var(--sidebar-nav-icon-size)"/><span>{name}</span>{name==='Inbox'&&unread>0&&<b>{unread}</b>}</button>)}</nav>}</div>{sidebarInbox?<div className="sidebar-inbox" aria-label="Inbox conversations">{['Priority','Recent'].map(group=>{const items=state.tasks.filter(t=>t.kind==='mit'&&(group==='Priority'?(t.unread||t.status==='Ready for review'):(!t.unread&&t.status!=='Ready for review')));return items.length>0&&<section key={group}><h2>{group}</h2>{items.map(t=><button key={t.id} title={`${t.title} · ${state.projects.find(p=>p.id===t.projectId)?.name||t.mit}`} className={`sidebar-inbox-item ${view==='dialog'&&activeId===t.id?'current':''}`} onClick={()=>openTask(t.id)}><span className="inbox-task-title">{t.unread&&<i/>}<strong>{t.title}</strong></span><p>{t.messages.at(-1)?.text.split('\n').filter(Boolean).slice(0,2).join(' ')||(t.messages.at(-1)?.assetIds?.length?'Shared an attachment':'Start this conversation')}</p></button>)}</section>})}{!state.tasks.some(t=>t.kind==='mit')&&<p className="sidebar-inbox-empty">No conversations yet. Start a new chat.</p>}</div>:
   <div className="sidebar-section project-navigation"><button type="button" className="sidebar-label" onClick={()=>navigate('Projects')}><span className="project-section-title">Projects</span><ArrowUpRight size={12} aria-hidden="true"/></button>{state.projects.filter(p=>!p.archived).map(p=><div className="sidebar-project-group" style={projectColor(state.projects,p.id)} key={p.id}><button className={`sidebar-project ${view==='project'&&currentProject.id===p.id?'current':''}`} aria-expanded={expandedProjects.includes(p.id)} aria-controls={`project-tasks-${p.id}`} onClick={()=>{setCollapsed(false);setExpandedProjects(ids=>ids.includes(p.id)?ids.filter(id=>id!==p.id):[...ids,p.id]);}} title={p.name}><Folder size="var(--sidebar-nav-icon-size)"/><span>{p.name}</span></button>{expandedProjects.includes(p.id)&&<div id={`project-tasks-${p.id}`} className="sidebar-task-list">{tasksForProject(state.tasks,p.id).filter(t=>t.kind==='mit').map(t=><button key={t.id} className={`${view==='dialog'&&activeId===t.id?'current':''}`} onClick={()=>openTask(t.id)} title={t.title}><span>{t.title}</span>{isTodoChat(t)&&<span className={`sidebar-task-status status-${statuses.indexOf(t.status)}`} role="img" aria-label={t.status} title={t.status}>{t.status==='Complete'?<i className="ph ph-check-circle" aria-hidden="true"/>:<span className="status-dot"/>}</span>}</button>)}{!tasksForProject(state.tasks,p.id).length&&<p>No tasks yet</p>}</div>}</div>)}</div>
   }
   </div>
   <div className="sidebar-bottom"><button className="mw-user" onClick={()=>navigate('Settings')} title="User settings"><Avatar name={userName}/><span><strong>{userName}</strong></span><Settings size={16}/></button></div>
  </aside>
  {!collapsed&&<SidebarResize onResize={sidebarWidth.update}/>}
  <div className="mw-main">
   <header id="workspace-bar" className="mw-topbar">
    <BrandMenu theme={theme} onTheme={setTheme}/>
    <nav className="workspace-links" aria-label="Workspace views">
     {/* View links follow the panels' left-to-right order: chat, reader (Version blocks, Idea stream), then Live server. */}
     <button aria-pressed={chatShown&&view==='dialog'} aria-controls="workspace-pane-chat" onClick={()=>togglePanel('chat')}><PhosphorIcon name={panelIcons.chat} size={15}/><span className="workspace-link-label">Chat</span></button>
     <button aria-pressed={versionShown&&reader==='prototype'} aria-controls="workspace-pane-version" onClick={()=>togglePanel('version')}><PhosphorIcon name={panelIcons.versionBlocks} size={15}/><span className="workspace-link-label">Version blocks</span></button>
     <button aria-pressed={ideasShown} aria-controls="workspace-pane-ideas" onClick={()=>togglePanel('ideas')}><PhosphorIcon name={panelIcons.ideaStream} size={15}/><span className="workspace-link-label">Idea stream</span></button>
     <button aria-pressed={liveShown} aria-controls="workspace-pane-version" onClick={()=>togglePanel('live')}><PhosphorIcon name={panelIcons.liveServer} size={15}/><span className="workspace-link-label">Live server</span></button>
     {openAssetIds.filter(id=>id!=='prototype').map(id=>{const asset=allAssets.find(a=>a.id===id);return asset&&<span className="workspace-resource" key={id}><button onClick={()=>selectPane(`asset:${id}`)}>{asset.title}</button><button aria-label={`Close ${asset.title}`} onClick={()=>closeAssetTab(id)}><X size={12}/></button></span>;})}
    </nav>
   </header>
   <div ref={bodyRef} className={`mw-body ${reader?'reader-open':''} ${expanded?'reader-expanded':''} ${reader&&!expanded?'mw-split-view':''} ${!chatVisible?'chat-hidden':''}`} style={{'--reader-width':`${readerWidth}%`} as CSSProperties}>
    <main hidden={!chatShown} id="workspace-pane-chat" aria-label="Conversation" className="mw-surface">
     {view==='dialog' ? <section className={`mw-dialog ${isNewChat?'new-chat-launch':''} ${!task.messages.length?'empty-chat':''}`} aria-label={isNewChat?'New chat':isTaskChat?'Task conversation':'Chat conversation'}>
      <PanelHeader title={isNewChat?'New chat':task.title} icon={panelIcons.chat} expanded={!reader} onToggle={()=>{setSelectedPane('chat');if(!reader){setReader('prototype');setExpanded(false);}else{setReader(null);setExpanded(false);}}}/>
      {!isNewChat&&(isTaskChat||task.messages.length>0)&&!reader&&<ConversationCards task={task} details={taskDetails} assets={allAssets} working={working} onStatus={setDetailsStatus} onAttachFile={()=>fileRef.current?.click()} renderAsset={asset=>assetButton(asset,true)}/>}


      <div className="conversation-scroll" ref={scrollRef}><div className="conversation-inner">{isNewChat?<div className="new-chat-welcome"><h1>What would you like to work on?</h1><p>Start with an idea, a question, or a file.</p></div>:task.messages.length===0&&isTaskChat&&<div className="conversation-empty"><Avatar isMit={task.kind==='mit'} name={task.mit}/><h2>{task.kind==='colleague'?`Say hello to ${task.mit}.`:`Work it out with ${task.mit}.`}</h2><p>{task.kind==='colleague'?'Send a message or share a file. Start a project together when you’re ready.':'Describe what you want to explore. Your inputs stay close, and each output has a place to return to.'}</p></div>}
       {task.messages.map(m=><article className={`mw-message ${m.role==='user'?'from-user':''}`} key={m.id} aria-label={`${m.role==='user'?'You':m.name} at ${m.time}`}>{m.role==='colleague'&&<div className="message-byline"><strong>{m.name}</strong></div>}<div className="message-content">{(m.role==='user'?visibleMessageText(m.text):m.text).split('\n\n').map((p,i)=><p key={i}>{p}</p>)}{m.frames?.map(frame=><FrameContextChip key={frame.id} frame={frame}/>)}{m.assetIds?.map(id=>allAssets.find(a=>a.id===id)).filter((a):a is Asset=>!!a).map(a=>assetButton(a))}{m.assetId&&allAssets.find(a=>a.id===m.assetId)&&assetButton(allAssets.find(a=>a.id===m.assetId)!)}</div>{m.versionOutput?.frameId&&<MessageOutput output={m.versionOutput} onOpen={milestone=>{setFrameRequest({frameId:m.versionOutput!.frameId!,milestone});if(milestone)setIdeaOpen(false);setReader('prototype');setExpanded(false);setSelectedPane('version');setMobilePanel('version');}}/>}<time className="message-time">{m.time}</time></article>)}
       {working&&<div className="run-progress" role="status"><LoaderCircle size={15} className="spinning"/><span>{task.mit} is preparing a sample response…</span></div>}
       {isTaskChat&&task.status==='Ready for review'&&!working&&<div className="review-bar"><div className="review-heading"><strong>Ready for review</strong><small>Take a look before moving forward.</small></div><div><button className="mw-button" onClick={()=>{setStatus('In progress');composerRef.current?.focus();}}>Continue refining</button><button className="mw-button primary" onClick={()=>{setStatus('Complete');setNotice('Task marked complete. Its conversation and outputs are preserved.');}}><Check size={14}/>Mark complete</button></div></div>}
       {isTaskChat&&task.status==='Complete'&&<div className="review-bar"><div className="review-heading"><strong>Marked as complete</strong></div><div><button className="mw-button" onClick={()=>setStatus('In progress')}>Undo</button></div></div>}
      </div></div>
      <div className="composer-area"><ComposerDrawer key={task.id} state={composer} onEdit={(id,text)=>updateComposer(current=>editComposerTodo(current,id,text,name=>captureBucketStore.add(name)))} onUseTodo={useDrawerTodo} onToggle={()=>updateComposer(current=>({...current,open:!current.open}))} onComplete={id=>updateComposer(current=>toggleComposerTodo(current,id))} onCapture={(key,value)=>updateComposer(current=>({...current,capture:{...current.capture,[key]:value}}))}><form className={`mw-composer ${working?'is-working':''} ${frameDropTarget?'is-frame-drop':''}`} onSubmit={e=>{e.preventDefault();send();}} onDragOver={e=>{if(!hasFrameDrag(e.dataTransfer))return;e.preventDefault();e.dataTransfer.dropEffect='copy';setFrameDropTarget(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFrameDropTarget(false);}} onDrop={e=>{if(!hasFrameDrag(e.dataTransfer))return;e.preventDefault();setFrameDropTarget(false);const frame=readFrameDrag(e.dataTransfer);if(frame)attachFrame(frame);}}>{frameAttachments.map(frame=><FrameContextChip key={frame.id} frame={frame} onRemove={()=>removeFrameContext(frame.id)}/>)}{composer.mode==='todo'&&composer.todoBucket&&<BucketContextChip bucket={composer.todoBucket} onRemove={()=>{updateComposer(current=>({...current,todoBucket:undefined}));composerRef.current?.focus();}}/>}{contextAttachment&&<TodoContextChip text={contextAttachment.text} onRemove={()=>setTodoAttachments(current=>{const next={...current};delete next[task.id];return next;})}/>}{attached.length>0&&<div className="queued-attachments">{attached.map(id=><span key={id}><Paperclip size={13}/>{allAssets.find(a=>a.id===id)?.title}<IconButton label={`Remove ${allAssets.find(a=>a.id===id)?.title}`} onClick={()=>setQueuedFiles(q=>({...q,[task.id]:attached.filter(x=>x!==id)}))}><X size={13}/></IconButton></span>)}</div>}<MentionInput key={task.id} inputRef={composerRef} value={draft} onChange={changeDraft} onSend={send} mits={state.mits} projectMitIds={dialogProject?.mitIds||[]} hasProject={!!dialogProject} enabled={task.kind==='mit'&&composer.mode==='prompt'} placeholder={task.kind==='colleague'?`Message ${task.mit}…`:composer.mode==='todo'?'Add a to-do… Type / and a bucket name to file it under that bucket':'Message…'}/><div className="composer-tools"><div><IconButton label="Attach file" onClick={()=>fileRef.current?.click()}><Paperclip size="var(--composer-attach-icon-size)"/></IconButton><ComposerModelSelect value={composer.model} onChange={model=>updateComposer(current=>({...current,model}))}/><ComposerModeSwitch mode={composer.mode} onChange={mode=>updateComposer(current=>({...current,mode}))}/></div>{working&&composer.mode==='prompt'?<IconButton label="Stop demo run" onClick={stop}><Square size={14} weight="fill"/></IconButton>:<IconButton type="submit" label={composer.mode==='todo'?'Add to to-do drawer':'Send message'} disabled={composer.mode==='todo'?!draft.trim():!draft.trim()&&!attached.length&&!contextAttachment&&!frameAttachments.length}><ArrowUp size={18}/></IconButton>}</div></form></ComposerDrawer></div>
     </section> : <div className="page-scroll">
      {view==='Home'&&<HomePage {...collaborationProps}/>}
      {view==='Projects'&&<ProjectsPage {...collaborationProps}/>}
      {view==='project'&&<section className="project-page" style={projectColor(state.projects,currentProject.id)}><div className="page-title"><div><div className="project-icon"><Folder size={24}/></div><h1>{currentProject.name}</h1><p>{currentProject.description||'Tasks, knowledge and outputs, shared with your team.'}</p></div><button className="mw-button" onClick={()=>navigate('Projects')}><ArrowLeft size={15}/>All projects</button></div><div className="project-context"><span><Avatar name={userName} small/>You · {currentProject.mitIds?.length||0} Mits</span><span><Clock3 size={14}/>Updated today</span></div><div className="mw-tabs">{['Overview','Instructions','Assets','Mits'].map(t=><button className={projectTab===t?'selected':''} key={t} onClick={()=>setProjectTab(t)}>{t}</button>)}</div>
       {projectTab==='Overview'&&<><div className="project-summary"><div><h2>{reviewCount?`${reviewCount} direction ready for your review`:'Your next step starts here'}</h2><p>{reviewCount?'Your team has something to show. Open the task to see what changed and decide what comes next.':'Continue a task or start a new conversation with your team.'}</p><button className="text-action" disabled={!projectTasks.length} onClick={()=>openTask((projectTasks.find(t=>t.status==='Ready for review')??projectTasks[0]).id)}>{reviewCount?'Review the direction':'Continue working'}<ArrowRight size={15}/></button></div><div className="summary-mark"><Workflow size={40}/></div></div><div className="section-heading"><h2>Project dialogs <span>{projectTasks.length}</span></h2><button className="mw-button primary" onClick={()=>startCreate('task')}><Plus size={15}/>New task</button></div><div className="task-table"><div className="task-table-heading"><span>Task</span><span>Status</span><span>Working with</span><span>Updated</span></div>{projectTasks.map(taskRow)}{!projectTasks.length&&<p className="directory-empty">No tasks yet. Create the first task for this project.</p>}</div></>}
       {projectTab==='Instructions'&&<div className="editor-section"><h2>Project instructions</h2><p>Shared guidance for everyone working on this project.</p><textarea aria-label="Project instructions" value={instructionsDraft} onChange={e=>setInstructionsDraft(e.target.value)}/><button className="mw-button primary" onClick={()=>{setState(s=>({...s,projects:s.projects.map(p=>p.id===currentProject.id?{...p,instructions:instructionsDraft}:p)}));setNotice('Project instructions saved locally.');}}>Save instructions</button></div>}
       {projectTab==='Assets'&&<div className="project-asset-collections"><div className="section-heading"><h2>Asset collections</h2><span className="muted">Grouped by task</span></div>{projectTasks.map(t=>{const ids=new Set([...t.input,...t.output,...t.messages.flatMap(m=>[...(m.assetIds||[]),...(m.assetId?[m.assetId]:[])])]);const files=allAssets.filter(a=>ids.has(a.id));return files.length?<details className="project-asset-collection" key={t.id}><summary><Folder size={20}/><span><strong>{t.title}</strong><small>{files.length} assets · {files.filter(a=>t.output.includes(a.id)).length} outputs</small></span><ChevronRight size={16}/></summary><div className="collection-assets">{files.map(a=>assetButton(a))}</div></details>:null;})}{!projectTasks.some(t=>[...t.input,...t.output,...t.messages.flatMap(m=>[...(m.assetIds||[]),...(m.assetId?[m.assetId]:[])])].some(id=>allAssets.some(a=>a.id===id)))&&<p className="directory-empty">Files shared and created in this project’s tasks will appear here as collections.</p>}</div>}
       {projectTab==='Mits'&&<div className="people-list">{state.mits.filter(m=>currentProject.mitIds?.includes(m.id)).map(m=><div key={m.id}><Avatar isMit name={m.name}/><span><strong>{m.name}</strong><small>Mit · AI teammate</small></span><button className="mw-button" onClick={()=>startMitTask(m,currentProject.id)}><MessageSquare size="var(--sidebar-item-icon-size)"/>Start conversation</button></div>)}</div>}
      </section>}
      {view==='Todos'&&<section className="todos-page"><div className="page-title"><div><h1>Todos</h1><p>Your to-dos from annotating projects. Click on a to-do to execute with agent.</p></div><button className="mw-button primary" onClick={()=>startCreate('task')}><Plus size={15}/>New task</button></div><div className="kanban">{statuses.map(status=><section key={status} className={boardTarget===status?'kanban-drop-target':''} aria-label={status} onDragOver={e=>{if(!boardDrag.current)return;e.preventDefault();e.dataTransfer.dropEffect='move';setBoardTarget(status);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setBoardTarget(null);}} onDrop={e=>{e.preventDefault();const id=boardDrag.current;if(id)moveBoardTask(id,status);boardDrag.current=null;setBoardTarget(null);setBoardDragging(null);setTimeout(()=>{boardClickSuppressed.current=false;},0);}}><header><Status status={status}/><span className="kanban-count">{boardTasks.filter(t=>t.status===status).length+annotations.filter(note=>note.todo&&note.status===status).length}</span></header>{boardTasks.filter(t=>t.status===status).map(t=><TodoCard key={t.id} onEdit={()=>openTodoAction({kind:'task',id:t.id},'edit',t.todoPrompt||t.title)} onDelete={()=>openTodoAction({kind:'task',id:t.id},'delete',t.todoPrompt||t.title)}><button className={`kanban-task ${boardDragging===t.id?'is-dragging':''}`} key={t.id} draggable={!pending.includes(t.id)} title="Click to open · Drag to change status · Alt + Left/Right to move" onDragStart={e=>{boardDrag.current=t.id;boardClickSuppressed.current=true;setBoardDragging(t.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',t.id);}} onDragEnd={()=>{boardDrag.current=null;setBoardTarget(null);setBoardDragging(null);setTimeout(()=>{boardClickSuppressed.current=false;},0);}} onKeyDown={e=>{if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const next=statuses[statuses.indexOf(t.status)+(e.key==='ArrowRight'?1:-1)];if(next){moveBoardTask(t.id,next);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-board-task="${t.id}"]`)?.focus());}}}} data-board-task={t.id} onClick={()=>{if(!boardClickSuppressed.current)openTaskTodo(t);}}><TodoCardContent complete={t.status==='Complete'} project={state.projects.find(p=>p.id===t.projectId)?.name || "Personal workspace"} text={t.todoPrompt || t.title} frames={taskFrames(t)}/>{t.status==='Ready for review'&&<footer><Avatar isMit={t.kind==='mit'} name={t.mit} compact/><span>{t.mit}</span></footer>}</button></TodoCard>)}{annotations.filter(note=>note.todo&&note.status===status).map(note=><TodoCard key={note.id} onEdit={()=>openTodoAction({kind:'annotation',id:note.id},'edit',note.text)} onDelete={()=>openTodoAction({kind:'annotation',id:note.id},'delete',note.text)}><button className="kanban-task" onClick={()=>openAnnotationTodo(note)}><TodoCardContent complete={note.status==='Complete'} project={annotationProject(note)} text={note.text} frames={[{id:note.frame.id,label:`Prompt #${note.frame.number} (v${note.frame.version})`}]}/></button></TodoCard>)}{!boardTasks.some(t=>t.status===status)&&!annotations.some(note=>note.todo&&note.status===status)&&<p className="kanban-empty">Nothing here yet.</p>}</section>)}</div></section>}
      {view==='Inbox'&&<section className="inbox-page"><div className="page-title"><div><h1>Inbox</h1><p>Your conversations with Mits.</p></div><button className="mw-button primary" onClick={()=>navigate('Mits')}><Plus size={15}/>New message</button></div><div className="inbox-list">{state.tasks.filter(t=>t.kind==='mit').map(t=><button key={t.id} className="inbox-item" onClick={()=>openTask(t.id)}><Avatar isMit={t.kind==='mit'} name={t.mit}/><span><strong>{t.kind==='colleague'?t.title:t.mit}<small>{t.kind==='mit'?t.title:'Direct message · No linked task'}</small></strong><p>{t.messages.at(-1)?.text.split('\n')[0]||(t.messages.at(-1)?.assetIds?.length?'Shared an attachment':'A new conversation is ready to begin.')}</p></span><span className="inbox-item-end"><time>{t.updated}</time>{t.unread&&<b>Needs your attention</b>}</span><ChevronRight size={15}/></button>)}</div></section>}
      {view==='Mits'&&<MitsPage draft={mitDraft} setDraft={setMitDraft} mits={state.mits} projects={state.projects} selected={mitDetail} onSelect={setMitDetail} onSave={mit=>{setState(s=>saveMit(s,mit));setMitDetail(mit.id);setNotice('Mit settings saved locally. Future demo conversations use this profile.');}} onStart={startMitTask}/>}
      {view==='Library'&&<section><div className="page-title"><div><h1>Library</h1><p>Skills and integrations for your Mits.</p></div></div><div className="mw-tabs">{['Skills','Plugins'].map(t=><button key={t} className={libraryTab===t?'selected':''} onClick={()=>setLibraryTab(t)}>{t}</button>)}</div>{<div className="library-list">{(libraryTab==='Skills'?['Interface exploration','Design review','Accessibility check']:['Figma','GitHub']).map(n=><div key={n}><Layers size={20}/><span><strong>{n}</strong><small>{libraryTab==='Skills'?'Available to your Mits in this demo':'Not connected · Integration setup is outside this prototype'}</small></span><span className="muted">{libraryTab==='Skills'?'Sample skill':'Preview only'}</span></div>)}</div>}</section>}
      {view==='Settings'&&<section className="settings-page"><div className="page-title"><div><h1>Settings</h1><p>Your personal workspace.</p></div></div><div className="setting-row"><span><strong>Appearance</strong><small>Use the MitWerk light or dark palette.</small></span><div className="mw-segmented"><button className={theme==='light'?'selected':''} onClick={()=>setTheme('light')}><Sun size={15}/>Light</button><button className={theme==='dark'?'selected':''} onClick={()=>setTheme('dark')}><Moon size={15}/>Dark</button></div></div><div className="setting-row"><span><strong>Profile</strong><small>{userName} · Designer</small></span><div className="profile-name-fields"><label className="form-label">First name<input value={userProfile.firstName} readOnly/></label><label className="form-label">Last name<input value={userProfile.lastName} readOnly/></label></div><Avatar name={userName}/></div><div className="setting-row"><span><strong>About this prototype</strong><small>Sample conversations and outputs. No live AI, colleague messaging or account connection.</small></span><span className="muted">Frontend demo</span></div></section>}
     </div>}
    </main>
    {openedAsset&&<><div hidden={!chatShown||!versionShown} className="reader-divider" role="separator" aria-label="Resize reading window" aria-orientation="vertical" aria-valuemin={35} aria-valuemax={70} aria-valuenow={readerWidth} tabIndex={0} onPointerDown={e=>{e.preventDefault();drag.current=true;document.body.style.cursor='col-resize';}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setReaderWidth(w=>Math.max(35,Math.min(70,w+(e.key==='ArrowLeft'?3:-3))));}if(e.key==='Home')setReaderWidth(35);if(e.key==='End')setReaderWidth(70);}}/>
     <aside hidden={!versionShown} id={`workspace-pane-${selectedPane==='chat'?'version':selectedPane}`} className="mw-reader" aria-label="Reading window"><div className={`reader-content ${openedAsset.kind==='prototype'?'history-content':''}`}>
       {openedAsset.kind==='prototype'&&<ReadingWorkspace onRuntimeChange={setRuntimeMode} externalPush={frameRequest} initialMode="history" galleryOnly={!ideaOpen} ideaOpen={ideaOpen} onCloseIdeas={()=>setIdeaOpen(false)} expanded={expanded} onToggle={()=>{setSelectedPane('version');setExpanded(value=>!value);}}/>}
       {openedAsset.kind!=='prototype'&&<PanelHeader title={openedAsset.title} icon={panelIcons[openedAsset.kind]} expanded={expanded} onToggle={toggleWorkspaceFullscreen}/>}
       {openedAsset.kind==='image'&&(groupedImages&&showImageAlbum?<section className="reader-image-gallery" aria-label="Image gallery"><header><h2>Images</h2><span>{readerImages.length} images</span></header><div className="reader-image-grid">{readerImages.map(a=><button key={a.id} onClick={()=>{openAsset(a.id);}}><span className="gallery-image-frame"><img src={a.url} alt="" loading="lazy"/></span><span>{a.title}</span></button>)}</div></section>:<div className="image-reader">{groupedImages&&<button className="mw-button image-gallery-back" onClick={()=>setShowImageAlbum(true)}><ArrowLeft size={15}/>All images · {readerImages.length}</button>}<img src={openedAsset.url} alt={openedAsset.title}/><p>{openedAsset.title}</p></div>)}
       {openedAsset.kind==='document'&&<article className="document-reader"><div className="document-icon"><FileText size={24}/></div>{openedAsset.content?.split('\n\n').map((block,i)=>i===0?<h1 key={i}>{block}</h1>:<section key={i}>{block.includes('\n')?<><h2>{block.split('\n')[0]}</h2><p>{block.slice(block.indexOf('\n')+1)}</p></>:<p>{block}</p>}</section>)}</article>}
      </div>
     </aside></>}
    {!chatShown&&!versionShown&&!ideasShown&&!liveShown&&<div className="workspace-panel-empty">Choose a panel from the workspace bar.</div>}
   </div>
  </div>
  <input ref={fileRef} className="visually-hidden" type="file" tabIndex={-1} accept="image/*,.txt,.md,.json,.csv" aria-label="Choose attachment" onChange={e=>{const f=e.target.files?.[0];if(f)void attach(f).catch(()=>setNotice('Could not read this file. Please try another.'));e.target.value='';}}/>
  {notice&&<div role="status" className="mw-toast">{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={14}/></button></div>}
  {modal&&<Modal title={modal==='search'?'Search your workspace':modal==='share'?'Share a file':modal==='project'?'New project':'New task'} onClose={()=>setModal(null)}>{modal==='share'?<><p className="form-hint">Choose a workspace file to send in this conversation.</p><div className="share-file-list">{allAssets.map(a=><button key={a.id} disabled={attached.includes(a.id)} onClick={()=>{setQueuedFiles(q=>({...q,[task.id]:[...(q[task.id]||[]),a.id]}));setModal(null);}}><FileText size={17}/><span><strong>{a.title}</strong><small>{a.detail}</small></span><Plus size={15}/></button>)}</div><button className="mw-button" onClick={()=>{setModal(null);fileRef.current?.click();}}><Paperclip size={15}/>Upload from computer</button></>:modal==='search'?<><div className="search-field"><Search size={18}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks, conversations and assets…" aria-label="Search workspace"/></div><div className="search-results">{results.map(t=><button key={t.id} onClick={()=>{openTask(t.id);setModal(null);}}><MessageSquare size={16}/><span>{t.title}</span><Status status={t.status}/></button>)}{allAssets.filter(a=>a.title.toLowerCase().includes(search.toLowerCase())).map(a=><button key={a.id} onClick={()=>{openAsset(a.id);setModal(null);}}><FileText size={16}/><span>{a.title}</span><small>Asset</small></button>)}{!results.length&&!allAssets.some(a=>a.title.toLowerCase().includes(search.toLowerCase()))&&<p>No matches. Try a task name or “profile”.</p>}</div></>:<form onSubmit={e=>{e.preventDefault();createTask();}}><label className="form-label">{modal==='project'?'Project name':'Task name'}<input autoFocus required maxLength={100} value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder={modal==='project'?'Project name':'What do you want to work on?'}/></label>{modal==='project'&&<><label className="form-label">Description<input value={projectDescription} onChange={e=>setProjectDescription(e.target.value)} placeholder="What will you work on together?"/></label><p className="form-hint">Bring Mits into this project by mentioning them with @ in a task.</p></>}{modal==='task'&&<label className="form-label">Project<select value={taskProjectId} onChange={e=>setTaskProjectId(e.target.value)}>{state.projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>}<div className="modal-actions"><button className="mw-button" type="button" onClick={()=>setModal(null)}>Cancel</button><button className="mw-button primary" disabled={!newTitle.trim()}>{modal==='project'?'Create project':'Create task'}</button></div></form>}</Modal>}
 </div></DrawerTodosContext.Provider>;
}
