import { CaptureDetailField } from './CaptureDetailField';
import { EditableTodoText } from './EditableTodoText';
import { CaptureBucketChip } from './CaptureBucketChip';
import { BucketTag } from './BucketTag';
import { composerModels } from './composer-models';
import { SelectMenu, useSelectMenu } from '../../components/SelectMenu';
import { useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { captureBucketStore } from '../../shared/capture-buckets';
import { useMinuteClock } from '../../shared/useMinuteClock';
import type { ReactNode } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { useReorderAnimation } from '../../shared/useReorderAnimation';
import { extractBucketToken, orderedComposerTodos, todoEditText, todoTimestamp, type ChatComposerState } from './composer-state';

/** The configured prototype model, using the same accessible selector as the reader. */
export function ComposerModelSelect({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const id = useId();
  const options = composerModels.map(({value, label}) => ({value, label}));
  const model = options.find(option => option.value === value)?.value ?? options[0].value;
  const menu = useSelectMenu<HTMLButtonElement>(onChange);
  return <>
    <button type="button" {...menu.triggerProps} className="composer-model" aria-label="Model" aria-controls={menu.open ? id : undefined}>
      {options.find(option => option.value === model)?.label}<PhosphorIcon name="caret-down" size={10}/>
    </button>
    {menu.open && <SelectMenu id={id} label="Model" anchor={menu.trigger} options={options} value={model} minWidth={280} className="composer-model-menu" onChoose={menu.choose} onDismiss={menu.dismiss}/>}
  </>;
}

function TodoComposerRow({ onAdd }: { onAdd: (text: string, bucket: string) => void }) {
  const [text, setText] = useState('');
  const [bucket, setBucket] = useState('');
  const field = useRef<HTMLInputElement>(null);
  return <li className="composer-todo-new">
    <input type="checkbox" className="composer-todo-placeholder" disabled aria-hidden="true" tabIndex={-1}/>
    <>{bucket && <BucketTag bucket={bucket} onRemove={() => { setBucket(''); field.current?.focus(); }}/>}</>
    <input ref={field} className="composer-todo-input" aria-label="New to-do" placeholder="Add a to-do — type /location to choose where it belongs" value={text}
      onChange={event => {
        const token = extractBucketToken(event.target.value);
        if (token) { setBucket(captureBucketStore.add(token.bucket) ?? ''); setText(token.text); }
        else setText(event.target.value);
      }} onKeyDown={event => {
        if (event.key === 'Enter' && text.trim()) { event.preventDefault(); onAdd(text.trim(), bucket); setText(''); setBucket(''); }
        if (event.key === 'Escape') { event.stopPropagation(); setText(''); event.currentTarget.blur(); }
      }}/>
  </li>;
}

export function ComposerDrawer({ state, message, onToggle, onComplete, onUseTodo, onEdit, onAdd, onCapture, children }: {
  message: string;
  onAdd: (text: string, bucket: string) => void;
  onEdit: (id: string, text: string) => void; state: ChatComposerState; onToggle: () => void; onComplete: (id: string) => void; onUseTodo: (id: string) => void;
  onCapture: (key: 'screen' | 'overlay', value: string) => void; children: ReactNode;
}) {
  const id = useId();
  const { listRef, capturePositions } = useReorderAnimation();
  const todos = orderedComposerTodos(state.todos);
  const unfinished = state.todos.filter(todo => !todo.complete).length;
  const countId = `${id}-count`;
  const clock = useMinuteClock();
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragHandlers = {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => { if (event.button !== 0) return; suppressClick.current = false; drag.current = { y: event.clientY, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = drag.current; if (!current) return;
      const dy = event.clientY - current.y;
      if (Math.abs(dy) > 4) current.moved = true;
      if (current.moved) setDragOffset((state.open ? Math.max(0, dy) : Math.min(0, dy)) * .55);
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      const current = drag.current; drag.current = null; setDragOffset(0);
      if (!current?.moved) return;
      suppressClick.current = true;
      const dy = event.clientY - current.y;
      if ((dy < -24 && !state.open) || (dy > 24 && state.open)) onToggle();
    },
    onPointerCancel: () => { drag.current = null; setDragOffset(0); },
  };
  return <div className="chat-composer-stack">
    <div className="capture-settings"><span>Capturing</span><CaptureBucketChip value={state.capture.screen} onChange={value => onCapture('screen', value)}/><span>with</span><CaptureDetailField message={message} value={state.capture.overlay} onChange={value => onCapture('overlay', value)}/></div>
    <div className={`composer-drawer ${state.open ? 'is-expanded' : ''}${dragOffset ? ' is-dragging' : ''}`} style={{ '--drawer-drag': `${dragOffset}px` } as CSSProperties}>
      <button type="button" className="composer-drawer-heading" aria-expanded={state.open} aria-controls={id} aria-label="To-do drawer" aria-describedby={countId} title="Click or drag up and down" {...dragHandlers} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onToggle(); }}><span>To-do</span>{unfinished > 0 && <span className="composer-drawer-count" aria-hidden="true">{unfinished}</span>}<span className="sr-only" id={countId} aria-live="polite">{unfinished} unfinished to-dos</span></button>
      <div id={id} className="composer-drawer-reveal" inert={!state.open} aria-hidden={!state.open} role="region" aria-label="Chat to-dos"><div className="composer-drawer-clip"><div className="composer-drawer-content">
        <ul ref={listRef}>{todos.map(todo => <li key={todo.id} data-reorder-id={todo.id} className={todo.complete ? 'is-complete' : ''}>
          <input type="checkbox" aria-label={`Complete to-do: ${todo.text}`} checked={todo.complete} onChange={() => { capturePositions(); onComplete(todo.id); }}/><EditableTodoText text={todo.text} editText={todoEditText(todo)} suffix={todo.version !== undefined ? <span className="composer-todo-version">{` (v${todo.version})`}</span> : undefined} prefix={todo.bucket && <BucketTag bucket={todo.bucket}/>} onSave={text => { capturePositions(); onEdit(todo.id, text); }}/>
          <span className="composer-todo-meta"><time dateTime={todo.created}>{todoTimestamp(todo.created, clock)}</time><button type="button" className="composer-todo-add" aria-label={`Add to-do to prompt: ${todo.text}`} onClick={() => onUseTodo(todo.id)}><PhosphorIcon name="play" weight="fill" size="var(--drawer-run-icon-size)"/></button></span>
        </li>)}<TodoComposerRow onAdd={onAdd}/></ul>
      </div></div></div>
      {children}
    </div>
  </div>;
}
