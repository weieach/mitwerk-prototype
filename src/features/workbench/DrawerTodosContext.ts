import { createContext } from 'react';
import type { ComposerTodo } from './composer-state';

/** The current drawer's actual array, shared in the same React render. */
export const DrawerTodosContext = createContext<{ todos: ComposerTodo[]; toggle: (id: string) => void } | null>(null);
