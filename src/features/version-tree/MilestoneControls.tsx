import { PhosphorIcon } from '../../components/PhosphorIcon';
import { useId, useState } from 'react';
import type { ReactNode, Ref } from 'react';

export function MilestoneButton({ onClick, editing = false, disabled = false, buttonRef, saved = false, savePulse = 0 }: { onClick: () => void; editing?: boolean; disabled?: boolean; buttonRef?: Ref<HTMLButtonElement>; saved?: boolean; savePulse?: number }) {
  return <button ref={buttonRef} type="button" className={`idea-add${editing ? ' is-editing' : ''}`} title={saved ? 'Edit milestone' : undefined} disabled={disabled} onClick={onClick}><i key={saved ? `saved-${savePulse}` : 'add'} className={`ph ph-${saved ? 'check milestone-saved-check' : 'plus'}${saved && savePulse ? ' is-celebrating' : ''}`} aria-hidden="true"/><span className="milestone-action-label">{saved ? 'Milestone added' : editing ? 'Edit milestone' : 'Add milestone'}</span></button>;
}

export function MilestoneEditor({ value, onSave, onCancel, children, compactFooter = false }: { value: string; onSave: (text: string) => void; onCancel: () => void; children?: ReactNode; compactFooter?: boolean }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  function save(text: string) {
    try { onSave(text); } catch { setError('Could not save the milestone. Please try again.'); }
  }
  return <form className="idea-editor" onSubmit={event => { event.preventDefault(); if (draft.trim()) save(draft.trim()); }}>
    <label htmlFor={id}>Milestone</label>
    <input type="text" id={id} autoFocus value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onCancel(); } }}/>
    <div className={compactFooter ? 'milestone-editor-footer' : undefined}>
      {children}
      <div className="milestone-editor-actions">{value && <button type="button" className="milestone-remove" aria-label="Remove milestone" title="Remove milestone" onClick={() => save('')}><PhosphorIcon name="trash"/></button>}<button type="button" onClick={onCancel}>Cancel</button><button type="submit" disabled={!draft.trim()}>Save milestone</button></div>
    </div>
    {error && <p role="alert">{error}</p>}
  </form>;
}
