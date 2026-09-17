import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '../../components/Icon';
import type { VersionNode } from './model';

type Props = {
  node: VersionNode;
  selected: boolean;
  hasDescendants: boolean;
  onActivePath: boolean;
  isCurrentBranch: boolean;
  canDeleteFuture: boolean;
  color: string;
  onSelect: () => void;
  onBranch: () => void;
  onCommit: () => void;
  onSwitchBranch: () => void;
  onDeleteFuture: () => void;
};

export function VersionCard({
  node, selected, hasDescendants, onActivePath, isCurrentBranch, canDeleteFuture, color,
  onSelect, onBranch, onCommit, onSwitchBranch, onDeleteFuture,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const references = node.files.filter(file => file.kind !== 'code');
  const codeFiles = node.files.filter(file => file.kind === 'code');
  const added = node.files.reduce((sum, file) => sum + file.added, 0);
  const removed = node.files.reduce((sum, file) => sum + file.removed, 0);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutside(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return <article className={`version-card ${selected ? 'is-selected' : ''} ${onActivePath ? 'is-active-branch' : ''}`} style={{ '--route-color': color } as CSSProperties} data-node-id={node.id} data-active-branch={onActivePath}>
    <button className={`station ${hasDescendants ? 'has-descendants' : 'is-terminal'}`} aria-label={`Select ${node.label}`} aria-pressed={selected} onClick={onSelect}>
      <span />
    </button>
    <div ref={menu} className="card-menu">
      <button className="card-menu-trigger" aria-haspopup="menu" aria-expanded={menuOpen}
        aria-label={`Actions for ${node.label}`} onClick={() => setMenuOpen(open => !open)}>
        <Icon name="more" size={14}/>
      </button>
      {menuOpen && <ul className="card-menu-panel" role="menu">
        <li role="none">
          <button role="menuitem" disabled={isCurrentBranch} onClick={() => { setMenuOpen(false); onSwitchBranch(); }}>
            Switch to this branch
          </button>
        </li>
        <li role="none">
          <button role="menuitem" disabled={!canDeleteFuture} onClick={() => { setMenuOpen(false); onDeleteFuture(); }}>
            Delete future endpoint
          </button>
        </li>
      </ul>}
    </div>
    <button className="version-heading" onClick={onSelect} aria-label={`View ${node.label}: ${node.title || 'Untitled version'}`}>
      <span className="version-meta"><span className="save-label">{node.saveType === 'auto' ? <Icon name="spark" size={11}/> : <Icon name="commit" size={12}/>} {node.saveType === 'auto' ? 'Autosave' : 'Manual save'}</span></span>
      <span className={`version-title ${!node.title ? 'untitled' : ''}`} title={node.title || 'Untitled version'}>{node.title || 'Untitled version'}</span>
    </button>
    <div className="reference-files">
      {references.length > 0 ? references.slice(0, 2).map(file => <span className="file-chip" key={file.name} title={file.name}><Icon name={file.kind === 'skill' ? 'spark' : 'file'} size={12}/>{file.name}</span>) : <span className="empty-reference">No references yet</span>}
      {references.length > 2 && <span className="mono">+{references.length - 2}</span>}
    </div>
    <div className="version-stats"><span><Icon name="code" size={13}/>{codeFiles.length} {codeFiles.length === 1 ? 'file' : 'files'} changed</span><span className="stat-divider"/><button onClick={onSelect}>{node.prompts.length} {node.prompts.length === 1 ? 'prompt' : 'prompts'}<Icon name="arrow" size={11}/></button></div>
    <div className="version-card-bottom"><button className="details-toggle" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen}><Icon name="chevron" size={10} style={{ transform: detailsOpen ? 'rotate(90deg)' : undefined }}/>{detailsOpen ? 'Hide details' : 'Show details'}</button><span className="line-count"><span>+{added}</span><span>−{removed}</span></span></div>
    <div className="node-actions"><button onClick={onBranch} aria-label={`Add branch from ${node.label}`}><Icon name="branch" size={13}/>Add branch</button><button onClick={onCommit} aria-label={`Add commit after ${node.label}`}><Icon name="plus" size={13}/>Add commit</button></div>
    {detailsOpen && <div className="node-details"><div className="node-details-label">VERSION DETAILS<button onClick={() => setDetailsOpen(false)} aria-label={`Close details for ${node.label}`}><Icon name="close" size={13}/></button></div><p>{node.summary || 'This version is empty. Its summary and file changes will appear here.'}</p><div className="detail-file-list">{node.files.map(file => <div key={file.name}><Icon name={file.kind === 'code' ? 'code' : file.kind === 'skill' ? 'spark' : 'file'} size={12}/><span>{file.name}</span><small>{file.kind}</small></div>)}</div></div>}
  </article>;
}
