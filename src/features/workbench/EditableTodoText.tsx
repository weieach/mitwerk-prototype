import { useRef, useState } from 'react';
export function EditableTodoText({ text, onSave }: { text: string; onSave: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const cancelled = useRef(false);
  function finish() { if (!cancelled.current) onSave(draft); setEditing(false); }
  return editing ? <textarea autoFocus rows={1} className="composer-todo-edit" aria-label={`Edit to-do: ${text}`} value={draft} onChange={event => setDraft(event.target.value)} onBlur={finish} onKeyDown={event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.blur(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelled.current = true; setEditing(false); }
  }}/> : <button type="button" className="composer-todo-text" aria-label={`Edit to-do: ${text}`} onClick={() => { cancelled.current = false; setDraft(text); setEditing(true); }}>{text}</button>;
}
