import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent } from 'react';
import { BranchTag } from '../../components/BranchTag';
import { Icon } from '../../components/Icon';
import { branchPathIds, canDeleteCurrent, canDeleteFuture, isBranchEndpoint, isReverted, isRevertedRoute, screenshotFocusId, screenshotQueryFlags, type GraphAction, type GraphState } from './model';
import { fitAllFrame, frameScreenshotTargets, frameVersionLevel, geometry, layoutBranchView, layoutGraph, screenshotNodeTargets } from './layout';
import { galleryTokens } from '../iteration-gallery/tokens';
import { activeRouteColor, levelColorLookup, palerAccent, stationLabelOffset, treeTheme, versionLabelZoomScale } from './tokens';
import { commitBranchGap, layoutGitHistory, mergedStemDots } from './git-layout';
import { IsometricGrid } from './IsometricGrid';
import { VersionCard } from './VersionCard';
import { branchName, isBranchDivergence, mergedBranchIds, presentTree } from './presentation';
import { canEditTree, treeModes, type TreeMode } from './panel-state';

type Props = { status?: string; graph: GraphState; dispatch: Dispatch<GraphAction>; mode: TreeMode; modeSwitchVisible: boolean; onModeChange: (mode: TreeMode) => void };

function graphBounds(nodes: { x: number; y: number; title: string }[]) {
  const label = stationLabelOffset();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const node of nodes) {
    const cardTop = node.y + geometry.cardOffsetY;
    left = Math.min(left, node.x + label.x - 360);
    right = Math.max(right, node.x + geometry.cardOffsetX + geometry.cardWidth);
    top = Math.min(top, cardTop);
    bottom = Math.max(bottom, cardTop + Math.min(commitBranchGap(node.title), geometry.cardHeight));
  }
  return { left, top, right, bottom };
}

const screenshotFlags = typeof window !== 'undefined'
  ? screenshotQueryFlags(window.location.search)
  : screenshotQueryFlags('');
const screenshotCapture = screenshotFlags.capture;
if (screenshotFlags.countHover) document.documentElement.dataset.screenshotCountHover = '1';

export function VersionTreePanel({ graph, dispatch, mode, modeSwitchVisible, onModeChange, status = '' }: Props) {
  const activePath = useMemo(() => branchPathIds(graph.nodes, graph.activeBranchId), [graph.nodes, graph.activeBranchId]);
  const layout = useMemo(() => mode === 'history' && graph.nodes.some(node => node.git) ? layoutGitHistory(graph.nodes) : layoutBranchView(layoutGraph(graph.nodes), graph.selectedId, activePath), [graph.nodes, graph.selectedId, activePath, mode]);
  const levelColor = useMemo(() => levelColorLookup(layout.nodes), [layout.nodes]);
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
  const selected = layout.nodes.find(node => node.id === graph.selectedId);
  const presentation = useMemo(() => presentTree(layout, graph.selectedId, collapsedLevels, graph.activeBranchId),
    [layout, graph.selectedId, collapsedLevels, graph.activeBranchId]);
  const endpoints = presentation.endpoints;
  const jumperEndpointId = endpoints.find(node => node.branchId === presentation.selectedBranchId)?.id ?? endpoints[0]?.id;
  const jumperIndex = Math.max(0, endpoints.findIndex(node => node.id === jumperEndpointId));
  const jumperEndpoint = endpoints[jumperIndex];
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
          if (screenshotFlags.treeFit) {
            const raw = graphBounds(layout.nodes);
            const frame = fitAllFrame({ ...raw, left: raw.left + Math.max(0, -raw.left + 48) }, width, height, treeTheme.minZoom);
            setFitInset(frame.inset);
            zoomRef.current = frame.zoom;
            setZoom(frame.zoom);
            requestAnimationFrame(() => {
              element.scrollTo({ left: frame.left, top: frame.top, behavior: 'instant' });
              requestAnimationFrame(markScreenshotReady);
            });
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
          const captureLayout = centered.length ? { ...layout, nodes: centered }
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
    const worldX = (element.scrollLeft + x) / zoomRef.current;
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
    const frame = fitAllFrame({ ...graphBounds(layout.nodes), left: graphBounds(layout.nodes).left + worldShift }, element.clientWidth, element.clientHeight, treeTheme.minZoom);
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
      element.scrollTo({
        left: Math.max(0, node.x * clamped - element.clientWidth / 3),
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
      const node = layout.nodes.find(item => item.label.toLowerCase() === `v${version}`);
      if (!node) return;
      dispatch({ type: 'select', id: node.id });
      focusAtZoom(node, 1);
    }
    window.addEventListener('mitwerk-go-to-commit', onGoToCommit);
    return () => window.removeEventListener('mitwerk-go-to-commit', onGoToCommit);
  }, [layout.nodes, dispatch]);

  function goToEndpoint(node: typeof jumperEndpoint) {
    if (!node) return;
    dispatch({ type: 'select', id: node.id });
    focusAtZoom(node, 1);
  }

  useEffect(() => {
    if (screenshotCapture || !overviewReady || introEndpointZoom.current) return;
    const endpoint = endpoints.find(node => node.branchId === graph.activeBranchId)
      ?? layout.nodes.find(node => node.branchId === graph.activeBranchId && isBranchEndpoint(graph.nodes, node.id));
    if (!endpoint) return;
    const timer = window.setTimeout(() => {
      if (introEndpointZoom.current) return;
      introEndpointZoom.current = true;
      focusAtZoom(endpoint, 1);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [overviewReady, screenshotCapture, graph.activeBranchId, layout.nodes]);

  function stepEndpoint(delta: number) {
    if (endpoints.length < 2) return;
    goToEndpoint(endpoints[(jumperIndex + delta + endpoints.length) % endpoints.length]);
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
  const bounds = graphBounds(layout.nodes);
  const worldShift = Math.max(0, -bounds.left + 48);
  const worldWidth = Math.max(layout.width + 240, viewportSize.width / zoom) + worldShift + fitInset;
  const worldHeight = Math.max(layout.height + 240, viewportSize.height / zoom);

  return <section className="tree-panel" data-tree-mode={mode} aria-labelledby="tree-title" data-selected-branch={presentation.selectedBranchId || undefined} data-active-branch={graph.activeBranchId} style={{
    '--node-card-width': `${geometry.cardWidth}px`,
    '--station-size': `${treeTheme.stationDiameter}px`,
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
    '--station-offset-x': `${-geometry.cardOffsetX - treeTheme.stationRadius - 1}px`,
    '--station-offset-y': `${-geometry.cardOffsetY - treeTheme.stationRadius - 1}px`,
    '--line-added': galleryTokens.theater.addedColor,
    '--line-removed': galleryTokens.theater.removedColor,
    '--reverted-title-color': treeTheme.revertedTitleColor,
    '--reverted-route-color': treeTheme.revertedRouteColor,
    '--merged-branch-opacity': treeTheme.mergedBranchOpacity,
  } as CSSProperties}>
    <div className="panel-header tree-header"><div className="panel-heading"><h2 id="tree-title">Version stream</h2>
      {modeSwitchVisible && <select className="tree-mode-switch" aria-label="Version stream panel" value={mode} onChange={event => onModeChange(event.target.value as TreeMode)}
        title={mode === 'test' ? 'Independent sandbox. Edits stay in Test visual.' : 'History from saved screenshot captures, linked by Git parents and branch history. Editing is disabled.'}>
        {treeModes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>}
    </div><div className="panel-header-actions"><button className="icon-button" onClick={() => setGrid(!grid)} aria-label={grid ? 'Hide grid' : 'Show grid'} title={grid ? 'Hide grid' : 'Show grid'}><Icon name="grid"/>{grid ? 'Hide grid' : 'Show grid'}</button><button className="icon-button" onClick={fitAll} aria-label="Fit all versions" title="Fit all versions"><Icon name="expand"/>Fit all</button></div></div>
    {status ? <p className="tree-history-message" role="status">{status}</p> : <div className="canvas-shell">
      <div ref={viewport} className={`tree-viewport ${isPanning ? 'is-panning' : ''}`} tabIndex={0} aria-label="Version tree canvas. Scroll in any direction to pan. Control plus scroll to zoom. Click empty canvas to deselect." onPointerDown={startPan} onPointerMove={pan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}>
        <div className="canvas-size" style={{ width: (worldWidth + worldShift + fitInset) * zoom, height: worldHeight * zoom }}>
          <div className="canvas-world" style={{ width: worldWidth, height: worldHeight, transform: `scale(${zoom}) translate(${worldShift + fitInset}px, 0)` }}>
            <svg className="route-layer" width={worldWidth} height={worldHeight} style={{ overflow: 'visible' }} aria-hidden="true">
              <IsometricGrid x={-(worldShift + fitInset)} width={worldWidth + worldShift + fitInset} height={worldHeight} visible={grid}/>
              {/* Paint clearance first so connected segments do not erase each other's junctions. */}
              {presentation.routes.filter(route => !route.dashed).map(route => <path key={`clearance:${route.id}`} d={route.path} fill="none" stroke="var(--canvas-bg)" strokeWidth={treeTheme.routeWidth + treeTheme.routeClearance * 2} strokeLinejoin="round" strokeLinecap="round"/>)}
              {/* Routes arrive pre-sorted: later versions, Vx.1, then the checked-out branch on top. */}
              {presentation.routes.map(route => {
                const routeReverted = isRevertedRoute(graph.revertedIds, route.targetId);
                const routeMerged = mergedBranches.has(route.branchId);
                const routeRow = layout.nodes.find(node => node.id === route.targetId)?.row ?? layout.forks?.find(fork => fork.id === route.targetId)?.row ?? 0;
                const stroke = route.kind === 'horizontal-branch' ? treeTheme.levelConnectorColor
                  : routeReverted ? treeTheme.revertedRouteColor
                  : routeMerged ? palerAccent(levelColor(route.branchId, routeRow))
                  : route.spine ? 'var(--active-branch-color)'
                  : levelColor(route.branchId, routeRow);
                const from = layout.nodes.find(node => node.id === route.sourceId);
                const to = layout.nodes.find(node => node.id === route.targetId);
                const dots = route.dashed && from && to ? mergedStemDots(from.y, to.y) : [];
                const dot = treeTheme.mergedStemDotSize;
                return <g key={route.id} className="route" data-route-kind={route.kind} data-active={route.active} data-spine={route.spine || undefined} data-reverted={routeReverted || undefined} data-merged={routeMerged || undefined} data-dashed={route.dashed || undefined}
                  opacity={route.kind === 'horizontal-branch' ? treeTheme.levelConnectorOpacity : routeReverted ? treeTheme.revertedRouteOpacity : routeMerged ? treeTheme.mergedBranchOpacity : 1}>
                  {route.dashed && from ? dots.map(y => <rect key={y} x={from.x - dot / 2} y={y - dot / 2} width={dot} height={dot} fill={stroke}/>) : <>
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
            {layout.nodes.filter(node => !presentation.hiddenNodeIds.has(node.id)).map(node => {
              const cardOffsetY = presentation.cardBelowRows.has(node.row) ? geometry.horizontalCardOffsetY : geometry.cardOffsetY;
              const onSpine = activePath.has(node.id);
              const reverted = isReverted(graph.revertedIds, node.id);
              const merged = mergedBranches.has(node.branchId);
              const color = merged ? palerAccent(levelColor(node.branchId, node.row)) : activeRouteColor(levelColor(node.branchId, node.row), onSpine);
              const label = stationLabelOffset();
              return <div className="version-position" key={node.id} style={{
                left: node.x + geometry.cardOffsetX, top: node.y + cardOffsetY,
                '--station-offset-y': `${-cardOffsetY - treeTheme.stationRadius - 1}px`,
                '--route-color': color,
                zIndex: node.id === graph.selectedId ? 3 : 2,
              } as CSSProperties}>
                <span className="station-label" style={{
                  left: -geometry.cardOffsetX + label.x,
                  top: -cardOffsetY + label.y,
                }}>{isBranchDivergence(node, graph.nodes) && <BranchTag name={node.branchId} color={color}/>}<span className="version-header">{node.label.toLowerCase()}</span></span>
                <VersionCard node={node} selected={node.id === graph.selectedId}
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
                  onDisconnected={() => setToast("Project isn't connected")}/>
              </div>;
            })}
          </div>
        </div>
      </div>
      <div className="canvas-controls">
        <div className="zoom-controls">
          <button onClick={focusSelected} disabled={!selected} aria-label="Center selected version" title="Center selected version"><Icon name="locate" size={15}/></button>
          <span className="control-divider"/>
          <button onClick={() => changeZoom(zoom - treeTheme.zoomStep)} disabled={zoom <= treeTheme.minZoom} aria-label="Zoom out"><Icon name="minus" size={14}/></button>
          <button className="zoom-value" onClick={() => changeZoom(1)} aria-label="Reset zoom to 100 percent">{Math.round(zoom * 100)}%</button>
          <button onClick={() => changeZoom(zoom + treeTheme.zoomStep)} disabled={zoom >= treeTheme.maxZoom} aria-label="Zoom in"><Icon name="plus" size={14}/></button>
        </div>
        <div ref={branchMenu} className="zoom-controls branch-controls">
          <button className="branch-current" onClick={() => setBranchMenuOpen(open => !open)}
            aria-haspopup="menu" aria-expanded={branchMenuOpen} aria-label={`Active branch ${activeBranchName}. Switch branch`}
            title="Switch branch">
            <Icon name="branch" size={13}/>{activeBranchName}<Icon name="chevron" size={10} style={{ transform: branchMenuOpen ? 'rotate(-90deg)' : 'rotate(90deg)' }}/>
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
        </div>
        <div className="zoom-controls endpoint-controls">
          <button onClick={() => stepEndpoint(-1)} disabled={endpoints.length < 2} aria-label="Previous endpoint" title="Previous endpoint">
            <Icon name="arrow" size={14} style={{ transform: 'scaleX(-1)' }}/>
          </button>
          <button className="endpoint-jump" onClick={() => goToEndpoint(jumperEndpoint)} disabled={!jumperEndpoint}
            aria-label={jumperEndpoint ? `Jump to endpoint ${jumperIndex + 1} of ${endpoints.length}` : 'Jump to current endpoint'}
            title="Jump to current endpoint">
            {jumperEndpoint ? `Endpoint ${jumperIndex + 1}/${endpoints.length}` : 'Jump to current endpoint'}
          </button>
          <button onClick={() => stepEndpoint(1)} disabled={endpoints.length < 2} aria-label="Next endpoint" title="Next endpoint">
            <Icon name="arrow" size={14}/>
          </button>
        </div>
      </div>
    </div>
    }
    <div className="sr-only" role="status" aria-live="polite">{graph.nodes.length} versions. {selected ? `Selected ${selected.label}.` : 'No version selected.'}</div>
    {toast && <div className="project-toast" role="status">{toast}</div>}
  </section>;
}
