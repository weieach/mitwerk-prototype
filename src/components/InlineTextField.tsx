import { useRef, useState } from 'react';
import type { Ref } from 'react';

/** Boxless text entry: a faint placeholder over a hairline underline. Enter or blur commits, Shift+Enter breaks a line, Escape cancels. */
export function InlineTextField({ value = '', placeholder, label, autoFocus = false, onCommit, onCancel, fieldRef, className = '' }: {
  value?: string; placeholder: string; label: string; autoFocus?: boolean; onCommit: (text: string) => void; onCancel?: () => void; fieldRef?: Ref<HTMLTextAreaElement>; className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  function commit() {
    if (cancelled.current) { cancelled.current = false; return; }
    if (draft.trim() !== value.trim()) onCommit(draft.trim());
    else onCancel?.();
  }
  return <textarea ref={fieldRef} rows={1} autoFocus={autoFocus} className={`inline-text-field ${className}`} aria-label={label} placeholder={placeholder} value={draft}
    onFocus={event => { const end = event.currentTarget.value.length; event.currentTarget.setSelectionRange(end, end); }}
    onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.blur(); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelled.current = true; setDraft(value); onCancel?.(); event.currentTarget.blur(); }
    }}/>;
}
