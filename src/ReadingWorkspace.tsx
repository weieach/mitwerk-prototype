import type { RuntimeMode } from './features/iteration-gallery/EmbeddedPrototype';
import type { VisualReference } from './features/iteration-gallery/references';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { VersionTreePanel } from './features/version-tree/VersionTreePanel';
import { loadGraphState } from './features/version-tree/model';
import { captureTreeMode, loadTreePanels, panelBrowserStorage, panelReducer, saveTreePanels } from './features/version-tree/panel-state';
import { IterationGallery } from './features/iteration-gallery/IterationGallery';

import { buildGitCaptureHistory } from './features/version-tree/capture-history';
import type { GitHistory } from './features/version-tree/git-history';
import type { Capture, FrameRequest } from './features/iteration-gallery/model';
import { galleryTokens } from './features/iteration-gallery/tokens';
import { effectiveProgress, isSimulating, simulateCaptures, simulateGitHistory, simulatedCount } from './shared/work-state';
import { usePanelWorkState } from './shared/useWorkState';

import { versionPanelLayout } from './components/VersionPanelSwitch';

const MIN_PANEL = 280;
const KEY_STEP = 24;

function clampLeftWidth(width: number, total: number) {
  if (total <= MIN_PANEL * 2) return total / 2;
  return Math.max(MIN_PANEL, Math.min(total - MIN_PANEL, width));
}

export default function ReadingWorkspace({ onRuntimeChange, singlePanel = false, initialMode, galleryOnly = false, streamOnly = false, ideaOpen = false, externalPush, onOpenPush, onCloseIdeas, onToggle, expanded }: {singlePanel?:boolean; onRuntimeChange?:(mode:RuntimeMode|null)=>void; initialMode?: 'history' | 'test'; galleryOnly?: boolean; streamOnly?: boolean; ideaOpen?: boolean; externalPush?: FrameRequest | null; onOpenPush?: (version:number)=>void; onCloseIdeas?: () => void; onToggle?: () => void; expanded?: boolean}) {
  const singleStream = singlePanel && ideaOpen;
  const splitIdeas = ideaOpen && !singleStream;
  const [panels, dispatchPanel] = useReducer(panelReducer, undefined, () => { const saved = loadTreePanels(loadGraphState(), panelBrowserStorage()); return initialMode ? {...saved, mode:initialMode} : saved; });
  const captureMode = captureTreeMode(location.search);
  const mode = captureMode ?? panels.mode;
  const [playbackVersion, setPlaybackVersion] = useState<number | null>(null);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode | null>(null);
  const runtimeChanged = useCallback((mode: RuntimeMode | null) => { setRuntimeMode(mode); onRuntimeChange?.(mode); }, [onRuntimeChange]);
  const [pushRequest, setPushRequest] = useState<FrameRequest | null>(externalPush ?? null);
  useEffect(() => { if (externalPush) setPushRequest(externalPush); }, [externalPush]);
  const [historyReady, setHistoryReady] = useState(false);
  const [modeSwitchVisible, setModeSwitchVisible] = useState(false);
  useEffect(() => {
    function revealTestVisual(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 't' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setModeSwitchVisible(true);
      dispatchPanel({ type: 'switch', mode: 'test' });
    }
    window.addEventListener('keydown', revealTestVisual);
    return () => window.removeEventListener('keydown', revealTestVisual);
  }, []);
  const [historyError, setHistoryError] = useState('');
  const [historySource, setHistorySource] = useState<{ frames: Capture[]; git: GitHistory; references?: VisualReference[] } | null>(null);
  const work = usePanelWorkState();
  const shownCaptures = historySource ? simulatedCount(historySource.frames.length, effectiveProgress(work)) : 0;
  // The simulator replays history up to a capture count; Git commits follow the same cutoff.
  useEffect(() => {
    if (!historySource) return;
    const simulated = simulateCaptures(historySource.frames, shownCaptures);
    dispatchPanel({ type: 'history', graph: buildGitCaptureHistory(simulated.captures, simulateGitHistory(historySource.git, simulated.cutoff), historySource.references), follow: isSimulating(work) });
  }, [historySource, shownCaptures]);
  useEffect(() => {
    const abort = new AbortController();
    async function refresh() {
      try {
        const [response, gitResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}gallery/manifest.json`, { signal: abort.signal, cache: 'no-cache' }),
          fetch(`${import.meta.env.BASE_URL}gallery/git-history.json`, { signal: abort.signal, cache: 'no-cache' }),
        ]);
        if (!response.ok || !gitResponse.ok) throw new Error('Could not load captured history. Retrying automatically.');
        const catalog = await response.json() as { frames: Capture[]; references?: VisualReference[] };
        const git = await gitResponse.json() as GitHistory;
        if (!Array.isArray(catalog.frames)) throw new Error('The capture catalog is invalid.');
        if (!abort.signal.aborted) {
          setHistorySource({ frames: catalog.frames, git, references: catalog.references });
          setHistoryReady(true); setHistoryError('');
        }
      } catch (error) { if (!abort.signal.aborted) setHistoryError(error instanceof Error ? error.message : 'Could not load history.'); }
    }
    void refresh();
    const timer = setInterval(refresh, galleryTokens.refreshMs);
    return () => { abort.abort(); clearInterval(timer); };
  }, []);
  const workspace = useRef<HTMLElement>(null);
  useEffect(() => {
    const stream = workspace.current?.querySelector<HTMLElement>('.workspace-split > .tree-panel');
    if (stream) stream.inert = !!runtimeMode && !singleStream;
  }, [runtimeMode, singleStream]);
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!headerTarget) return;
    const update = () => workspace.current?.style.setProperty('--reader-header-height', `${headerTarget.offsetHeight}px`);
    const observer = new ResizeObserver(update);
    observer.observe(headerTarget); update();
    return () => observer.disconnect();
  }, [headerTarget]);
  const divider = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number | null>(null);
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const [activePanel, setActivePanel] = useState<'visualizer' | 'stream'>('visualizer');
  const [headerMinimums, setHeaderMinimums] = useState([versionPanelLayout.compactWidth / 2, versionPanelLayout.compactWidth / 2]);
  const proposedLeft = leftWidth ?? workspaceWidth / 2;
  const compact = workspaceWidth > 0 && (proposedLeft < headerMinimums[0] || workspaceWidth - proposedLeft < headerMinimums[1]);
  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const update = () => setHeaderMinimums(previous => {
      const headers = element.querySelectorAll<HTMLElement>('.workspace-split > section > .panel-header');
      const next = previous.map((width, index) => Number(headers[index]?.dataset.minHeaderWidth) || width);
      return next.every((width, index) => width === previous[index]) ? previous : next;
    });
    const observer = new MutationObserver(update);
    observer.observe(element, {subtree:true, attributes:true, attributeFilter:['data-min-header-width']});
    update();
    return () => observer.disconnect();
  }, []);
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
  }, [galleryOnly, streamOnly, singleStream]);

  const total = workspaceWidth;
  const percent = leftWidth === null || total === 0 ? 50 : Math.round((leftWidth / total) * 100);
  const minPercent = total <= MIN_PANEL * 2 ? 0 : Math.round((MIN_PANEL / total) * 100);
  const maxPercent = total <= MIN_PANEL * 2 ? 100 : Math.round(((total - MIN_PANEL) / total) * 100);

  return <main
    ref={workspace}
    className={`workspace${runtimeMode && !singleStream ? ' workspace-runtime-active' : ''}${galleryOnly ? ' workspace-gallery-only' : ''}${splitIdeas ? ' workspace-idea-split' : ''}${resizing ? ' is-resizing' : ''}${compact && !galleryOnly && !streamOnly && !ideaOpen ? ' workspace-compact' : ''}`}
    data-active-panel={activePanel}
    style={{ '--reading-column-min': `${MIN_PANEL}px`, '--panel-switch-ms': `${versionPanelLayout.transitionMs}ms`, '--split': leftWidth === null ? '50%' : `${leftWidth}px` } as CSSProperties}
  >
    {splitIdeas && <div className="shared-reader-header" ref={setHeaderTarget}/>}
    <div className="workspace-split" style={{ gridTemplateColumns: galleryOnly || streamOnly || singleStream ? 'minmax(0, 1fr)' : `minmax(0, ${runtimeMode ? '100%' : leftWidth === null ? '50%' : `${leftWidth}px`}) minmax(0, 1fr)` }}>
      {!streamOnly && !singleStream && <IterationGallery onRuntimeChange={runtimeChanged} onPlaybackVersion={setPlaybackVersion} headerTarget={splitIdeas ? headerTarget : null} playbackOnly={splitIdeas} onExitPlayback={onCloseIdeas} pushRequest={pushRequest} onToggle={onToggle} expanded={expanded} onSwitchPanel={!ideaOpen && !galleryOnly && compact ? () => setActivePanel('stream') : undefined}/>}
      {!galleryOnly && <VersionTreePanel playbackVersion={playbackVersion} embedded={splitIdeas} id={ideaOpen ? "workspace-pane-ideas" : undefined} title={ideaOpen || streamOnly ? 'Idea stream' : undefined} onSwitchPanel={!ideaOpen && !streamOnly && compact ? () => setActivePanel('visualizer') : undefined} key={`${mode}-${mode === 'history' && historyReady}`} graph={panels[mode]}
        status={mode === 'history' ? historyError || (!historyReady ? 'Reading capture history…' : !panels.history.nodes.length ? (isSimulating(work) ? 'No versions yet.' : 'No saved captures found.') : '') : ''}
        onOpenPush={version => { onOpenPush?.(version); setPushRequest({ version }); setActivePanel('visualizer'); }} mode={mode} modeSwitchVisible={modeSwitchVisible} onModeChange={mode => dispatchPanel({ type: 'switch', mode })}
        dispatch={action => dispatchPanel({ type: 'graph', mode, action })} />}
    </div>
    {!galleryOnly && !streamOnly && !singleStream && <div
      ref={divider}
      inert={!!runtimeMode}
      className={`panel-divider${resizing ? ' is-resizing' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      aria-valuemin={minPercent}
      aria-valuemax={maxPercent}
      aria-valuenow={percent}
      title="Drag to resize"
      tabIndex={0}
    />}
  </main>;
}
