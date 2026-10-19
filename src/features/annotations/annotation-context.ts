import { createContext } from 'react';

/** Full project history, unaffected by the panel's date range or selected frame. */
export const LatestPromptIdContext = createContext<string | null>(null);
