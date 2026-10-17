import { SelectMenu, useSelectMenu } from '../../components/SelectMenu';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { todoTimestamp, type ChatComposerState, type ComposerMode } from './composer-state';

/** The configured prototype model, using the same accessible selector as the reader. */
export function ComposerModelSelect() {
  const id = useId();
  const options = [{value:'astra-6', label:'GPT Astra-6'}];
  const [model, setModel] = useState(options[0].value);
  const menu = useSelectMenu<HTMLButtonElement>(setModel);
  return <>
    <button type="button" {...menu.triggerProps} className="composer-model" aria-label="Model" aria-controls={menu.open ? id : undefined}>
      {options.find(option => option.value === model)?.label}<PhosphorIcon name="caret-down" size={10}/>
    </button>
    {menu.open && <SelectMenu id={id} label="Model" anchor={menu.trigger} options={options} value={model} minWidth={160} onChoose={menu.choose} onDismiss={menu.dismiss}/>}
  </>;
}

export function ComposerModeSwitch({ mode, onChange }: { mode: ComposerMode; onChange: (mode: ComposerMode) => void }) {
  const name = useId();
  return <fieldset className="composer-mode-switch"><legend>Composer mode</legend>{(['prompt', 'todo'] as const).map(value =>
    <label key={value}><input type="radio" name={name} value={value} checked={mode === value} onChange={() => onChange(value)}/><span>{value === 'prompt' ? 'Prompt' : 'To-do'}</span></label>
  )}</fieldset>;
}

export function ComposerDrawer({ state, onToggle, onComplete, onUseTodo, onCapture, children }: {
  state: ChatComposerState; onToggle: () => void; onComplete: (id: string) => void; onUseTodo: (id: string) => void;
  onCapture: (key: 'screen' | 'overlay', value: string) => void; children: ReactNode;
}) {
  const id = useId();
  const [editing, setEditing] = useState<'screen' | 'overlay' | null>(null);
  const [value, setValue] = useState('');
  const captureChip = (key: 'screen' | 'overlay') => editing === key
    ? <input className="capture-setting-input" autoFocus aria-label={key === 'screen' ? 'Capture screen name' : 'Capture overlay name'} value={value}
      onChange={event => setValue(event.target.value)} onBlur={() => { if(value.trim()) onCapture(key, value.trim()); setEditing(null); }}
      onKeyDown={event => { if(event.key === 'Enter') { event.preventDefault(); if(value.trim()) onCapture(key, value.trim()); setEditing(null); } if(event.key === 'Escape') { event.stopPropagation(); setEditing(null); } }}/>
    : <button type="button" className="capture-setting-chip" aria-label={`Edit capture ${key}`} onClick={() => { setValue(state.capture[key]); setEditing(key); }}>
      {key === 'screen' && <PhosphorIcon name="folder" size={10}/>}<span>{state.capture[key]}</span><PhosphorIcon name="pencil-simple" weight="fill" size={10}/>
    </button>;
  return <div className="chat-composer-stack">
    <div className="capture-settings"><span>Capturing</span>{captureChip('screen')}<span>with</span>{captureChip('overlay')}</div>
    <div className="composer-drawer">
      <button type="button" className="composer-drawer-heading" aria-expanded={state.open} aria-controls={id} onClick={onToggle}>To-do drawer</button>
      <div id={id} className="composer-drawer-content" hidden={!state.open} role="region" aria-label="Chat to-dos">
        {state.todos.length ? <ul>{state.todos.map(todo => <li key={todo.id} className={todo.complete ? 'is-complete' : ''}>
          <input type="checkbox" aria-label={`Complete to-do: ${todo.text}`} checked={todo.complete} onChange={() => onComplete(todo.id)}/><button type="button" className="composer-todo-text" aria-label={`Use to-do as prompt: ${todo.text}`} onClick={() => onUseTodo(todo.id)}>{todo.text}</button>
          <time dateTime={todo.created}>{todoTimestamp(todo.created)}</time>
        </li>)}</ul> : <p className="composer-drawer-empty">Switch to To-do and send a message to save it here.</p>}
      </div>
      {children}
    </div>
  </div>;
}
