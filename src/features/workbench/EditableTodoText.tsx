import { useRef, useState, type ReactNode } from 'react';
/** `prefix` (a bucket chip) leads the text at rest; editing shows `editText`, the chip's plain form. */
export function EditableTodoText({ text, editText = text, prefix, suffix, onSave }: { text: string; editText?: string; prefix?: ReactNode; suffix?: ReactNode; onSave: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const cancelled = useRef(false);
  function finish() { if (!cancelled.current) onSave(draft); setEditing(false); }
  return editing ? <input type="text" autoFocus className="composer-todo-edit" aria-label={`Edit to-do: ${text}`} value={draft} onChange={event => setDraft(event.target.value)} onBlur={finish} onKeyDown={event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.blur(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelled.current = true; setEditing(false); }
  }}/> : <span className="composer-todo-line">{prefix}<button type="button" className="composer-todo-text" aria-label={`Edit to-do: ${text}`} onClick={() => { cancelled.current = false; setDraft(editText); setEditing(true); }}>{text}{suffix}</button></span>;
}
