import type { FrameContext } from './frame-context';
import { useId, useState, type ReactNode } from 'react';
import { ListTodo, PhosphorIcon, Plus, X } from '../../components/PhosphorIcon';
import { TaskStatusPicker } from './TaskStatusPicker';
import { isTodoChat } from './model';
import type { Asset, Task, TaskStatus } from './model';

/** Context panels share an enclosed title row and content surface. */
function ContextCard({title, children, actions, expanded, onToggle}: {title:string; children:ReactNode; actions?:ReactNode; expanded?:boolean;onToggle?:()=>void}) {
 const contentId=useId();
 return <section className="conversation-context-card" aria-label={title} data-expanded={expanded} onClick={onToggle?event=>{if(!(event.target as Element).closest('button, input, select, textarea, a'))onToggle();}:undefined}>
  <header><h2>{onToggle?<button type="button" className="context-expand" aria-expanded={expanded} aria-controls={contentId} onClick={onToggle}>{title}</button>:title}</h2>{actions}</header>
  <div className="context-card-body" id={contentId}>{children}</div>
 </section>;
}
export function ConversationCards({task, details, assets, working, onStatus, onAttachFile, renderAsset}: {
 task:Task; details:{title:string;status:TaskStatus}; assets:Asset[]; working:boolean; onStatus:(status:TaskStatus)=>void;
 onAttachFile:()=>void; renderAsset:(asset:Asset)=>ReactNode;
}) {
 const [expandedTitle,setExpandedTitle]=useState<string|null>(null);
 const expanded=expandedTitle===`${task.id}:${details.title}`;
 return <aside className="conversation-cards" aria-label="Conversation context">
  {isTodoChat(task)&&<ContextCard title="Task details" expanded={expanded} onToggle={()=>setExpandedTitle(expanded?null:`${task.id}:${details.title}`)}><div className="task-card-fields">
   <div className="task-card-summary"><p className="task-card-name">{details.title}</p></div>
   <TaskStatusPicker key={task.id} value={details.status} disabled={working} onChange={onStatus}/>
  </div></ContextCard>}
  {(['input','output'] as const).map(group=>{
   const files=task[group].map(id=>assets.find(asset=>asset.id===id)).filter((asset):asset is Asset=>!!asset);
   if(group==='output'&&!files.length)return null;
   return <ContextCard key={group} title={group==='input'?'Input':'Output'} actions={<><span>{files.length}</span>{group==='input'&&<button type="button" className="mw-icon context-add-file" aria-label="Attach input file" title="Attach input file" onClick={onAttachFile}><Plus size="var(--context-action-icon-size)"/></button>}</>}>
    {files.length>0&&<div className="context-file-list">{files.map(renderAsset)}</div>}
   </ContextCard>;
  })}
 </aside>;
}
export function TodoContextChip({text,onRemove}:{text:string;onRemove:()=>void}) {
 return <div className="composer-context"><div className="todo-context-chip" title={`To-do: ${text}`}>
  <ListTodo size={15}/><span>To-do: {text}</span>
  <button type="button" className="mw-icon" aria-label="Remove to-do context" onClick={onRemove}><X size={13}/></button>
 </div></div>;
}

export function BucketContextChip({bucket,onRemove}:{bucket:string;onRemove:()=>void}) {
 return <div className="composer-context"><div className="todo-context-chip bucket-context-chip" title={`Capture location: ${bucket}`}>
  <PhosphorIcon name="folder" size={13}/><span>{bucket}</span>
  <button type="button" className="mw-icon" aria-label={`Remove capture location ${bucket}`} onClick={onRemove}><X size={13}/></button>
 </div></div>;
}

export function FrameContextChip({frame,onRemove}:{frame:FrameContext;onRemove?:()=>void}) {
 return <div className="composer-context"><div className="todo-context-chip frame-context-chip" title={`Frame: ${frame.label}`}>
  <img src={frame.url} alt=""/><span>Frame: {frame.label}</span>
  {onRemove&&<button type="button" className="mw-icon" aria-label={`Remove frame ${frame.label}`} onClick={onRemove}><X size={13}/></button>}
 </div></div>;
}
