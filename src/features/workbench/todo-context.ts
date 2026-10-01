import { isTodoChat, todoContext } from './model.ts';
import type { SavedState, Task } from './model.ts';
import type { FrameAnnotation } from '../annotations/model.ts';

export type TodoChoice = { id: string; text: string; annotationId?: string; taskId?: string; createdAt: number; order: number };
/** Merge the two local task sources without duplicating annotation-backed chats. */
export function todoChoices(tasks: Task[], annotations: FrameAnnotation[]): TodoChoice[] {
 const notes = annotations.filter(note => note.todo);
 return [
  ...tasks.flatMap((task, order) => !isTodoChat(task) || task.status === 'Complete' || notes.some(note => note.id === task.annotationSourceId || (note.chatId === task.id && todoContext(task).includes(`[Frame annotation ${note.id}]`))) ? [] : [{ id: task.id, taskId: task.id, text: todoContext(task), createdAt: Date.parse(task.created || '') || 0, order }]),
  ...notes.filter(note => note.status !== 'Complete').map((note, order) => ({ id: `annotation:${note.id}`, text: note.text, annotationId: note.id, createdAt: Date.parse(note.createdAt) || 0, order: tasks.length + order })),
 ].sort((a, b) => b.createdAt - a.createdAt || b.order - a.order);
}
export function attachTodoToChat(state: SavedState, chatId: string, todo: Pick<TodoChoice, 'text' | 'annotationId' | 'taskId'>): SavedState {
 return { ...state, taskDetailsLinks: todo.taskId || todo.annotationId ? { ...state.taskDetailsLinks, [chatId]: { taskId: todo.taskId, annotationId: todo.annotationId } } : state.taskDetailsLinks, todoAttachments: { ...state.todoAttachments, [chatId]: { text: todo.text, annotationId: todo.annotationId } } };
}

/** The displayed task survives removing or sending its composer chip. */
export function taskDetailsForChat(state: SavedState, chat: Task, annotations: FrameAnnotation[]) {
 const link = state.taskDetailsLinks?.[chat.id];
 const annotationId = link?.annotationId ?? (!link ? state.todoAttachments?.[chat.id]?.annotationId ?? chat.annotationSourceId : undefined);
 const note = annotations.find(note => note.id === annotationId || (!link && !annotationId && note.chatId === chat.id && todoContext(chat).includes(`[Frame annotation ${note.id}]`)));
 if (note) return { title: note.text, status: note.status, annotationId: note.id, taskId: undefined };
 const task = state.tasks.find(task => task.id === link?.taskId) ?? chat;
 return { title: task.todoPrompt || task.title, status: task.status, taskId: task.id, annotationId: undefined };
}
