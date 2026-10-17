import type { VersionNode } from './model.ts';
import { orderedComposerTodos, type ComposerTodo } from '../workbench/composer-state.ts';

export type IdeaTodo = ComposerTodo & { version: number };
/** Project the drawer's own items, preserving their identity and ordering. */
export function ideaTodosByNode(nodes: VersionNode[], drawerTodos: ComposerTodo[]) {
  const todos = orderedComposerTodos(drawerTodos).filter((todo): todo is IdeaTodo => todo.version !== undefined);
  return new Map(nodes.flatMap(node => {
    const items = todos.filter(todo => todo.version === node.capture?.version);
    return items.length ? [[node.id, items] as const] : [];
  }));
}
