import type { CSSProperties } from 'react';
import { Icon } from './Icon';

/** Shared branch chip: white fill, branch-colored border, regular-weight name. */
export function BranchTag({ name, color }: { name: string; color: string }) {
  return <span className="branch-tag" style={{ '--branch-tag-color': color } as CSSProperties}><Icon name="branch" size={12}/>{name}</span>;
}
