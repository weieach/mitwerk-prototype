import type { FrameContext } from './frame-context.ts';

export type ComposerMode = 'prompt' | 'todo';
export type ComposerTodo = { id: string; text: string; created: string; complete: boolean; version?: number; frames?: FrameContext[]; assetIds?: string[] };
export type CaptureSettings = { screen: string; overlay: string };
export type ChatComposerState = {
  sampleTodosSeeded?: boolean;
  model?: string;
  mode: ComposerMode;
  open: boolean;
  todos: ComposerTodo[];
  capture: CaptureSettings;
};

export function defaultComposer(): ChatComposerState {
  return { mode: 'prompt', open: false, todos: [], capture: { screen: 'homescreen', overlay: 'editor overlay' } };
}

/** Saving a to-do never mutates conversation messages or starts an agent run. */
export function addComposerTodo(state: ChatComposerState, text: string, id: string, created: string, context: Pick<ComposerTodo, 'frames' | 'assetIds' | 'version'> = {}): ChatComposerState {
  if (!text.trim()) return state;
  return { ...state, open: true, todos: [...state.todos, { ...context, id, text: text.trim(), created, complete: false }] };
}

export function toggleComposerTodo(state: ChatComposerState, id: string): ChatComposerState {
  return { ...state, todos: state.todos.map(todo => todo.id === id ? { ...todo, complete: !todo.complete } : todo) };
}

export function todoTimestamp(created: string, today = new Date()): string {
  const date = new Date(created);
  if (!Number.isFinite(date.getTime())) return '';
  // Calendar-day arithmetic avoids DST's 23/25-hour days changing the label.
  const calendarDay = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const days = Math.round((calendarDay(date) - calendarDay(today)) / 86_400_000);
  const relative = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(days, 'day');
  const day = relative[0].toUpperCase() + relative.slice(1);
  return days === 0 || days === -1 ? `${day} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : day;
}

/** Reuse text without completing/removing the to-do or losing an existing draft. */
export function useTodoAsPrompt(state: ChatComposerState, draft: string, id: string) {
  const todo = state.todos.find(item => item.id === id);
  if (!todo) return { composer: state, draft };
  return { composer: { ...state, mode: 'prompt' as const }, draft: draft + (draft.trim() ? `${draft.endsWith('\n') ? '' : '\n'}------\nExecute this todo: \n` : '') + todo.text };
}

export type TodoVersion = { timestamp: number; version: number };
/** Version at creation stays fixed even when newer versions arrive. */
export function todoVersionAt(history: TodoVersion[], created: string): number | undefined {
  const time = Date.parse(created);
  return history.filter(frame => frame.timestamp <= time).sort((a, b) => b.timestamp - a.timestamp)[0]?.version;
}

/** Add the requested sample history once, preserving saved drafts, toggles and real items. */
export function hydrateComposerTodos(composers: Record<string, ChatComposerState>, history: TodoVersion[], sampleChatId: string, today = new Date()) {
  const next = Object.fromEntries(Object.entries(composers).map(([id, composer]) => [id, { ...composer,
    todos: composer.todos.map(todo => todo.version === undefined ? { ...todo, version: todoVersionAt(history, todo.created) } : todo),
  }]));
  const sample = next[sampleChatId] ?? defaultComposer();
  if (sample.sampleTodosSeeded || !history.length) return next;
  const examples = [
    { id: 'drawer-sample-keyboard', text: 'Check keyboard navigation in playback', days: 7, hour: 16, minute: 35 },
    { id: 'drawer-sample-labels', text: 'Review branch labels at smaller screen sizes', days: 3, hour: 14, minute: 20 },
    { id: 'drawer-sample-contrast', text: 'Polish contrast in the dark theme', days: 1, hour: 9, minute: 4 },
  ];
  const samples = examples.filter(item => !sample.todos.some(todo => todo.id === item.id)).map(item => {
    const date = new Date(today); date.setDate(date.getDate() - item.days); date.setHours(item.hour, item.minute, 0, 0);
    const created = date.toISOString();
    return { id: item.id, text: item.text, created, complete: false, version: todoVersionAt(history, created) };
  });
  next[sampleChatId] = { ...sample, sampleTodosSeeded: true, todos: [...samples, ...sample.todos].sort((a, b) => Date.parse(a.created) - Date.parse(b.created)) };
  return next;
}

/** Pending items lead, newest first in each group; stable sorting preserves ties. */
export function orderedComposerTodos(todos: ComposerTodo[]) {
  const timestamp = (todo: ComposerTodo) => Date.parse(todo.created) || 0;
  return [...todos].sort((a, b) => Number(a.complete) - Number(b.complete) || timestamp(b) - timestamp(a));
}
