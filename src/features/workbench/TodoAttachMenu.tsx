import { useId, useRef, useState } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import type { TodoChoice } from './todo-context';

export function TodoAttachMenu({ choices, onSelect }: { choices: TodoChoice[]; onSelect: (todo: TodoChoice) => void }) {
 const [open, setOpen] = useState(false);
 const trigger = useRef<HTMLButtonElement>(null);
 const menu = useRef<HTMLDivElement>(null);
 const id = useId();
 function close() { setOpen(false); trigger.current?.focus(); }
 return <div className="todo-attach-menu" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
 }}>
  <button ref={trigger} type="button" className="text-action" aria-expanded={open} aria-haspopup="menu" aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)} onKeyDown={event => {
   if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); requestAnimationFrame(() => menu.current?.querySelector<HTMLButtonElement>('button')?.focus()); }
  }}><PhosphorIcon name="list-checks" size="var(--composer-attach-icon-size)"/>Attach to-do</button>
  {open && <div ref={menu} id={id} role="menu" aria-label="Unfinished to-dos, newest first" className="todo-attach-options" onKeyDown={event => {
   if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
   event.preventDefault(); const items = [...event.currentTarget.querySelectorAll('button')];
   const current = items.indexOf(document.activeElement as HTMLButtonElement);
   items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
  }}>{choices.length ? choices.map(todo => <button type="button" role="menuitem" key={todo.id} onClick={() => { setOpen(false); onSelect(todo); }}><PhosphorIcon name="list-checks" size="var(--composer-attach-icon-size)"/><span>{todo.text}</span></button>) : <p>No unfinished to-dos.</p>}</div>}
 </div>;
}
