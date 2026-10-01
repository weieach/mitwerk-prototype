import type { Task } from './model.ts';
import type { FrameAnnotation } from '../annotations/model.ts';
export type TodoTarget = { kind: 'task' | 'annotation'; id: string };
/** Removing a task from Todos must not delete its conversation or frame note. */
export function updateTodoTasks(tasks: Task[], target: TodoTarget, note: FrameAnnotation | undefined, text: string | null): Task[] {
 return tasks.map(task => {
  const matches = target.kind === 'task' ? task.id === target.id : task.annotationSourceId === target.id || (task.id === note?.chatId && task.messages.some(message => message.text.includes(`[Frame annotation ${target.id}]`)));
  if (!matches) return task;
  return text === null ? { ...task, origin: 'chat' } : { ...task, todoPrompt: text.trim() };
 });
}
