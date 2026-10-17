import type { CSSProperties, ReactNode } from 'react';
import { PhosphorIcon } from '../components/PhosphorIcon';

export const bucketHues = ['sand', 'sage', 'sky', 'lilac', 'rose', 'steel'] as const;
export type BucketHue = typeof bucketHues[number];

/** Stable hue per bucket name, so a user-created bucket keeps its color across sessions. */
export function bucketHue(name: string): BucketHue {
  let hash = 0;
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return bucketHues[hash % bucketHues.length];
}

/** Uppercase mono metadata row, items separated by a dot. */
export function MetaLabel({ items, className = '' }: { items: ReactNode[]; className?: string }) {
  return <span className={`ds-meta-label ${className}`}>{items.map((item, index) => <span key={index}>{item}</span>)}</span>;
}

export type Todo = { id: string; text: string; done: boolean; bucket?: string; owner?: string };

export function TodoItem({ todo, index, onToggle }: { todo: Todo; index: number; onToggle: (id: string) => void }) {
  return <li className={`ds-todo${todo.done ? ' is-done' : ''}`}>
    <label className="ds-todo-main">
      <input type="checkbox" className="ds-todo-check" checked={todo.done} onChange={() => onToggle(todo.id)}/>
      <span className="ds-todo-index">{String(index + 1).padStart(2, '0')}</span>
      <span className="ds-todo-text">{todo.text}</span>
    </label>
    <span className="ds-todo-meta">
      {todo.bucket && <BucketChip name={todo.bucket} size="sm"/>}
      {todo.owner && <span className="ds-todo-owner">{todo.owner}</span>}
    </span>
  </li>;
}

export function TodoList({ todos, onToggle, title }: { todos: Todo[]; onToggle: (id: string) => void; title?: string }) {
  const done = todos.filter(todo => todo.done).length;
  return <section className="ds-todo-list">
    {title && <header className="ds-todo-list-head"><MetaLabel items={[title]}/><span className="ds-todo-list-count">{done}/{todos.length}</span></header>}
    <ul>{todos.map((todo, index) => <TodoItem key={todo.id} todo={todo} index={index} onToggle={onToggle}/>)}</ul>
  </section>;
}

export function BucketChip({ name, active = false, count, size = 'md', editable = false, onClick }: {
  name: string; active?: boolean; count?: number; size?: 'sm' | 'md'; editable?: boolean; onClick?: () => void;
}) {
  const content = <>
    <i className="ds-bucket-dot" aria-hidden="true"/>
    <span className="ds-bucket-name">{name}</span>
    {count !== undefined && <span className="ds-bucket-count">{count}</span>}
    {editable && <PhosphorIcon name="pencil-simple" size={10}/>}
  </>;
  const className = `ds-bucket is-${size}${active ? ' is-active' : ''}`;
  const style = { '--bucket-hue': `var(--p-hue-${bucketHue(name)})` } as CSSProperties;
  return onClick
    ? <button type="button" className={className} style={style} aria-pressed={active} onClick={onClick}>{content}</button>
    : <span className={className} style={style}>{content}</span>;
}

/** Sentence-form capture line: "Capturing [bucket] with [detail]". */
export function CaptureLine({ bucket, detail }: { bucket: string; detail: string }) {
  return <p className="ds-capture-line">Capturing <BucketChip name={bucket} editable/> with <BucketChip name={detail} editable/></p>;
}

export type ComposerMode = 'prompt' | 'todo' | 'milestone';

export function ComposerTabs({ value, onChange }: { value: ComposerMode; onChange: (mode: ComposerMode) => void }) {
  const tabs: [ComposerMode, string][] = [['prompt', 'Prompt'], ['todo', 'To-do'], ['milestone', 'Milestone']];
  return <div className="ds-tabs" role="tablist" aria-label="Composer mode">
    {tabs.map(([mode, label]) => <button key={mode} type="button" role="tab" aria-selected={value === mode} className={`ds-tab is-${mode}`} onClick={() => onChange(mode)}>{label}</button>)}
  </div>;
}
