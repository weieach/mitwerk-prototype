import { useEffect, useRef, useState } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import type { CSSProperties, ReactNode } from 'react';
import type { VersionNode } from './model';
import { isFinishedIdeaVersion, withinNodeHoverRadius } from './idea-stream';
import { ideaTheme } from './tokens';

type Props = { children: ReactNode; node: VersionNode; milestone: string; open: boolean; currentWip: boolean; color: string; hasDescendants: boolean;
  onSelect: () => void; onSave: (text: string) => void };

export function IdeaCard({ node, milestone, open, currentWip, color, hasDescendants, onSelect, onSave, children }: Props) {
  const finished = isFinishedIdeaVersion(node);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(milestone);
  const station = useRef<HTMLButtonElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  const [near, setNear] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!near) return;
    function track(event: PointerEvent) {
      const rect = station.current?.getBoundingClientRect();
      if (!rect) return;
      // Keep the action itself usable, including at large graph zoom levels.
      if (add.current?.contains(event.target as Node)) return;
      setNear(withinNodeHoverRadius(event.clientX, event.clientY, rect.left + rect.width / 2, rect.top + rect.height / 2, window.innerWidth, ideaTheme.hoverRadiusViewport));
    }
    function leave() { setNear(false); }
    window.addEventListener('pointermove', track);
    window.addEventListener('blur', leave);
    document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', track); window.removeEventListener('blur', leave); document.removeEventListener('pointerleave', leave); };
  }, [near]);
  function edit() { setDraft(milestone); setEditing(true); }
  return <article className={`idea-card ${open ? 'is-open' : ''}`} data-node-id={node.id} style={{ '--route-color': color } as CSSProperties}
    onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <button ref={station} onPointerEnter={() => setNear(true)} className={`station ${milestone ? 'is-milestone' : hasDescendants ? 'has-descendants' : 'is-terminal'}`} aria-label={`Select ${node.label}`} aria-expanded={open} onClick={onSelect}>{milestone ? <PhosphorIcon name="trophy" weight="fill" size="var(--station-size)"/> : <span/>}</button>
    {milestone && !editing && <button className="idea-milestone" aria-label={`Edit milestone for ${node.label}`} onClick={edit}>{milestone}</button>}
    {editing ? <form className="idea-editor" onSubmit={event => { event.preventDefault(); if (draft.trim()) { onSave(draft.trim()); setEditing(false); } }}>
      <label htmlFor={`milestone-${node.id}`}>Milestone</label>
      <textarea id={`milestone-${node.id}`} autoFocus rows={3} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setEditing(false); }}/>
      <div><button type="submit" disabled={!draft.trim()}>Save milestone</button><button type="button" onClick={() => setEditing(false)}>Cancel</button>{milestone && <button type="button" onClick={() => { onSave(''); setEditing(false); }}>Remove</button>}</div>
    </form> : (currentWip || near || focused) && !milestone && <button ref={add} className="idea-add" onClick={edit}><i className="ph ph-plus" aria-hidden="true"/>Add milestone</button>}
    {currentWip && <div className="version-stats idea-wip-prompts"><span>{node.prompts.length} {node.prompts.length === 1 ? 'prompt' : 'prompts'}</span></div>}
    {open && finished && <div className="idea-command" aria-label={`Command details for ${node.label}`}>{children}</div>}
  </article>;
}
