import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon, type IconName } from '../../components/Icon';
import { isCaptureImage, isCompactVersionCard, isPictureFile, isPrimaryCommitAction, versionCommitAction, versionCommitActionLabel, type VersionFile, type VersionNode } from './model';

function fileChipIcon(file: Pick<VersionFile, 'name' | 'kind'>): IconName {
  if (file.kind === 'skill') return 'spark';
  if (file.kind === 'code') return 'code';
  return isPictureFile(file.name) ? 'image' : 'file';
}

type Props = {
  node: VersionNode;
  selected: boolean;
  hasDescendants: boolean;
  isEndpoint: boolean;
  onActivePath: boolean;
  isCurrentBranch: boolean;
  canDeleteCurrent: boolean;
  canDeleteFuture: boolean;
  color: string;
  reverted: boolean;
  merged?: boolean;
  onSelect: () => void;
  onBranch: () => void;
  onCommit: () => void;
  onRevert: () => void;
  onRestore: () => void;
  onSwitchBranch: () => void;
  onDeleteCurrent: () => void;
  onDeleteFuture: () => void;
  forceMenuOpen?: boolean;
  readOnly?: boolean;
  onDisconnected?: () => void;
};

export function VersionCard({
  node, selected, hasDescendants, isEndpoint, onActivePath, isCurrentBranch, canDeleteCurrent, canDeleteFuture, color, reverted, merged = false,
  onSelect, onBranch, onCommit, onRevert, onRestore, onSwitchBranch, onDeleteCurrent, onDeleteFuture, forceMenuOpen = false, readOnly = false, onDisconnected,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(forceMenuOpen);
  const menu = useRef<HTMLDivElement>(null);
  const compact = isCompactVersionCard(onActivePath, selected) && !forceMenuOpen;
  const commitAction = versionCommitAction(isEndpoint, reverted);
  const commitActionLabel = versionCommitActionLabel(commitAction);
  const commitActionIcon = commitAction === 'restore' ? 'restore' : 'reference';
  const onCommitAction = commitAction === 'restore' ? onRestore : commitAction === 'revert' ? onRevert : onCommit;
  const restorePrimary = isPrimaryCommitAction(commitAction);
  const blocked = (action: () => void) => readOnly ? () => onDisconnected?.() : action;
  const branchButton = <button onClick={blocked(onBranch)} aria-label={`Add branch from ${node.label}`}><Icon name="branch" size={13}/>Add branch</button>;
  const commitButton = <button className={restorePrimary ? 'is-primary' : undefined} onClick={blocked(onCommitAction)} aria-label={`${commitActionLabel} ${node.label}`}><Icon name={commitActionIcon} size={13}/>{commitActionLabel}</button>;
  const references = node.files.filter(file => file.kind !== 'code' && !isCaptureImage(file));
  const codeFiles = node.files.filter(file => file.kind === 'code');
  const added = node.files.reduce((sum, file) => sum + file.added, 0);
  const removed = node.files.reduce((sum, file) => sum + file.removed, 0);

  useEffect(() => {
    if (forceMenuOpen) setMenuOpen(true);
  }, [forceMenuOpen]);

  useEffect(() => {
    if (!menuOpen || forceMenuOpen) return;
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
  }, [menuOpen, forceMenuOpen]);

  return <article className={`version-card ${selected ? 'is-selected' : ''} ${onActivePath ? 'is-active-branch' : ''} ${compact ? 'is-compact' : ''} ${reverted ? 'is-reverted' : ''}`} style={{ '--route-color': color } as CSSProperties} data-node-id={node.id} data-active-branch={onActivePath} data-compact={compact || undefined} data-reverted={reverted || undefined} onClick={compact ? onSelect : undefined}>
    <button className={`station ${hasDescendants ? 'has-descendants' : 'is-terminal'} ${merged ? 'is-merged' : ''}`} aria-label={`Select ${node.label}`} aria-pressed={selected} onClick={onSelect}>
      <span />
    </button>
    {!compact && <div ref={menu} className="card-menu">
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
          <button role="menuitem" disabled={readOnly || !canDeleteCurrent} onClick={() => { setMenuOpen(false); onDeleteCurrent(); }}>
            {hasDescendants ? 'Delete current node' : 'Delete current endpoint'}
          </button>
        </li>
        {hasDescendants && <li role="none">
          <button role="menuitem" disabled={readOnly || !canDeleteFuture} onClick={() => { setMenuOpen(false); onDeleteFuture(); }}>
            Delete future nodes
          </button>
        </li>}
      </ul>}
    </div>}
    <button className="version-heading" onClick={onSelect} aria-label={`View ${node.label}: ${node.title || 'Untitled version'}`}>
      <span className="version-meta"><span className="save-label">{node.saveType === 'auto' ? <Icon name="spark" size={11}/> : <Icon name="commit" size={12}/>} {node.git ? 'Git commit' : node.capture ? node.capture.pushed ? 'Saved push' : 'Work in progress' : node.saveType === 'auto' ? 'Autosave' : 'Manual save'}</span></span>
      <span className={`version-title ${!node.title ? 'untitled' : ''} ${titleExpanded ? 'is-expanded' : ''}`} title={node.title || 'Untitled version'} onClick={event => { event.stopPropagation(); setTitleExpanded(open => !open); }}>{node.title || 'Untitled version'}</span>
    </button>
    {(references.length > 0 || (node.capture && !node.capture.pushed)) && <div className="reference-files">
      {references.length > 0 ? references.slice(0, 2).map(file => <span className="file-chip" key={file.name} title={file.name}><Icon name={fileChipIcon(file)} size={12}/>{file.url ? <a className="file-chip-name capture-frame-link" href={`${import.meta.env.BASE_URL}${file.url}`} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>{file.name}</a> : <span className="file-chip-name">{file.name}</span>}</span>) : <span className="empty-reference">No references yet</span>}
      {references.length > 2 && <span className="mono">+{references.length - 2}</span>}
    </div>}
    {!compact && <>
      <div className="version-stats"><span><Icon name="code" size={13}/>{`${node.git ? node.git.filesChanged : codeFiles.length} ${(node.git ? node.git.filesChanged : codeFiles.length) === 1 ? 'file' : 'files'} changed`}</span><span className="stat-divider"/><button onClick={() => { onSelect(); if (node.capture) setDetailsOpen(true); }}>{node.prompts.length} {node.prompts.length === 1 ? 'prompt' : 'prompts'}<Icon name="arrow" size={11}/></button></div>
      <div className="version-card-bottom"><button className="details-toggle" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen}><Icon name="chevron" size={10} style={{ transform: detailsOpen ? 'rotate(90deg)' : undefined }}/>{detailsOpen ? 'Hide details' : 'Show details'}</button><span className="line-count"><span className="is-added">+{node.git ? node.git.added : node.capture ? node.capture.added ?? '—' : added}</span><span className="is-removed">−{node.git ? node.git.removed : node.capture ? node.capture.removed ?? '—' : removed}</span></span></div>
      <div className="node-actions">{restorePrimary ? <>{commitButton}{branchButton}</> : <>{branchButton}{commitButton}</>}</div>
      {detailsOpen && <div className="node-details"><div className="node-details-label">VERSION DETAILS<button onClick={() => setDetailsOpen(false)} aria-label={`Close details for ${node.label}`}><Icon name="close" size={13}/></button></div><p>{node.summary || 'This version is empty. Its summary and file changes will appear here.'}</p>{node.git?.merges.map(merge => <p key={merge}>{merge}</p>)}<time dateTime={node.createdAt}>{node.capture ? new Date(node.createdAt).toLocaleString() : null}</time>{node.capture && node.prompts.map(prompt => <p key={prompt.id}>{prompt.text}</p>)}<div className="detail-file-list">{node.files.map(file => <div key={file.name}><Icon name={fileChipIcon(file)} size={12}/><span>{file.url ? <a className="capture-frame-link" href={`${import.meta.env.BASE_URL}${file.url}`} target="_blank" rel="noreferrer">{file.name}</a> : file.name}</span><small>{file.kind}</small></div>)}</div></div>}
    </>}
  </article>;
}
