import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, CircleCheck } from '../../components/PhosphorIcon';
import { statuses } from './model';
import type { TaskStatus } from './model';

export function TaskStatusPicker({value,disabled,onChange}:{value:TaskStatus;disabled:boolean;onChange:(value:TaskStatus)=>void}) {
 const [open,setOpen]=useState(false);
 const [feedback,setFeedback]=useState(false);
 const [position,setPosition]=useState({left:0,top:0});
 const trigger=useRef<HTMLButtonElement>(null);
 const menu=useRef<HTMLDivElement>(null);
 const id=useId();
 useEffect(()=>{if(disabled)menu.current?.hidePopover();},[disabled]);
 useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(false),650);return()=>clearTimeout(timer);},[feedback]);
 // The native top layer escapes the context card's clipping and never grows it.
 useLayoutEffect(()=>{
  if(!open)return;
  function place(){
   if(!trigger.current||!menu.current)return;
   const anchor=trigger.current.getBoundingClientRect();
   const rect=menu.current.getBoundingClientRect();
   const gap=parseFloat(getComputedStyle(menu.current).getPropertyValue('--status-menu-gap'))||4;
   const below=anchor.bottom+gap;
   setPosition({left:Math.max(gap,Math.min(anchor.right-rect.width,innerWidth-rect.width-gap)),top:Math.max(gap,below+rect.height<=innerHeight-gap?below:anchor.top-rect.height-gap)});
  }
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  const observer=new ResizeObserver(place);if(trigger.current)observer.observe(trigger.current);
  return()=>{observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open]);
 function close(){menu.current?.hidePopover();trigger.current?.focus();}
 function badge(status:TaskStatus){return <span className={`mw-status status-${statuses.indexOf(status)}`}>{status==='Complete'?<CircleCheck size={13}/>:<span className="status-dot"/>}{status}</span>;}
 return <div className="status-picker" data-feedback={feedback}>
  <div className="status-picker-row"><span>Status</span><button ref={trigger} type="button" className="status-picker-trigger" aria-label={`Change status: ${value}`} aria-haspopup="menu" aria-expanded={open} aria-controls={id} disabled={disabled} onClick={()=>menu.current?.togglePopover()} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();menu.current?.showPopover();menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();}}}>{badge(value)}<ChevronDown size={13} className={open?'is-open':''}/></button></div>
  <div ref={menu} id={id} popover="auto" className="status-picker-options status-picker-overlay" role="menu" aria-label="Task status" style={position} onToggle={event=>setOpen(event.newState==='open')} onKeyDown={e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
   if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
   const buttons=Array.from(e.currentTarget.querySelectorAll('button'));const index=buttons.indexOf(document.activeElement as HTMLButtonElement);e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
  }}>{statuses.map(status=><button type="button" role="menuitemradio" key={status} disabled={disabled} aria-checked={value===status} onClick={()=>{if(status!==value){onChange(status);setFeedback(true);}close();}}>{badge(status)}{value===status&&<Check size={13}/>}</button>)}</div>
 </div>;
}
