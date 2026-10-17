import { useState } from 'react';
import type { Ref } from 'react';
import { InlineTextField } from '../../components/InlineTextField';

export function MilestoneButton({ onClick, editing = false, disabled = false, buttonRef }: { onClick: () => void; editing?: boolean; disabled?: boolean; buttonRef?: Ref<HTMLButtonElement> }) {
  return <button ref={buttonRef} type="button" className="idea-add" disabled={disabled} onClick={onClick}><i className="ph ph-plus" aria-hidden="true"/>{editing ? 'Edit milestone' : 'Add milestone'}</button>;
}

/** Inline milestone entry. Committing blank text removes the milestone. */
export function MilestoneEditor({ value, onSave, onCancel, autoFocus = true, fieldRef }: { value: string; onSave: (text: string) => void; onCancel?: () => void; autoFocus?: boolean; fieldRef?: Ref<HTMLTextAreaElement> }) {
  const [error, setError] = useState('');
  function save(text: string) {
    try { onSave(text); setError(''); } catch { setError('Could not save the milestone. Try again.'); }
  }
  return <div className="idea-editor">
    <InlineTextField fieldRef={fieldRef} value={value} autoFocus={autoFocus} label="Milestone" placeholder="Add a milestone" onCommit={save} onCancel={onCancel}/>
    {error && <p role="alert">{error}</p>}
  </div>;
}
