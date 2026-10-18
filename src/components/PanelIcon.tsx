import type { CSSProperties } from 'react';
import { PhosphorIcon, type PhosphorIconProps } from './PhosphorIcon';
import { panelIcons } from './panel-icons';

const accents: Record<string, string> = {
  [panelIcons.chat]: 'var(--feature-chat)',
  [panelIcons.versionBlocks]: 'var(--feature-version)',
  [panelIcons.ideaStream]: 'var(--feature-ideas)',
  [panelIcons.liveServer]: 'var(--feature-live)',
};

/** Feature identity is shared by navigation and panel headings. */
export function PanelIcon({ name, className = '', style, ...props }: PhosphorIconProps & { name: string }) {
  return <PhosphorIcon {...props} name={name} className={`panel-feature-icon ${className}`}
    style={{ '--panel-feature-color': accents[name] ?? 'currentColor', ...style } as CSSProperties}/>;
}
