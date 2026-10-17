import type { FrameContext } from './frame-context.ts';

export type ComposerMode = 'prompt' | 'todo';
export type ComposerTodo = { id: string; text: string; created: string; complete: boolean; frames?: FrameContext[]; assetIds?: string[] };
export type CaptureSettings = { screen: string; overlay: string };
export type ChatComposerState = {
  mode: ComposerMode;
  open: boolean;
  todos: ComposerTodo[];
  capture: CaptureSettings;
};

export function defaultComposer(): ChatComposerState {
  return { mode: 'prompt', open: false, todos: [], capture: { screen: 'homescreen', overlay: 'editor overlay' } };
}

/** Saving a to-do never mutates conversation messages or starts an agent run. */
export function addComposerTodo(state: ChatComposerState, text: string, id: string, created: string, context: Pick<ComposerTodo, 'frames' | 'assetIds'> = {}): ChatComposerState {
  if (!text.trim()) return state;
  return { ...state, open: true, todos: [...state.todos, { ...context, id, text: text.trim(), created, complete: false }] };
}

export function toggleComposerTodo(state: ChatComposerState, id: string): ChatComposerState {
  return { ...state, todos: state.todos.map(todo => todo.id === id ? { ...todo, complete: !todo.complete } : todo) };
}

export function todoTimestamp(created: string, today = new Date()): string {
  const date = new Date(created);
  if (!Number.isFinite(date.getTime())) return '';
  const day = date.toDateString() === today.toDateString() ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${day} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}
