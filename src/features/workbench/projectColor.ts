import type { CSSProperties } from 'react';
import type { Project } from './model';

// Use the full saved project order so filtering and archiving keep colors stable.
const palette = ['route', 'assemble', 'misregister'];
export function projectColor(projects: Project[], id: string): CSSProperties {
 const index = Math.max(0, projects.findIndex(project => project.id === id));
 return { '--project-color': `var(--mw-${palette[index % palette.length]})` } as CSSProperties;
}
