import { CaptureDetailField } from './CaptureDetailField';
import { EditableTodoText } from './EditableTodoText';
import { CaptureBucketChip } from './CaptureBucketChip';
import { BucketTag } from './BucketTag';
import { composerModels } from './composer-models';
import { SelectMenu, useSelectMenu } from '../../components/SelectMenu';
import { useId } from 'react';
import { useMinuteClock } from '../../shared/useMinuteClock';
import type { ReactNode } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { useReorderAnimation } from '../../shared/useReorderAnimation';
import { orderedComposerTodos, todoEditText, todoTimestamp, type ChatComposerState, type ComposerMode } from './composer-state';

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

export function ComposerModeSwitch({ mode, onChange }: { mode: ComposerMode; onChange: (mode: ComposerMode) => void }) {
  const name = useId();
  return <fieldset className="composer-mode-switch"><legend>Composer mode</legend>{(['prompt', 'todo'] as const).map(value =>
    <label key={value}><input type="radio" name={name} value={value} checked={mode === value} onChange={() => onChange(value)}/><span>{value === 'prompt' ? 'Prompt' : 'To-do'}</span></label>
  )}</fieldset>;
}

export function ComposerDrawer({ state, onToggle, onComplete, onUseTodo, onEdit, onCapture, children }: {
  onEdit: (id: string, text: string) => void; state: ChatComposerState; onToggle: () => void; onComplete: (id: string) => void; onUseTodo: (id: string) => void;
  onCapture: (key: 'screen' | 'overlay', value: string) => void; children: ReactNode;
}) {
  const id = useId();
  const { listRef, capturePositions } = useReorderAnimation();
  const todos = orderedComposerTodos(state.todos);
  const unfinished = state.todos.filter(todo => !todo.complete).length;
  const countId = `${id}-count`;
  const clock = useMinuteClock();
  return <div className="chat-composer-stack">
    <div className="capture-settings"><span>Capturing</span><CaptureBucketChip value={state.capture.screen} onChange={value => onCapture('screen', value)}/><span>with</span><CaptureDetailField value={state.capture.overlay} onChange={value => onCapture('overlay', value)}/></div>
    <div className={`composer-drawer ${state.open ? 'is-expanded' : ''}`}>
      <button type="button" className="composer-drawer-heading" aria-expanded={state.open} aria-controls={id} aria-label="To-do drawer" aria-describedby={countId} onClick={onToggle}><span>To-do drawer</span>{unfinished > 0 && <span className="composer-drawer-count" aria-hidden="true">{unfinished}</span>}<span className="sr-only" id={countId} aria-live="polite">{unfinished} unfinished to-dos</span></button>
      <div id={id} className="composer-drawer-reveal" inert={!state.open} aria-hidden={!state.open} role="region" aria-label="Chat to-dos"><div className="composer-drawer-clip"><div className="composer-drawer-content">
        {state.todos.length ? <ul ref={listRef}>{todos.map(todo => <li key={todo.id} data-reorder-id={todo.id} className={todo.complete ? 'is-complete' : ''}>
          <input type="checkbox" aria-label={`Complete to-do: ${todo.text}`} checked={todo.complete} onChange={() => { capturePositions(); onComplete(todo.id); }}/><EditableTodoText text={todo.text} editText={todoEditText(todo)} suffix={todo.version !== undefined ? ` (v${todo.version})` : undefined} prefix={todo.bucket && <BucketTag bucket={todo.bucket}/>} onSave={text => { capturePositions(); onEdit(todo.id, text); }}/>
          <time dateTime={todo.created}>{todoTimestamp(todo.created, clock)}</time><button type="button" className="composer-todo-add" aria-label={`Add to-do to prompt: ${todo.text}`} onClick={() => onUseTodo(todo.id)}><PhosphorIcon name="plus" size={12}/></button>
        </li>)}</ul> : <p className="composer-drawer-empty">Switch to To-do and send a message to save it here.</p>}
      </div></div></div>
      {children}
    </div>
  </div>;
}
