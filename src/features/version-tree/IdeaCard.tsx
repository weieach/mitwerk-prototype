import { useMinuteClock } from '../../shared/useMinuteClock';
import { todoTimestamp } from '../workbench/composer-state';
import type { IdeaTodo } from './idea-todos';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import type { CSSProperties, ReactNode } from 'react';
import type { VersionNode } from './model';
import { isFinishedIdeaVersion, withinNodeHoverRadius } from './idea-stream';
import { ideaTheme } from './tokens';
import { MilestoneButton, MilestoneEditor } from './MilestoneControls';
import { BucketTag } from '../workbench/BucketTag';

type Props = { onTodoHeight: (id: string, height: number) => void; onToggleTodo: (id: string) => void; todos: IdeaTodo[]; children: ReactNode; node: VersionNode; milestone: string; open: boolean; currentWip: boolean; color: string; hasDescendants: boolean;
  onSelect: () => void; onSave: (text: string) => void };

export function IdeaCard({ onTodoHeight, onToggleTodo, todos, node, milestone, open, currentWip, color, hasDescendants, onSelect, onSave, children }: Props) {
  const clock = useMinuteClock(todos.length > 0);
  const todoList = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const list = todoList.current;
    if (!list) { onTodoHeight(node.id, 0); return; }
    const observer = new ResizeObserver(([entry]) => {
      // Border-box measurements are independent of the graph's zoom transform.
      onTodoHeight(node.id, Math.ceil(entry.borderBoxSize[0]?.blockSize ?? list.offsetHeight));
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [node.id, todos.length, onTodoHeight]);
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
  const todoContent = todos.length > 0 && <ul ref={todoList} className="idea-todos" aria-label={`To-dos for ${node.label}`}>{todos.map(todo => <li key={todo.id} className={todo.complete ? 'is-complete' : ''}><button type="button" className="idea-todo-toggle" role="checkbox" aria-checked={todo.complete} aria-label={`Complete to-do: ${todo.text}`} onClick={() => onToggleTodo(todo.id)}><PhosphorIcon name={todo.complete ? 'check-square' : 'square'} size="var(--milestone-font-size)"/></button><span className="sr-only">{todo.complete ? 'Complete: ' : 'Incomplete: '}</span><span className="idea-todo-copy"><span className="idea-todo-text">{todo.bucket && <BucketTag bucket={todo.bucket}/>}{todo.text}</span><time dateTime={todo.created}>{todoTimestamp(todo.created, clock)}</time></span></li>)}</ul>;
  const action = editing ? <MilestoneEditor value={milestone} onSave={text => { onSave(text); setEditing(false); }} onCancel={() => setEditing(false)}/>
    : (currentWip || near || focused) && (currentWip || !milestone) && <MilestoneButton buttonRef={add} editing={!!milestone} onClick={edit}/>;
  return <article className={`idea-card ${open ? 'is-open' : ''}`} data-node-id={node.id} style={{ '--route-color': color } as CSSProperties}
    onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <button ref={station} onPointerEnter={() => setNear(true)} className={`station ${todos.length ? 'is-todo' : milestone ? 'is-milestone' : hasDescendants ? 'has-descendants' : 'is-terminal'}`} aria-label={`Select ${node.label}${todos.length ? ` · ${todos.filter(todo => todo.complete).length}/${todos.length} to-dos complete` : ''}`} aria-expanded={open} onClick={onSelect}>{todos.length ? <PhosphorIcon name={todos.every(todo => todo.complete) ? 'check-square' : 'square'} weight="fill" size="var(--idea-todo-station-size)"/> : milestone ? <PhosphorIcon name="trophy" weight="fill" size="var(--station-size)"/> : <span/>}</button>
    {currentWip && <div className="idea-wip-action">{action}</div>}
    {!currentWip && todoContent}
    {milestone && !editing && <button className="idea-milestone" aria-label={`Edit milestone for ${node.label}`} onClick={edit}>{milestone}</button>}
    {!currentWip && action}
    {currentWip && todoContent}
    {currentWip && <div className="version-stats idea-wip-prompts"><span>{node.prompts.length} {node.prompts.length === 1 ? 'prompt' : 'prompts'}</span></div>}
    {open && finished && <div className="idea-command" aria-label={`Command details for ${node.label}`}>{children}</div>}
  </article>;
}
