import { useIdeaTodos } from './useIdeaTodos';
import { ZoomScaleButton } from '../../components/ZoomScaleButton';
import { VersionPanelSwitch } from '../../components/VersionPanelSwitch';
import { RowSelect } from '../../components/RowSelect';
import { AdaptivePanelTitle } from '../../components/AdaptivePanelTitle';
import { ResetViewButton } from '../../components/ResetViewButton';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent } from 'react';
import { BranchTag } from '../../components/BranchTag';
import { Icon } from '../../components/Icon';
import { branchTip, branchPathIds, canDeleteCurrent, canDeleteFuture, isBranchEndpoint, isReverted, isRevertedRoute, screenshotFocusId, screenshotQueryFlags, type GraphAction, type GraphState } from './model';
import { fitAllFrame, frameScreenshotTargets, frameVersionLevel, geometry, layoutBranchView, layoutGraph, screenshotNodeTargets } from './layout';
import { galleryTokens } from '../iteration-gallery/tokens';
import { activeRouteColor, ideaTheme, levelColorLookup, palerAccent, stationLabelOffset, treeTheme, versionLabelZoomScale } from './tokens';
import { commitBranchGap, layoutIdeaTimeline, mergedStemDots } from './git-layout';
import { IsometricGrid } from './IsometricGrid';
import { VersionCard } from './VersionCard';
import { branchName, isBranchDivergence, mergedBranchIds, presentTree } from './presentation';
import { canEditTree, treeModes, type TreeMode } from './panel-state';
import { IdeaCard } from './IdeaCard';
import { milestonesChangedEvent, currentIdeaWipId, ideaBranchColor, isFinishedIdeaVersion, navigableMilestones, saveMilestone, ideaStreamDefaults, milestoneStorageKey, milestoneNavigationIndex, parseMilestones, firstBranchLabels, projectIdeaStream, seedMilestones } from './idea-stream';

type Props = { embedded?:boolean; id?:string; title?:string; onSwitchPanel?:()=>void; onOpenPush?: (version: number) => void; status?: string; graph: GraphState; dispatch: Dispatch<GraphAction>; mode: TreeMode; modeSwitchVisible: boolean; onModeChange: (mode: TreeMode) => void };

function graphBounds(nodes: { x: number; y: number; title: string; labelWidth?:number }[], labelScale = 1) {
  const label = stationLabelOffset();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const node of nodes) {
    const cardTop = node.y + geometry.cardOffsetY;
    left = Math.min(left, node.x + label.x - (node.labelWidth ?? 360) * labelScale);
    right = Math.max(right, node.x + geometry.cardOffsetX + geometry.cardWidth);
    top = Math.min(top, cardTop);
    bottom = Math.max(bottom, cardTop + Math.min(commitBranchGap(node.title), geometry.cardHeight));
  }
  return { left, top, right, bottom };
}

/** Fit compensated labels as well as graph geometry at the resulting zoom. */
function fitGraphFrame(source: {id:string; x:number; y:number; title:string}[], element:HTMLElement, width:number, height:number, minZoom:number) {
  const labels = new Map(Array.from(element.querySelectorAll<HTMLElement>('[data-graph-label]'), label => [label.dataset.graphLabel!, label.offsetWidth]));
  const nodes = source.map(node => ({...node, labelWidth: labels.get(node.id) ?? 36}));
  let scale = 1;
  for (let i = 0; i < 8; i++) {
    const bounds = graphBounds(nodes, versionLabelZoomScale(scale));
    scale = fitAllFrame(bounds, width, height, minZoom).zoom;
  }
  const bounds = graphBounds(nodes, versionLabelZoomScale(scale));
  const shift = Math.max(0, -bounds.left + 48);
  const frame = fitAllFrame({...bounds, left: bounds.left + shift, right: bounds.right + shift}, width, height, minZoom);
  const baseShift = Math.max(0, -graphBounds(source).left + 48);
  return {...frame, inset: frame.inset + shift - baseShift};
}

const screenshotFlags = typeof window !== 'undefined'
  ? screenshotQueryFlags(window.location.search)
  : screenshotQueryFlags('');
const screenshotCapture = screenshotFlags.capture;
if (screenshotFlags.countHover) document.documentElement.dataset.screenshotCountHover = '1';

export function VersionTreePanel({ embedded = false, id, title = 'Idea stream', graph, dispatch, onSwitchPanel, onOpenPush, mode, modeSwitchVisible, onModeChange, status = '' }: Props) {
  const ideaMode = mode === 'history';
  const { todosByNode, toggleTodo } = useIdeaTodos(graph.nodes);
  const [savedMilestones, setSavedMilestones] = useState(() => {
    try { return parseMilestones(localStorage.getItem(milestoneStorageKey)); } catch { return {}; }
  });
  const milestones = useMemo(() => seedMilestones(graph.nodes, savedMilestones), [graph.nodes, savedMilestones]);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(() => new Set());
  const currentWipId = currentIdeaWipId(graph.nodes);
  const defaults = useMemo(() => ideaStreamDefaults(graph.nodes), [graph.nodes]);
  const [openCommand, setOpenCommand] = useState<string | null>(() => ideaMode ? ideaStreamDefaults(graph.nodes).commandId : null);
  const visibleIdeas = useMemo(() => new Set([...defaults.latestIds, ...todosByNode.keys(), ...(openCommand ? [openCommand] : [])]), [defaults, openCommand, todosByNode]);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const ideas = useMemo(() => projectIdeaStream(graph.nodes, milestones, expandedRuns, visibleIdeas), [graph.nodes, milestones, expandedRuns, visibleIdeas]);
  useEffect(() => {
    if (!ideaMode || status || !graph.nodes.length) return;
    try { localStorage.setItem(milestoneStorageKey, JSON.stringify(milestones)); window.dispatchEvent(new Event(milestonesChangedEvent)); } catch { /* Session editing remains available. */ }
  }, [ideaMode, milestones, graph.nodes.length, status]);
  useEffect(() => {
    function sync(event: StorageEvent) { if (event.key === milestoneStorageKey) setSavedMilestones(parseMilestones(event.newValue)); }
    function syncLocal() {
      const next = parseMilestones(localStorage.getItem(milestoneStorageKey));
      setSavedMilestones(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    }
    window.addEventListener('storage', sync);
    window.addEventListener(milestonesChangedEvent, syncLocal);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(milestonesChangedEvent, syncLocal); };
  }, []);
  const selectedDisplayId = ideaMode && graph.selectedId ? ideas.representative.get(graph.selectedId) ?? null : graph.selectedId;
  const activePath = useMemo(() => branchPathIds(graph.nodes, graph.activeBranchId), [graph.nodes, graph.activeBranchId]);
  const layout = useMemo(() => ideaMode ? layoutIdeaTimeline(ideas.nodes, node => (openCommand === node.id && isFinishedIdeaVersion(node) ? ideaTheme.openGap : ideas.folded.has(node.id) ? ideaTheme.foldedGap : milestones[node.id] ? ideaTheme.milestoneGap : ideaTheme.nodeGap) + (todosByNode.has(node.id) ? ideaTheme.todoListMaxHeight + ideaTheme.todoGap : 0)) : layoutBranchView(layoutGraph(graph.nodes), graph.selectedId, activePath), [graph.nodes, graph.selectedId, activePath, ideaMode, ideas, milestones, openCommand, todosByNode]);
  const branchLabels = useMemo(() => firstBranchLabels(graph.nodes, ideas.representative), [graph.nodes, ideas]);
  const boundsNodes = useMemo(() => [...layout.nodes, ...(layout.mergeOrigins ?? []).map(origin => ({ ...origin, title: '' }))], [layout]);
  const levelColor = useMemo(() => levelColorLookup([...layout.nodes, ...(layout.mergeOrigins ?? []).map(origin => ({ branchId: origin.branchId, row: 0 }))]), [layout]);
  const mergedBranches = useMemo(() => mergedBranchIds(graph.nodes), [graph.nodes]);
  const viewport = useRef<HTMLDivElement>(null);
  const branchMenu = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [fitInset, setFitInset] = useState(0);
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const zoomRef = useRef(zoom);
  const [grid, setGrid] = useState(true);
  const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(() => new Set());
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [overviewReady, setOverviewReady] = useState(false);
  const initialFit = useRef(false);
  const introEndpointZoom = useRef(false);
  const screenshotReady = useRef(false);
  const previousCount = useRef(graph.nodes.length);
  const focusId = screenshotFocusId(graph);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const selected = layout.nodes.find(node => node.id === selectedDisplayId);
  const presentation = useMemo(() => presentTree(layout, selectedDisplayId, collapsedLevels, graph.activeBranchId),
    [layout, selectedDisplayId, collapsedLevels, graph.activeBranchId]);
  const endpoints = presentation.endpoints;
  const jumperEndpointId = endpoints.find(node => node.branchId === presentation.selectedBranchId)?.id ?? endpoints[0]?.id;
  const navigationNodes = ideaMode ? navigableMilestones(layout.nodes, milestones) : endpoints;
  const jumperIndex = ideaMode ? milestoneNavigationIndex(graph.nodes, milestones, graph.selectedId)
    : Math.max(0, endpoints.findIndex(node => node.id === jumperEndpointId));
  const jumperEndpoint = navigationNodes[jumperIndex];
  const navigationLabel = ideaMode ? 'Milestone' : 'Endpoint';
  const branches = graph.nodes.some(node => node.git) ? [...new Set(graph.nodes.flatMap(node => node.git?.refs ?? []))].map(name => ({ branchId: name, name, endpoint: layout.nodes.find(node => node.git?.refs.includes(name))! })) : endpoints.map(endpoint => ({ branchId: endpoint.branchId, name: branchName(endpoint.branchId, graph.nodes), endpoint }));
  const activeBranchName = branchName(graph.activeBranchId, graph.nodes);

  useEffect(() => {
    if (!branchMenuOpen) return;
    function closeOnOutside(event: PointerEvent) {
      if (!branchMenu.current?.contains(event.target as Node)) setBranchMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setBranchMenuOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [branchMenuOpen]);

  function checkoutBranch(branchId: string) {
    setBranchMenuOpen(false);
    dispatch({ type: 'set-active-branch', branchId });
    const endpoint = branches.find(item => item.branchId === branchId)?.endpoint;
    if (endpoint) focusAtZoom(endpoint, 1);
  }

  function toggleLevel(id: string) {
    setCollapsedLevels(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function recentIdeaFrame(width: number, height: number) {
    const recent = layout.nodes.filter(node => defaults.latestIds.includes(node.id) || node.id === openCommand);
    const shift = Math.max(0, -graphBounds(boundsNodes).left + 48);
    return fitAllFrame({left:Math.min(...recent.map(n => n.x)) - geometry.stationLabelReserve + shift,
      right:Math.max(...recent.map(n => n.x)) + geometry.cardOffsetX + geometry.cardWidth + shift,
      top:Math.min(...recent.map(n => n.y)) - treeTheme.stationDiameter,
      bottom:Math.max(...recent.map(n => n.y + (n.id === openCommand && isFinishedIdeaVersion(n) ? ideaTheme.openGap : !isFinishedIdeaVersion(n) ? ideaTheme.nodeGap : treeTheme.stationDiameter)))}, width, height, ideaTheme.fitMinZoom);
  }

  function markScreenshotReady() {
    if (screenshotReady.current || !screenshotCapture || status) return;
    screenshotReady.current = true;
    document.documentElement.dataset.screenshotReady = '1';
  }

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewportSize({ width, height });
      if (!initialFit.current && width > 0) {
        initialFit.current = true;
        if (screenshotCapture) {
          if (ideaMode && screenshotFlags.treeMilestone && navigationNodes.length) {
            const milestone = navigationNodes.at(-1)!;
            dispatch({ type: 'select', id: milestone.id });
            focusAtZoom(milestone, screenshotFlags.treeZoom ?? 1, 'instant');
            requestAnimationFrame(() => requestAnimationFrame(markScreenshotReady));
            return;
          }
          if (screenshotFlags.treeFit) {
            const frame = fitGraphFrame(boundsNodes, element, width, height, ideaMode ? ideaTheme.fitMinZoom : treeTheme.minZoom);
            setFitInset(frame.inset);
            zoomRef.current = frame.zoom;
            setZoom(frame.zoom);
            requestAnimationFrame(() => {
              element.scrollTo({ left: frame.left, top: frame.top, behavior: 'instant' });
              requestAnimationFrame(markScreenshotReady);
            });
            return;
          }
          if (ideaMode && !screenshotFlags.treeCenter && !screenshotFlags.treeFrame && layout.nodes.length) {
            const frame = recentIdeaFrame(width, height);
            setFitInset(0);
            zoomRef.current = frame.zoom; setZoom(frame.zoom);
            requestAnimationFrame(() => { element.scrollTo({left:frame.left, top:frame.top, behavior:'instant'}); requestAnimationFrame(markScreenshotReady); });
            return;
          }
          const captureZoom = screenshotFlags.treeZoom ?? treeTheme.screenshotZoom;
          if (screenshotFlags.treeFrame === 'bottom') {
            zoomRef.current = captureZoom;
            setZoom(captureZoom);
            requestAnimationFrame(() => {
              const worldHeight = Math.max(layout.height + 240, height / captureZoom);
              const lift = screenshotFlags.treeLift ?? 0;
              element.scrollTo({ left: 0, top: Math.max(0, worldHeight * captureZoom - height * (1 + lift)), behavior: 'instant' });
              requestAnimationFrame(markScreenshotReady);
            });
          } else {
          const centered = screenshotFlags.treeCenter
            ? layout.nodes.filter(node => node.label.toLowerCase() === `v${screenshotFlags.treeCenter}`.toLowerCase())
            : [];
          const recentIdeas = ideaMode ? layout.nodes.filter(node => defaults.latestIds.includes(node.id) || node.id === openCommand) : [];
          const captureLayout = centered.length ? { ...layout, nodes: centered }
            : recentIdeas.length ? { ...layout, nodes: recentIdeas }
            : mode === 'history' ? { ...layout, nodes: layout.nodes.slice(-treeTheme.historyCaptureVersions) } : layout;
          const targets = screenshotNodeTargets(captureLayout, presentation.hiddenNodeIds, activePath, graph.selectedId);
          if (targets.length) {
            const frame = frameScreenshotTargets(targets, width, height, treeTheme.minZoom, captureZoom);
            zoomRef.current = frame.zoom;
            setZoom(frame.zoom);
            requestAnimationFrame(() => {
              element.scrollTo({ left: frame.left, top: frame.top, behavior: 'instant' });
              requestAnimationFrame(markScreenshotReady);
            });
          } else {
            requestAnimationFrame(() => requestAnimationFrame(markScreenshotReady));
          }
          }
        } else {
          const next = Math.max(treeTheme.screenshotZoom, Math.min(1, (width - 24) / layout.width));
          setZoom(next); zoomRef.current = next;
        }
      }
      if (!screenshotCapture && width > 0) setOverviewReady(true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [layout, screenshotCapture, presentation.hiddenNodeIds, activePath, graph.selectedId, graph.activeBranchId, graph.nodes]);

  useEffect(() => {
    if (!screenshotCapture) return;
    const timer = window.setTimeout(markScreenshotReady, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  function changeZoom(next: number, clientX?: number, clientY?: number) {
    setFitInset(0);
    const element = viewport.current;
    if (!element) return;
    const clamped = Math.max(treeTheme.minZoom, Math.min(treeTheme.maxZoom, next));
    const bounds = element.getBoundingClientRect();
    const x = clientX === undefined ? element.clientWidth / 2 : clientX - bounds.left;
    const y = clientY === undefined ? element.clientHeight / 2 : clientY - bounds.top;
    const worldX = (element.scrollLeft + x) / zoomRef.current - fitInset;
    const worldY = (element.scrollTop + y) / zoomRef.current;
    zoomRef.current = clamped;
    setZoom(clamped);
    requestAnimationFrame(() => {
      element.scrollLeft = worldX * clamped - x;
      element.scrollTop = worldY * clamped - y;
    });
  }

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      changeZoom(zoomRef.current * Math.exp(-event.deltaY * 0.008), event.clientX, event.clientY);
    }
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    if (screenshotCapture) {
      previousCount.current = graph.nodes.length;
      return;
    }
    if (graph.nodes.length > previousCount.current && selected) {
      const group = presentation.groups.find(level => level.nodeIds.includes(selected.id));
      const element = viewport.current;
      if (group && element) {
        const frame = frameVersionLevel(layout, group, element.clientWidth, zoomRef.current,
          treeTheme.minZoom, treeTheme.branchCountDiameter);
        zoomRef.current = frame.zoom;
        setZoom(frame.zoom);
        requestAnimationFrame(() => element.scrollTo({ left: frame.left, top: frame.top, behavior: 'instant' }));
      } else {
        requestAnimationFrame(() => viewport.current?.scrollTo({
          left: Math.max(0, (selected.x - 60) * zoomRef.current),
          top: Math.max(0, (selected.y - 80) * zoomRef.current),
          behavior: 'instant',
        }));
      }
    }
    previousCount.current = graph.nodes.length;
  }, [graph.nodes.length, selected, layout, presentation.groups]);

  function fitAll() {
    const element = viewport.current;
    if (!element) return;
    const frame = fitGraphFrame(boundsNodes, element, element.clientWidth, element.clientHeight, ideaMode ? ideaTheme.fitMinZoom : treeTheme.minZoom);
    setFitInset(frame.inset);
    zoomRef.current = frame.zoom;
    setZoom(frame.zoom);
    requestAnimationFrame(() => element.scrollTo({ left: frame.left, top: frame.top, behavior: 'smooth' }));
  }

  function focusAtZoom(node: { x: number; y: number }, nextZoom: number, behavior: ScrollBehavior = 'smooth') {
    setFitInset(0);
    const element = viewport.current;
    if (!element) return;
    const clamped = Math.max(treeTheme.minZoom, Math.min(treeTheme.maxZoom, nextZoom));
    zoomRef.current = clamped;
    setZoom(clamped);
    requestAnimationFrame(() => {
      const inset = ideaMode ? Math.max(40, Math.min(element.clientWidth / 3,
        element.clientWidth - (geometry.cardWidth + geometry.cardOffsetX + 20) * clamped)) : element.clientWidth / 3;
      element.scrollTo({
        left: Math.max(0, (node.x + (ideaMode ? worldShift : 0)) * clamped - inset),
        top: Math.max(0, node.y * clamped - element.clientHeight / 3),
        behavior,
      });
    });
  }

  function focusSelected() {
    if (!selected) return;
    focusAtZoom(selected, zoom);
  }

  useEffect(() => {
    function onGoToCommit(event: Event) {
      const version = (event as CustomEvent<{ version: number }>).detail?.version;
      const node = graph.nodes.find(item => item.label.toLowerCase() === `v${version}`);
      if (!node) return;
      dispatch({ type: 'select', id: node.id });
      const run = ideas.runs.find(run => run.nodeIds.includes(node.id));
      if (ideaMode && run) setExpandedRuns(current => new Set([...current, run.id]));
      setPendingFocus(node.id);
    }
    window.addEventListener('mitwerk-go-to-commit', onGoToCommit);
    return () => window.removeEventListener('mitwerk-go-to-commit', onGoToCommit);
  }, [graph.nodes, ideas.runs, ideaMode, dispatch]);

  useEffect(() => {
    const node = pendingFocus ? layout.nodes.find(node => node.id === pendingFocus) : undefined;
    if (!node) return;
    focusAtZoom(node, 1);
    setPendingFocus(null);
  }, [pendingFocus, layout]);

  function focusCurrentBranchEndpoint() {
    const tip = branchTip(graph.nodes, graph.activeBranchId);
    const endpoint = layout.nodes.find(node => node.id === (ideaMode && tip ? ideas.representative.get(tip.id) : tip?.id));
    if (!endpoint) return;
    setCollapsedLevels(new Set());
    goToEndpoint(endpoint);
  }

  function goToEndpoint(node: typeof jumperEndpoint) {
    if (!node) return;
    dispatch({ type: 'select', id: node.id });
    if (ideaMode) setOpenCommand(null);
    focusAtZoom(node, 1);
  }

  useEffect(() => {
    if (screenshotCapture || !overviewReady || introEndpointZoom.current) return;
    const endpoint = (ideaMode ? layout.nodes.find(node => node.id === defaults.commandId) ?? layout.nodes.at(-1) : undefined) ?? endpoints.find(node => node.branchId === graph.activeBranchId)
      ?? layout.nodes.find(node => node.branchId === graph.activeBranchId && isBranchEndpoint(graph.nodes, node.id));
    if (!endpoint) return;
    const timer = window.setTimeout(() => {
      if (introEndpointZoom.current) return;
      introEndpointZoom.current = true;
      if (ideaMode) dispatch({ type: 'select', id: endpoint.id });
      const element = viewport.current;
      if (ideaMode && element) {
        const frame = recentIdeaFrame(element.clientWidth, element.clientHeight);
        setFitInset(0);
        zoomRef.current = frame.zoom; setZoom(frame.zoom);
        requestAnimationFrame(() => element.scrollTo({left:frame.left, top:frame.top, behavior:'instant'}));
      } else focusAtZoom(endpoint, 1);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [overviewReady, screenshotCapture, graph.activeBranchId, layout.nodes]);

  function stepEndpoint(delta: number) {
    if (navigationNodes.length < 2) return;
    goToEndpoint(navigationNodes[(jumperIndex + delta + navigationNodes.length) % navigationNodes.length]);
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button, article')) return;
    const element = viewport.current!;
    drag.current = { x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop, moved: false };
    element.setPointerCapture(event.pointerId);
  }

  function pan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || !viewport.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (!drag.current.moved && dx * dx + dy * dy < 16) return;
    drag.current.moved = true;
    setIsPanning(true);
    viewport.current.scrollLeft = drag.current.left - dx;
    viewport.current.scrollTop = drag.current.top - dy;
  }

  function endPan() {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    if (start.moved) setIsPanning(false);
    else dispatch({ type: 'select', id: null });
  }
  const bounds = graphBounds(boundsNodes);
  const worldShift = Math.max(0, -bounds.left + 48);
  const worldWidth = Math.max(layout.width + 240, viewportSize.width / zoom) + worldShift + fitInset;
  const worldHeight = Math.max(layout.height + 240, viewportSize.height / zoom);

  const treeActions = <div className="panel-header-actions">
      <div className="zoom-controls">
        <button onClick={focusSelected} disabled={!selected} aria-label="Center selected version" title="Center selected version"><Icon name="locate" size={15}/></button>
      </div>
      <div className="zoom-controls endpoint-controls">
        <button onClick={() => stepEndpoint(-1)} disabled={navigationNodes.length < 2} aria-label={`Previous ${navigationLabel.toLowerCase()}`} title={`Previous ${navigationLabel.toLowerCase()}`}>
          <Icon name="arrow" style={{ transform: 'scaleX(-1)' }}/>
        </button>
        <button className="endpoint-jump" onClick={() => goToEndpoint(jumperEndpoint)} disabled={!jumperEndpoint}
          aria-label={`Jump to ${navigationLabel.toLowerCase()} ${jumperEndpoint ? jumperIndex + 1 : 0} of ${navigationNodes.length}`}
          title={`Jump to current ${navigationLabel.toLowerCase()}`}>
          {`${navigationLabel} ${jumperEndpoint ? jumperIndex + 1 : 0}/${navigationNodes.length}`}
        </button>
        <button onClick={() => stepEndpoint(1)} disabled={navigationNodes.length < 2} aria-label={`Next ${navigationLabel.toLowerCase()}`} title={`Next ${navigationLabel.toLowerCase()}`}>
          <Icon name="arrow"/>
        </button>
      </div>
    </div>;
  const treeHeader = <div className="panel-header tree-header"><div className="panel-heading"><AdaptivePanelTitle id="tree-title" full={title} short="Stream"/><VersionPanelSwitch onClick={onSwitchPanel} target="Version blocks"/>
      {modeSwitchVisible && <RowSelect label="Version stream panel" value={mode}
        options={treeModes.map(item => ({ value: item.id, label: item.label }))} onChange={value => onModeChange(value as TreeMode)}/>}
    </div>{!ideaMode && treeActions}</div>;
  return <section id={id} className="tree-panel" data-tree-mode={mode} aria-labelledby="tree-title" data-selected-branch={presentation.selectedBranchId || undefined} data-active-branch={graph.activeBranchId} style={{
    '--branch-label-size': `${treeTheme.branchLabelFontSize}px`,
    '--idea-action-fade': `${ideaTheme.actionFadeMs}ms`,
    '--idea-todo-max-height': `${ideaTheme.todoListMaxHeight}px`,
    '--idea-todo-gap': `${ideaTheme.todoGap}px`,
    '--milestone-font-size': `${ideaTheme.milestoneFontSize}px`,
    '--milestone-padding': `${ideaTheme.milestonePaddingBlock}px ${ideaTheme.milestonePaddingInline}px`,
    '--idea-fold-count-size': `${ideaTheme.foldCountSize}px`,
    '--card-hover-inset': `${treeTheme.cardHoverBorderInset}px`,
    '--card-hover-transition': `${treeTheme.cardHoverTransitionMs}ms`,
    '--node-card-width': `${geometry.cardWidth}px`,
    '--merge-origin-tag-gap': `${geometry.cardOffsetX}px`,
    '--station-size': `${treeTheme.stationDiameter}px`,
    '--milestone-size': `${ideaTheme.milestoneDiameter}px`,
    '--milestone-border-width': `${ideaTheme.milestoneBorderWidth}px`,
    '--milestone-border-color': ideaTheme.milestoneBorderColor,
    '--station-border-width': `${treeTheme.stationBorderWidth}px`,
    '--station-inner-size': `${treeTheme.stationInnerDiameter}px`,
    '--station-clearance': `${treeTheme.stationClearance}px`,
    '--station-selected-ring': `${treeTheme.stationSelectedBorderWidth}px`,
    '--branch-count-size': `${treeTheme.branchCountDiameter}px`,
    '--branch-count-font-size': `${treeTheme.branchCountFontSize}px`,
    '--count-hint-width': `${treeTheme.countHintWidth}px`,
    '--count-hint-height': `${treeTheme.countHintHeight}px`,
    '--count-hint-gap': `${treeTheme.countHintGap}px`,
    '--count-hint-fade': `${treeTheme.countHintFadeMs}ms`,
    '--station-fill': treeTheme.stationFill,
    '--station-open-fill': treeTheme.stationOpenFill,
    '--debug-border-color': treeTheme.debugBorderColor,
    '--debug-border-width': `${treeTheme.debugBorderWidth}px`,
    '--active-branch-color': treeTheme.activeBranchColor,
    '--version-label-size': `${treeTheme.versionLabelFontSize}px`,
    '--version-label-weight': treeTheme.versionLabelFontWeight,
    '--version-label-color': treeTheme.versionLabelColor,
    '--version-label-zoom': versionLabelZoomScale(zoom),
    '--station-center-x': `${-geometry.cardOffsetX}px`,
    '--station-center-y': `${-geometry.cardOffsetY}px`,
    '--station-offset-x': `${-geometry.cardOffsetX - treeTheme.stationRadius - 1}px`,
    '--station-offset-y': `${-geometry.cardOffsetY - treeTheme.stationRadius - 1}px`,
    '--line-added': galleryTokens.theater.addedColor,
    '--line-removed': galleryTokens.theater.removedColor,
    '--reverted-title-color': treeTheme.revertedTitleColor,
    '--reverted-route-color': treeTheme.revertedRouteColor,
    '--merged-branch-opacity': treeTheme.mergedBranchOpacity,
  } as CSSProperties}>
    {embedded ? <h2 id="tree-title" className="sr-only">{title}</h2> : treeHeader}
    {status ? <p className="tree-history-message" role="status">{status}</p> : <><div className="canvas-shell">
      <div ref={viewport} className={`tree-viewport ${isPanning ? 'is-panning' : ''}`} tabIndex={0} aria-label="Version tree canvas. Scroll in any direction to pan. Control plus scroll to zoom. Click empty canvas to deselect." onPointerDown={startPan} onPointerMove={pan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}>
        <div className="canvas-size" style={{ width: (worldWidth + worldShift + fitInset) * zoom, height: worldHeight * zoom }}>
          <div className="canvas-world" style={{ width: worldWidth, height: worldHeight, transform: `scale(${zoom}) translate(${worldShift + fitInset}px, 0)` }}>
            <svg className="route-layer" width={worldWidth} height={worldHeight} style={{ overflow: 'visible' }} aria-hidden="true">
              <IsometricGrid x={-(worldShift + fitInset)} width={worldWidth + worldShift + fitInset} height={worldHeight} visible={ideaMode || grid}/>
              {/* Paint clearance first so connected segments do not erase each other's junctions. */}
              {presentation.routes.filter(route => !route.dashed).map(route => <path key={`clearance:${route.id}`} d={route.path} fill="none" stroke="var(--canvas-bg)" strokeWidth={treeTheme.routeWidth + treeTheme.routeClearance * 2} strokeLinejoin="round" strokeLinecap="round"/>)}
              {/* Routes arrive pre-sorted: later versions, Vx.1, then the checked-out branch on top. */}
              {presentation.routes.map(route => {
                const routeReverted = isRevertedRoute(graph.revertedIds, route.targetId);
                const routeMerged = mergedBranches.has(route.branchId);
                const routeRow = layout.nodes.find(node => node.id === route.targetId)?.row ?? layout.forks?.find(fork => fork.id === route.targetId)?.row ?? 0;
                const stroke = ideaMode ? ideaBranchColor(route.branchId, levelColor(route.branchId, routeRow)) : route.kind === 'horizontal-branch' ? treeTheme.levelConnectorColor
                  : routeReverted ? treeTheme.revertedRouteColor
                  : routeMerged ? palerAccent(levelColor(route.branchId, routeRow))
                  : route.spine ? 'var(--active-branch-color)'
                  : levelColor(route.branchId, routeRow);
                const from = layout.nodes.find(node => node.id === route.sourceId);
                const to = layout.nodes.find(node => node.id === route.targetId);
                const dots = route.dashed && from && to ? mergedStemDots(from.y, to.y) : [];
                const dot = treeTheme.mergedStemDotSize;
                return <g key={route.id} className="route" data-route-kind={route.kind} data-active={route.active} data-spine={route.spine || undefined} data-reverted={routeReverted || undefined} data-merged={routeMerged || undefined} data-dashed={route.dashed || undefined}
                  opacity={ideaMode ? 1 : route.kind === 'horizontal-branch' ? treeTheme.levelConnectorOpacity : routeReverted ? treeTheme.revertedRouteOpacity : routeMerged ? treeTheme.mergedBranchOpacity : 1}>
                  {route.id.startsWith('chronology:') && <title>Chronological sequence · not a Git parent</title>}
                  {route.id.startsWith('chronology:') ? <path d={route.path} fill="none" stroke={stroke} strokeWidth={treeTheme.chronologyWidth} strokeDasharray={`${treeTheme.chronologyDash} ${treeTheme.chronologyDash}`} /> : route.dashed && from ? dots.map(y => <rect key={y} x={from.x - dot / 2} y={y - dot / 2} width={dot} height={dot} fill={stroke}/>) : <>
                  <path d={route.path} fill="none" stroke={stroke} strokeWidth={treeTheme.routeWidth} strokeLinejoin="round" strokeLinecap="round"/>
                  <path d={route.path} fill="none" stroke={treeTheme.routeStripeColor} strokeWidth={treeTheme.routeStripeWidth} opacity={treeTheme.routeStripeOpacity} strokeLinejoin="round" strokeLinecap="round"/>
                  </>}
                </g>;
              })}
              {presentation.tip && <path data-branch-end={presentation.tip.id} fill={isReverted(graph.revertedIds, presentation.tip.id) ? treeTheme.revertedRouteColor : treeTheme.stationFill}
                d={`M ${presentation.tip.x} ${presentation.tip.y + treeTheme.stationRadius + treeTheme.endpointTriangleGap}
                  l ${treeTheme.endpointTriangleWidth / 2} ${treeTheme.endpointTriangleHeight}
                  h ${-treeTheme.endpointTriangleWidth} Z`}/>}
            </svg>
            {presentation.groups.map(group => <button key={group.id} className="branch-count"
              style={{ left: group.x, top: group.y }}
              aria-label={`${collapsedLevels.has(group.id) ? 'Expand' : 'Collapse'} ${group.nodeIds.length} versions at ${group.label}`}
              aria-expanded={!collapsedLevels.has(group.id)} onClick={() => toggleLevel(group.id)}>
              {group.nodeIds.length}
              <span className="branch-count-hint" aria-hidden="true"><Icon name="caret" size={treeTheme.countHintWidth}/></span>
            </button>)}
            {(layout.origins ?? []).map(origin => {
              const fork = layout.forks?.find(item => item.id === origin.forkId);
              const onSpine = fork?.nodeIds.some(id => activePath.has(id)) ?? false;
              return <div key={origin.id} className="station has-descendants origin-station"
                style={{ left: origin.x, top: origin.y, '--route-color': activeRouteColor(levelColor(fork?.branchId ?? graph.activeBranchId, 0), onSpine) } as CSSProperties}
                role="img" aria-label="Starting point">
                <span />
              </div>;
            })}
            {(layout.mergeOrigins ?? []).map(origin => {
              const color = levelColor(origin.branchId, 0);
              return <div key={origin.id} className="merge-origin" style={{ left: origin.x, top: origin.y, '--route-color': color } as CSSProperties}>
                <div className="station has-descendants origin-station" role="img" aria-label={`Incoming branch ${origin.branchId}`}><span /></div>
                {(!ideaMode || branchLabels.get(origin.branchId) === origin.id) && <div className="merge-origin-tag" data-graph-label={origin.id}><BranchTag name={origin.branchId} color={color}/></div>}
              </div>;
            })}
            {layout.nodes.filter(node => !presentation.hiddenNodeIds.has(node.id)).map(node => {
              const cardOffsetY = presentation.cardBelowRows.has(node.row) ? geometry.horizontalCardOffsetY : geometry.cardOffsetY;
              const onSpine = activePath.has(node.id);
              const reverted = isReverted(graph.revertedIds, node.id);
              const merged = mergedBranches.has(node.branchId);
              const color = ideaMode ? ideaBranchColor(node.branchId, levelColor(node.branchId, node.row)) : merged ? palerAccent(levelColor(node.branchId, node.row)) : activeRouteColor(levelColor(node.branchId, node.row), onSpine);
              const label = stationLabelOffset();
              const folded = ideaMode ? ideas.folded.get(node.id) : undefined;
              if (folded) return <button key={node.id} className="idea-fold" style={{ left: node.x, top: node.y }}
                aria-label={`Expand ${folded.nodeIds.length} versions, ${folded.firstLabel} through ${folded.lastLabel}`} aria-expanded={false}
                onClick={() => setExpandedRuns(current => new Set([...current, folded.id]))}>
                {branchLabels.get(node.branchId) === node.id && <span className="station-label" data-graph-label={node.id} style={{left: ideaTheme.foldCountSize / 2 + label.x, top: ideaTheme.foldCountSize / 2 + label.y}}><BranchTag name={node.branchId} color={color}/></span>}<span className="idea-fold-count"><span>{folded.nodeIds.length}</span></span><span className="idea-fold-label">versions</span>
              </button>;
              const commitCard = <VersionCard ideaMode={ideaMode} onOpenPush={onOpenPush} hideStation={ideaMode} node={node} selected={ideaMode || node.id === graph.selectedId}
                  hasDescendants={presentation.nodesWithChildren.has(node.id)}
                  isEndpoint={isBranchEndpoint(graph.nodes, node.id)} onActivePath={onSpine}
                  isCurrentBranch={node.branchId === graph.activeBranchId}
                  canDeleteCurrent={canDeleteCurrent(graph.nodes, node.id)}
                  canDeleteFuture={canDeleteFuture(graph.nodes, node.id)}
                  color={color} reverted={reverted} merged={merged} readOnly={!canEditTree(mode)}
                  onSelect={() => dispatch({ type: 'select', id: node.id })}
                  onBranch={() => dispatch({ type: 'add-branch', sourceId: node.id })}
                  onCommit={() => dispatch({ type: 'add-commit', sourceId: node.id })}
                  onRevert={() => dispatch({ type: 'revert', sourceId: node.id })}
                  onRestore={() => dispatch({ type: 'restore', sourceId: node.id })}
                  onSwitchBranch={() => dispatch({ type: 'set-active-branch', branchId: node.branchId })}
                  onDeleteCurrent={() => dispatch({ type: 'delete-current', sourceId: node.id })}
                  onDeleteFuture={() => dispatch({ type: 'delete-future', sourceId: node.id })}
                  forceMenuOpen={screenshotFlags.menuOpen && node.id === focusId}
                  onDisconnected={() => setToast("Project isn't connected")}/>;
              return <div className="version-position" key={node.id} style={{
                left: node.x + geometry.cardOffsetX, top: node.y + cardOffsetY,
                '--station-center-y': `${-cardOffsetY}px`,
                '--station-offset-y': `${-cardOffsetY - treeTheme.stationRadius - 1}px`,
                '--route-color': color,
                zIndex: node.id === graph.selectedId ? 3 : 2,
              } as CSSProperties}>
                <span className="station-label" data-graph-label={node.id} style={{
                  left: -geometry.cardOffsetX + label.x,
                  top: -cardOffsetY + label.y,
                }}>{(ideaMode ? branchLabels.get(node.branchId) === node.id : isBranchDivergence(node, graph.nodes)) && <BranchTag name={node.branchId} color={color}/>}<span className="version-header">{node.label.toLowerCase()}</span></span>
                {ideaMode ? <IdeaCard onToggleTodo={toggleTodo} todos={todosByNode.get(node.id) ?? []} currentWip={node.id === currentWipId} node={node} milestone={milestones[node.id] ?? ''} open={openCommand === node.id} color={color}
                  hasDescendants={presentation.nodesWithChildren.has(node.id)}
                  onSelect={() => { setOpenCommand(current => current === node.id ? null : node.id); dispatch({ type: 'select', id: node.id }); if (node.capture?.pushed) onOpenPush?.(node.capture.version); }}
                  onSave={text => setSavedMilestones(saveMilestone(milestones, node, text))}>{commitCard}</IdeaCard>
                : commitCard}
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
      <footer className={`canvas-controls${ideaMode || embedded ? ' has-navigation' : ''}`} aria-label="Idea stream view controls">
        {(ideaMode || embedded) && <div className="idea-footer-navigation" role="group" aria-label="Idea stream navigation">{embedded && modeSwitchVisible && <RowSelect label="Version stream panel" value={mode} options={treeModes.map(item => ({value:item.id,label:item.label}))} onChange={value => onModeChange(value as TreeMode)}/>} {treeActions}</div>}
        {!ideaMode && <div ref={branchMenu} className="branch-controls header-branch-controls" data-header-fill>
          <button className="branch-current" data-header-fill-content onClick={() => setBranchMenuOpen(open => !open)}
            aria-haspopup="menu" aria-expanded={branchMenuOpen} aria-label={`Active branch ${activeBranchName}. Switch branch`}
            title="Switch branch">
            <span className="header-fill-label"><Icon name="branch" size={13}/>{activeBranchName}</span><Icon name="chevron" size={12} style={{ transform: branchMenuOpen ? 'rotate(-90deg)' : 'rotate(90deg)' }}/>
          </button>
          {branchMenuOpen && <ul className="branch-menu" role="menu" aria-label="Branches">
            {branches.map(branch => <li key={branch.branchId} role="none">
              <button role="menuitemradio" aria-checked={branch.branchId === graph.activeBranchId}
                onClick={() => checkoutBranch(branch.branchId)}>
                <span className="branch-menu-name">
                  <Icon name="check" size={11} style={{ visibility: branch.branchId === graph.activeBranchId ? 'visible' : 'hidden' }}/>
                  {branch.name}
                </span>
                <small>{branch.endpoint.label}</small>
              </button>
            </li>)}
          </ul>}
        </div>}
        <div className="panel-header-actions">
          {ideaMode && expandedRuns.size > 0 && <button className="icon-button" onClick={() => { setExpandedRuns(new Set()); setOpenCommand(null); }} title="Fold versions without milestones">Fold</button>}
          {!ideaMode && <button className="icon-button tree-grid-toggle" onClick={() => setGrid(!grid)} aria-label="Grid" aria-pressed={grid} title={grid ? 'Hide grid' : 'Show grid'}>
            <i className={grid ? 'ph ph-eye-closed' : 'ph ph-eye'} aria-hidden="true"/>Grid
          </button>}
          <button className="icon-button" onClick={() => changeZoom(zoom - treeTheme.zoomStep)} disabled={zoom <= treeTheme.minZoom} aria-label="Zoom out"><Icon name="minus"/></button>
          <ZoomScaleButton zoom={zoom} label="Reset Idea stream zoom" onResetZoom={() => changeZoom(1)} onResetView={fitAll}/>
          <button className="icon-button" onClick={() => changeZoom(zoom + treeTheme.zoomStep)} disabled={zoom >= treeTheme.maxZoom} aria-label="Zoom in"><Icon name="plus"/></button>
          {!ideaMode && <div className="album-camera-actions"><ResetViewButton label="Fit all versions" centerLabel="center current branch endpoint" onReset={fitAll} onCenter={focusCurrentBranchEndpoint}/></div>}
        </div>
      </footer>
    </>
    }
    <div className="sr-only" role="status" aria-live="polite">{graph.nodes.length} versions. {selected ? `Selected ${selected.label}.` : 'No version selected.'}</div>
    {toast && <div className="project-toast" role="status">{toast}</div>}
  </section>;
}
