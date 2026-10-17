import { defaultComposer, toggleComposerTodo } from '../workbench/composer-state';
import { useContext, useEffect, useMemo, useState } from 'react';
import { DrawerTodosContext } from '../workbench/DrawerTodosContext';
import { workbenchStorageKey } from '../workbench/composer-events';
import { loadState, saveState, workbenchEntry } from '../workbench/model';
import type { VersionNode } from './model';
import { ideaTodosByNode } from './idea-todos';

// The standalone history page uses the default conversation's saved drawer.
function readStandaloneDrawer() {
  const state = loadState();
  const task = workbenchEntry(state).task;
  return task ? state.chatComposers?.[task.id]?.todos ?? [] : [];
}
export function useIdeaTodos(nodes: VersionNode[]) {
  const drawer = useContext(DrawerTodosContext);
  const [savedDrawer, setSavedDrawer] = useState(() => drawer?.todos ?? readStandaloneDrawer());
  useEffect(() => {
    if (drawer !== null) return;
    const sync = (event: StorageEvent) => { if (!event.key || event.key === workbenchStorageKey) setSavedDrawer(readStandaloneDrawer()); };
    setSavedDrawer(readStandaloneDrawer());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [drawer]);
  const todos = drawer?.todos ?? savedDrawer;
  const todosByNode = useMemo(() => ideaTodosByNode(nodes, todos), [nodes, todos]);
  function toggleTodo(id: string) {
    if (drawer) { drawer.toggle(id); return; }
    const state = loadState();
    const task = workbenchEntry(state).task;
    if (!task) return;
    const composer = toggleComposerTodo(state.chatComposers?.[task.id] ?? defaultComposer(), id);
    saveState({ ...state, chatComposers: { ...state.chatComposers, [task.id]: composer } });
    setSavedDrawer(composer.todos);
  }
  return { todosByNode, toggleTodo };
}
