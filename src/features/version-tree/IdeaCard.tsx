import { useState } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import type { CSSProperties, ReactNode } from 'react';
import type { VersionNode } from './model';

type Props = { children: ReactNode; node: VersionNode; milestone: string; open: boolean; color: string; hasDescendants: boolean;
  onSelect: () => void; onSave: (text: string) => void };

export function IdeaCard({ node, milestone, open, color, hasDescendants, onSelect, onSave, children }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(milestone);
  function edit() { setDraft(milestone); setEditing(true); }
  return <article className={`idea-card ${open ? 'is-open' : ''}`} data-node-id={node.id} style={{ '--route-color': color } as CSSProperties}>
    <button className={`station ${milestone ? 'is-milestone' : hasDescendants ? 'has-descendants' : 'is-terminal'}`} aria-label={`Select ${node.label}`} aria-expanded={open} onClick={onSelect}>{milestone ? <PhosphorIcon name="trophy" weight="fill" size="var(--station-size)"/> : <span/>}</button>
    {milestone && !editing && <div className="idea-milestone"><p>{milestone}</p><button className="idea-edit" aria-label={`Edit milestone for ${node.label}`} onClick={edit}><i className="ph ph-pencil-simple" aria-hidden="true"/></button></div>}
    {editing ? <form className="idea-editor" onSubmit={event => { event.preventDefault(); if (draft.trim()) { onSave(draft.trim()); setEditing(false); } }}>
      <label htmlFor={`milestone-${node.id}`}>Milestone</label>
      <textarea id={`milestone-${node.id}`} autoFocus rows={3} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setEditing(false); }}/>
      <div><button type="submit" disabled={!draft.trim()}>Save milestone</button><button type="button" onClick={() => setEditing(false)}>Cancel</button>{milestone && <button type="button" onClick={() => { onSave(''); setEditing(false); }}>Remove</button>}</div>
    </form> : open && !milestone && <button className="idea-add" onClick={edit}><i className="ph ph-plus" aria-hidden="true"/>Add milestone</button>}
    {open && <div className="idea-command" aria-label={`Command details for ${node.label}`}>{children}</div>}
  </article>;
}
