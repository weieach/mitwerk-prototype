import { Folder, Image } from '../../components/PhosphorIcon';

/** Shared hierarchy for conversation tasks and frame-annotation tasks. */
export function TodoCardContent({project, text, frames = [], complete = false}: {
  project: string; text: string; complete?: boolean; frames?: {id: string; label: string}[];
}) {
  return <>
    <p className="kanban-project"><Folder size="var(--todo-project-icon-size)"/><span title={project}>{project}</span></p>
    <h3 data-complete={complete}>{text}</h3>
    {frames.map(frame => <p key={frame.id} className="kanban-frame"><Image size="var(--todo-project-icon-size)"/><span>{frame.label}</span></p>)}
  </>;
}
