import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal, SquarePen, PhosphorIcon } from '../../components/PhosphorIcon';

/** Keep the card's navigation button separate from its top-layer action menu. */
export function TodoCard({ children, onEdit, onDelete }: { children: ReactNode; onEdit: () => void; onDelete: () => void }) {
 const [open, setOpen] = useState(false);
 const [position, setPosition] = useState({ left: 0, top: 0 });
 const trigger = useRef<HTMLButtonElement>(null);
 const menu = useRef<HTMLDivElement>(null);
 const id = useId();
 useLayoutEffect(() => {
  if (!open) return;
  function place() {
   if (!trigger.current || !menu.current) return;
   const anchor = trigger.current.getBoundingClientRect();
   const rect = menu.current.getBoundingClientRect();
   const gap = 4;
   setPosition({ left: Math.max(gap, Math.min(anchor.right - rect.width, innerWidth - rect.width - gap)), top: Math.max(gap, anchor.bottom + rect.height + gap <= innerHeight ? anchor.bottom + gap : anchor.top - rect.height - gap) });
  }
  place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
  return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
 }, [open]);
 function close() { menu.current?.hidePopover(); trigger.current?.focus(); }
 return <div className="todo-card" data-menu-open={open}>
  {children}
  <button ref={trigger} type="button" className="todo-card-more" aria-label="To-do actions" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => { menu.current?.togglePopover(); menu.current?.querySelector('button')?.focus(); }} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); menu.current?.showPopover(); menu.current?.querySelector('button')?.focus(); } }}><MoreHorizontal size={18}/></button>
  <div ref={menu} id={id} popover="auto" role="menu" aria-label="To-do actions" className="todo-card-menu" style={position} onToggle={e => setOpen(e.newState === 'open')} onKeyDown={e => {
   if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
   if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
   e.preventDefault(); const buttons = Array.from(e.currentTarget.querySelectorAll('button')); const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
   buttons[e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (current + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  }}>
   <button type="button" role="menuitem" onClick={() => { close(); onEdit(); }}><SquarePen size={14}/>Edit</button>
   <button type="button" role="menuitem" className="todo-delete" onClick={() => { close(); onDelete(); }}><PhosphorIcon name="trash" size={14}/>Delete</button>
  </div>
 </div>;
}
