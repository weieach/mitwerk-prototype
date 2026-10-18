import { useLayoutEffect, useState } from 'react';
import { workspaceResponsive } from './workspace-responsive';

export function useWorkspaceViewport() {
  const [width, setWidth] = useState(window.innerWidth);
  useLayoutEffect(() => {
    const update = () => setWidth(window.innerWidth);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.smallWorkspace = String(width < workspaceResponsive.laptopWidth);
    return () => { delete document.documentElement.dataset.smallWorkspace; };
  }, [width]);
  return width;
}
