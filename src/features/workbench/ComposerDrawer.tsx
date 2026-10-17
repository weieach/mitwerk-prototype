import { EditableTodoText } from './EditableTodoText';
import { CaptureDetailField } from './CaptureDetailField';
import { CaptureBucketChip } from './CaptureBucketChip';
import { composerModels } from './composer-models';
import { SelectMenu, useSelectMenu } from '../../components/SelectMenu';
import { useId, useRef, useState } from 'react';
import { useMinuteClock } from '../../shared/useMinuteClock';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { useReorderAnimation } from '../../shared/useReorderAnimation';
import { orderedComposerTodos, todoTimestamp, type ChatComposerState, type ComposerMode } from './composer-state';

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
    {menu.open && <SelectMenu closing={menu.closing} id={id} label="Model" anchor={menu.trigger} options={options} value={model} minWidth={280} className="composer-model-menu" onChoose={menu.choose} onDismiss={menu.dismiss}/>}
  </>;
}

export function ComposerModeSwitch({ mode, onChange }: { mode: ComposerMode; onChange: (mode: ComposerMode) => void }) {
  const name = useId();
  return <fieldset className="composer-mode-switch"><legend>Composer mode</legend>{(['prompt', 'todo'] as const).map(value =>
    <label key={value}><input type="radio" name={name} value={value} checked={mode === value} onChange={() => onChange(value)}/><span>{value === 'prompt' ? 'Prompt' : 'To-do'}</span></label>
  )}</fieldset>;
}

/** Drag distance that turns a press on the drawer heading into an open (up) or close (down) gesture instead of a click. */
const drawerDragThreshold = 24;
/** How closely the section follows the pointer while dragging (1 = exactly). */
const drawerDragFollow = .55;

/** Inline to-do entry inside the drawer: an optional page chip, then a frameless field. Enter adds the to-do and keeps the page for the next one. */
function TodoComposerRow({ onAdd }: { onAdd: (text: string, page: string) => void }) {
  const [text, setText] = useState('');
  const [page, setPage] = useState('');
  const field = useRef<HTMLInputElement>(null);
  return <li className="composer-todo-new">
    <CaptureBucketChip compact value={page} onChange={value => { setPage(value); requestAnimationFrame(() => field.current?.focus()); }} label="To-do page" emptyLabel="page" icon={null}/>
    <input ref={field} className="composer-todo-input" aria-label="New to-do" placeholder="Add a to-do" value={text} onChange={event => setText(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter' && text.trim()) { event.preventDefault(); onAdd(text.trim(), page); setText(''); } if (event.key === 'Escape') { event.stopPropagation(); setText(''); event.currentTarget.blur(); } }}/>
  </li>;
}

export function ComposerDrawer({ state, onToggle, onComplete, onUseTodo, onEdit, onAdd, onPage, onCapture, children }: {
  onEdit: (id: string, text: string) => void; onAdd: (text: string, page: string) => void; onPage: (id: string, page: string) => void; state: ChatComposerState; onToggle: () => void; onComplete: (id: string) => void; onUseTodo: (id: string) => void;
  onCapture: (key: 'screen' | 'overlay', value: string) => void; children: ReactNode;
}) {
  const id = useId();
  const { listRef, capturePositions } = useReorderAnimation();
  const todos = orderedComposerTodos(state.todos);
  const unfinished = state.todos.filter(todo => !todo.complete).length;
  const countId = `${id}-count`;
  const clock = useMinuteClock();
  // Drag the heading up to open and down to close; a press without movement stays a click.
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragHandlers = {
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { if (event.button !== 0) return; drag.current = { y: event.clientY, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); },
    onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
      const current = drag.current; if (!current) return;
      const dy = event.clientY - current.y;
      if (Math.abs(dy) > 4) current.moved = true;
      if (current.moved) setDragOffset((state.open ? Math.max(0, dy) : Math.min(0, dy)) * drawerDragFollow);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      const current = drag.current; drag.current = null; setDragOffset(0);
      if (!current?.moved) return;
      suppressClick.current = true;
      const dy = event.clientY - current.y;
      if ((dy < -drawerDragThreshold && !state.open) || (dy > drawerDragThreshold && state.open)) onToggle();
    },
    onPointerCancel: () => { drag.current = null; setDragOffset(0); },
  };
  return <div className="chat-composer-stack">
    <div className="capture-settings"><span>Capturing</span><CaptureBucketChip value={state.capture.screen} onChange={value => onCapture('screen', value)}/><span>with</span><CaptureDetailField value={state.capture.overlay} onChange={value => onCapture('overlay', value)}/></div>
    <div className={`composer-drawer ${state.open ? 'is-expanded' : ''}${dragOffset ? ' is-dragging' : ''}`} style={{ '--drawer-drag': `${dragOffset}px` } as React.CSSProperties}>
      <button type="button" className="composer-drawer-heading" aria-expanded={state.open} aria-controls={id} aria-label="To-dos" aria-describedby={countId} title="Click or drag up and down" {...dragHandlers} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onToggle(); }}><span>To-do</span><span className="composer-drawer-count" aria-hidden="true">{unfinished}</span><span className="sr-only" id={countId} aria-live="polite">{unfinished} unfinished to-dos</span></button>
      <div id={id} className="composer-drawer-reveal" inert={!state.open} aria-hidden={!state.open} role="region" aria-label="Chat to-dos"><div className="composer-drawer-clip"><div className="composer-drawer-content">
        <ul ref={listRef}>{todos.map(todo => <li key={todo.id} data-reorder-id={todo.id} className={todo.complete ? 'is-complete' : ''}>
          <input type="checkbox" aria-label={`Complete to-do: ${todo.text}`} checked={todo.complete} onChange={() => { capturePositions(); onComplete(todo.id); }}/>{todo.page && <CaptureBucketChip compact value={todo.page} onChange={page => onPage(todo.id, page)} label="To-do page" emptyLabel="page" icon={null}/>}<EditableTodoText text={todo.text} onSave={text => { capturePositions(); onEdit(todo.id, text); }}/>
          <time dateTime={todo.created}>{todoTimestamp(todo.created, clock)}{todo.version !== undefined && ` (v${todo.version})`}</time><button type="button" className="composer-todo-add" aria-label={`Add to-do to prompt: ${todo.text}`} onClick={() => onUseTodo(todo.id)}><PhosphorIcon name="plus" size={12}/></button>
        </li>)}<TodoComposerRow onAdd={onAdd}/></ul>
      </div></div></div>
      {children}
    </div>
  </div>;
}
