import { PanelViewSwitch } from './PanelViewSwitch';
import type { ReactNode } from 'react';
import { PhosphorIcon, FullscreenIcon } from './PhosphorIcon';

/** Shared, tab-free heading for conversation and reading panels. */
export function PanelHeader({ title, mode, icon, actions, onTitleClick, onModeChange, modeDisabled = false, onToggle, expanded = false }: {
  title: string; mode?: 'Gallery' | 'Playback'; icon?: string; actions?: ReactNode;
  onModeChange?: (mode: 'Gallery' | 'Playback') => void; modeDisabled?: boolean; onTitleClick?: () => void; onToggle?: () => void; expanded?: boolean;
}) {
  return <header className="panel-header workspace-panel-header">
    <div className="panel-heading">
      {icon && !mode && <PhosphorIcon name={icon} size={15}/>}
      {mode ? <button className="panel-title-pill" onClick={onTitleClick} aria-label={onTitleClick ? 'Return to gallery' : undefined}>{icon && <PhosphorIcon name={icon} size={15}/>}{title}</button> : <h2 title={title}>{title}</h2>}
      {mode && <PanelViewSwitch mode={mode} disabled={modeDisabled} onChange={onModeChange}/>}
    </div>
    <div className="panel-header-actions">
      {actions}
      {onToggle && <button type="button" className="icon-button panel-expand" aria-label={expanded ? `Restore ${title} panel` : `Expand ${title} panel`} onClick={onToggle}><FullscreenIcon expanded={expanded} size={16}/></button>}
    </div>
  </header>;
}
