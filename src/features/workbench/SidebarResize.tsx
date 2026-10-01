import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

const sizing = { min:180, max:420, step:20, contentMin:420, mobileBreakpoint:850, mobileInset:44 };
const storageKey='mitwerk-sidebar-width';
export function useSidebarWidth() {
 const [width,setWidth]=useState<number|undefined>(()=>{
  try { const value=Number(localStorage.getItem(storageKey)); return value>=sizing.min&&value<=sizing.max?value:undefined; } catch { return undefined; }
 });
 function update(value:number) {
  const available=window.innerWidth-(window.innerWidth<=sizing.mobileBreakpoint?sizing.mobileInset:sizing.contentMin);
  const next=Math.max(sizing.min,Math.min(sizing.max,available,value));
  setWidth(next);try{localStorage.setItem(storageKey,String(next));}catch{ /* Keep session resizing available. */ }
 }
 return {width,update,style:width?{'--mw-sidebar-width':`${width}px`} as CSSProperties:undefined};
}
export function SidebarResize({onResize}:{onResize:(width:number)=>void}) {
 const [resizing,setResizing]=useState(false);
 const start=useRef({x:0,width:0});
 const [actualWidth,setActualWidth]=useState(sizing.min);
 useEffect(()=>{
  const sidebar=document.getElementById('main-navigation');if(!sidebar)return;
  const observer=new ResizeObserver(()=>setActualWidth(Math.round(sidebar.getBoundingClientRect().width)));
  observer.observe(sidebar);return()=>observer.disconnect();
 },[]);
 function width(){return document.getElementById('main-navigation')?.getBoundingClientRect().width||sizing.min;}
 return <div className="sidebar-resizer" role="separator" aria-label="Resize sidebar" aria-controls="main-navigation" aria-orientation="vertical" aria-valuemin={sizing.min} aria-valuemax={sizing.max} aria-valuenow={actualWidth} tabIndex={0} data-resizing={resizing}
  onFocus={event=>event.currentTarget.setAttribute('aria-valuenow',String(Math.round(width())))}
  onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();start.current={x:event.clientX,width:width()};event.currentTarget.setPointerCapture(event.pointerId);setResizing(true);}}
  onPointerMove={event=>{if(!resizing)return;onResize(start.current.width+event.clientX-start.current.x);event.currentTarget.setAttribute('aria-valuenow',String(Math.round(width())));}}
  onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);setResizing(false);}}
  onLostPointerCapture={()=>setResizing(false)} onPointerCancel={()=>setResizing(false)}
  onKeyDown={event=>{const next=event.key==='Home'?sizing.min:event.key==='End'?sizing.max:event.key==='ArrowLeft'?width()-sizing.step:event.key==='ArrowRight'?width()+sizing.step:undefined;if(next===undefined)return;event.preventDefault();onResize(next);event.currentTarget.setAttribute('aria-valuenow',String(Math.round(next)));}}/>;
}
