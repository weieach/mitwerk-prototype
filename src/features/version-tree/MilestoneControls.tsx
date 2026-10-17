import { PhosphorIcon } from '../../components/PhosphorIcon';
import { useId, useState } from 'react';
import type { ReactNode, Ref } from 'react';

export function MilestoneButton({ onClick, editing = false, disabled = false, buttonRef }: { onClick: () => void; editing?: boolean; disabled?: boolean; buttonRef?: Ref<HTMLButtonElement> }) {
  return <button ref={buttonRef} type="button" className="idea-add" disabled={disabled} onClick={onClick}><i className="ph ph-plus" aria-hidden="true"/>{editing ? 'Edit milestone' : 'Add milestone'}</button>;
}

export function MilestoneEditor({ value, onSave, onCancel, children, compactFooter = false }: { value: string; onSave: (text: string) => void; onCancel: () => void; children?: ReactNode; compactFooter?: boolean }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  function save(text: string) {
    try { onSave(text); } catch { setError('Could not save the milestone. Please try again.'); }
  }
  return <form className="idea-editor" onSubmit={event => { event.preventDefault(); if (draft.trim()) save(draft.trim()); }}>
    <label htmlFor={id} className="visually-hidden">Milestone</label>
    <textarea id={id} autoFocus rows={3} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onCancel(); } }}/>
    <div className={compactFooter ? 'milestone-editor-footer' : undefined}>
      {children}
      <div className="milestone-editor-actions">{value && <button type="button" className="milestone-remove" aria-label="Remove milestone" title="Remove milestone" onClick={() => save('')}><PhosphorIcon name="trash"/></button>}<button type="button" onClick={onCancel}>Cancel</button><button type="submit" disabled={!draft.trim()}>Save milestone</button></div>
    </div>
    {error && <p role="alert">{error}</p>}
  </form>;
}
