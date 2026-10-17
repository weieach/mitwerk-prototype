import type { IdeaTodo } from './idea-todos';
import { useEffect, useRef, useState } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import type { CSSProperties, ReactNode } from 'react';
import type { VersionNode } from './model';
import { isFinishedIdeaVersion, withinNodeHoverRadius } from './idea-stream';
import { ideaTheme } from './tokens';
import { MilestoneButton, MilestoneEditor } from './MilestoneControls';

type Props = { onToggleTodo: (id: string) => void; todos: IdeaTodo[]; children: ReactNode; node: VersionNode; milestone: string; open: boolean; currentWip: boolean; color: string; hasDescendants: boolean;
  onSelect: () => void; onSave: (text: string) => void };

export function IdeaCard({ onToggleTodo, todos, node, milestone, open, currentWip, color, hasDescendants, onSelect, onSave, children }: Props) {
  const finished = isFinishedIdeaVersion(node);
  const [editing, setEditing] = useState(false);
  const station = useRef<HTMLButtonElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  const [near, setNear] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!near) return;
    function track(event: PointerEvent) {
      const rect = station.current?.getBoundingClientRect();
      if (!rect) return;
      // Keep the action itself usable, including at large graph zoom levels.
      if (add.current?.contains(event.target as Node)) return;
      setNear(withinNodeHoverRadius(event.clientX, event.clientY, rect.left + rect.width / 2, rect.top + rect.height / 2, window.innerWidth, ideaTheme.hoverRadiusViewport));
    }
    function leave() { setNear(false); }
    window.addEventListener('pointermove', track);
    window.addEventListener('blur', leave);
    document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', track); window.removeEventListener('blur', leave); document.removeEventListener('pointerleave', leave); };
  }, [near]);
  function edit() { setEditing(true); }
  return <article className={`idea-card ${open ? 'is-open' : ''}`} data-node-id={node.id} style={{ '--route-color': color } as CSSProperties}
    onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <button ref={station} onPointerEnter={() => setNear(true)} className={`station ${todos.length ? 'is-todo' : milestone ? 'is-milestone' : hasDescendants ? 'has-descendants' : 'is-terminal'}`} aria-label={`Select ${node.label}${todos.length ? ` · ${todos.filter(todo => todo.complete).length}/${todos.length} to-dos complete` : ''}`} aria-expanded={open} onClick={onSelect}>{todos.length ? <PhosphorIcon name={todos.every(todo => todo.complete) ? 'check-square' : 'square'} size="var(--milestone-size)"/> : milestone ? <PhosphorIcon name="trophy" weight="fill" size="var(--station-size)"/> : <span/>}</button>
    {todos.length > 0 && <ul className="idea-todos" aria-label={`To-dos for ${node.label}`}>{todos.map(todo => <li key={todo.id} className={todo.complete ? 'is-complete' : ''}><button type="button" className="idea-todo-toggle" role="checkbox" aria-checked={todo.complete} aria-label={`Complete to-do: ${todo.text}`} onClick={() => onToggleTodo(todo.id)}><PhosphorIcon name={todo.complete ? 'check-square' : 'square'} size="var(--milestone-font-size)"/></button><span className="sr-only">{todo.complete ? 'Complete: ' : 'Incomplete: '}</span><span className="idea-todo-text">{todo.text}</span></li>)}</ul>}
    {milestone && !editing && <button className="idea-milestone" aria-label={`Edit milestone for ${node.label}`} onClick={edit}>{milestone}</button>}
    {editing ? <MilestoneEditor value={milestone} onSave={text => { onSave(text); setEditing(false); }} onCancel={() => setEditing(false)}/>
      : (currentWip || near || focused) && !milestone && <MilestoneButton buttonRef={add} onClick={edit}/>}
    {currentWip && <div className="version-stats idea-wip-prompts"><span>{node.prompts.length} {node.prompts.length === 1 ? 'prompt' : 'prompts'}</span></div>}
    {open && finished && <div className="idea-command" aria-label={`Command details for ${node.label}`}>{children}</div>}
  </article>;
}
