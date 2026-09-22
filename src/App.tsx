import { useEffect, useReducer, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { VersionTreePanel } from './features/version-tree/VersionTreePanel';
import { loadGraphState } from './features/version-tree/model';
import { loadTreePanels, panelBrowserStorage, panelReducer, saveTreePanels } from './features/version-tree/panel-state';
import { IterationGallery } from './features/iteration-gallery/IterationGallery';

const MIN_PANEL = 280;
const KEY_STEP = 24;

function clampLeftWidth(width: number, total: number) {
  if (total <= MIN_PANEL * 2) return total / 2;
  return Math.max(MIN_PANEL, Math.min(total - MIN_PANEL, width));
}

export default function App() {
  const [panels, dispatchPanel] = useReducer(panelReducer, undefined, () => loadTreePanels(loadGraphState(), panelBrowserStorage()));
  const workspace = useRef<HTMLElement>(null);
  const divider = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number | null>(null);
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const [resizing, setResizing] = useState(false);
  const leftWidthRef = useRef(leftWidth);
  const drag = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  leftWidthRef.current = leftWidth;

  useEffect(() => {
    saveTreePanels(panels, panelBrowserStorage());
  }, [panels]);

  function totalWidth() {
    return workspace.current?.clientWidth || workspaceWidth;
  }

  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const total = element.clientWidth;
      setWorkspaceWidth(total);
      setLeftWidth(width => width === null ? width : clampLeftWidth(width, total));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handle = divider.current;
    if (!handle) return;

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      event.preventDefault();
      const total = totalWidth();
      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: leftWidthRef.current ?? total / 2,
      };
      setResizing(true);
      try { handle?.setPointerCapture(event.pointerId); } catch {}
    }

    function onPointerMove(event: PointerEvent) {
      const start = drag.current;
      if (!start || start.pointerId !== event.pointerId) return;
      setLeftWidth(clampLeftWidth(start.startWidth + event.clientX - start.startX, totalWidth()));
    }

    function onPointerUp(event: PointerEvent) {
      const start = drag.current;
      if (!start || start.pointerId !== event.pointerId) return;
      drag.current = null;
      setResizing(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      const total = totalWidth();
      const current = leftWidthRef.current ?? total / 2;
      const step = event.shiftKey ? KEY_STEP * 3 : KEY_STEP;
      if (event.key === 'ArrowLeft') { event.preventDefault(); setLeftWidth(clampLeftWidth(current - step, total)); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); setLeftWidth(clampLeftWidth(current + step, total)); }
      else if (event.key === 'Home') { event.preventDefault(); setLeftWidth(clampLeftWidth(MIN_PANEL, total)); }
      else if (event.key === 'End') { event.preventDefault(); setLeftWidth(clampLeftWidth(total - MIN_PANEL, total)); }
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setLeftWidth(null); }
    }

    function onDoubleClick() { setLeftWidth(null); }

    handle.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    handle.addEventListener('keydown', onKeyDown);
    handle.addEventListener('dblclick', onDoubleClick);
    return () => {
      handle.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      handle.removeEventListener('keydown', onKeyDown);
      handle.removeEventListener('dblclick', onDoubleClick);
    };
  }, []);

  const total = workspaceWidth;
  const percent = leftWidth === null || total === 0 ? 50 : Math.round((leftWidth / total) * 100);
  const minPercent = total <= MIN_PANEL * 2 ? 0 : Math.round((MIN_PANEL / total) * 100);
  const maxPercent = total <= MIN_PANEL * 2 ? 100 : Math.round(((total - MIN_PANEL) / total) * 100);

  return <main
    ref={workspace}
    className={`workspace${resizing ? ' is-resizing' : ''}`}
    style={{ '--split': leftWidth === null ? '50%' : `${leftWidth}px` } as CSSProperties}
  >
    <div className="workspace-split" style={{ gridTemplateColumns: leftWidth === null ? 'minmax(0, 1fr) minmax(0, 1fr)' : `${leftWidth}px minmax(0, 1fr)` }}>
      <IterationGallery />
      <VersionTreePanel key={panels.mode} graph={panels[panels.mode]}
        mode={panels.mode} onModeChange={mode => dispatchPanel({ type: 'switch', mode })}
        dispatch={action => dispatchPanel({ type: 'graph', mode: panels.mode, action })} />
    </div>
    <div
      ref={divider}
      className={`panel-divider${resizing ? ' is-resizing' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      aria-valuemin={minPercent}
      aria-valuemax={maxPercent}
      aria-valuenow={percent}
      title="Drag to resize"
      tabIndex={0}
    />
  </main>;
}
