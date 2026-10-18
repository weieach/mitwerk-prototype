import './shared/live-preview';
import './shared/reset-prototype-milestones';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './control-tokens.css';
import './features/workbench/workbench-system.css';
import './features/workbench/workspace-layout.css';
import { applyTheme, savedTheme } from './shared/theme';
import { installTypeStudio } from './shared/type-studio';
import { installFeaturePalette } from './shared/palette';

applyTheme(savedTheme());
installFeaturePalette();
installTypeStudio();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
