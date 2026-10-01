import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, CircleCheck } from 'lucide-react';
import { statuses } from './model';
import type { TaskStatus } from './model';

export function TaskStatusPicker({value,disabled,onChange}:{value:TaskStatus;disabled:boolean;onChange:(value:TaskStatus)=>void}) {
 const [open,setOpen]=useState(false);
 const [feedback,setFeedback]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 const id=useId();
 useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
 useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(false),650);return()=>clearTimeout(timer);},[feedback]);
 function close(){setOpen(false);trigger.current?.focus();}
 function badge(status:TaskStatus){return <span className={`mw-status status-${statuses.indexOf(status)}`}>{status==='Complete'?<CircleCheck size={13}/>:<span className="status-dot"/>}{status}</span>;}
 return <div className="status-picker" data-feedback={feedback} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
  <div className="status-picker-row"><span>Status</span><button ref={trigger} type="button" className="status-picker-trigger" aria-label={`Change status: ${value}`} aria-expanded={open} aria-controls={id} disabled={disabled} onClick={()=>setOpen(v=>!v)}>{badge(value)}<ChevronDown size={13} className={open?'is-open':''}/></button></div>
  <div className={`status-picker-reveal ${open?'is-open':''}`} inert={!open} aria-hidden={!open}><div><div id={id} className="status-picker-options" role="group" aria-label="Task status" onKeyDown={e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const buttons=Array.from(e.currentTarget.querySelectorAll('button'));const index=buttons.indexOf(document.activeElement as HTMLButtonElement);e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}}>{statuses.map(status=><button type="button" key={status} disabled={disabled} aria-pressed={value===status} onClick={()=>{if(status!==value){onChange(status);setFeedback(true);}close();}}>{badge(status)}{value===status&&<Check size={13}/>}</button>)}</div></div></div>
 </div>;
}
