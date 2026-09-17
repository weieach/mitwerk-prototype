import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from '../../components/Icon';
import { branchPathIds, canDeleteCurrent, canDeleteFuture, screenshotFocusId, type GraphAction, type GraphState } from './model';
import { frameScreenshotTargets, frameVersionLevel, geometry, layoutBranchView, layoutGraph } from './layout';
import { activeRouteColor, levelColorLookup, stationLabelOffset, treeTheme } from './tokens';
import { IsometricGrid } from './IsometricGrid';
import { VersionCard } from './VersionCard';
import { branchName, presentTree } from './presentation';

type Props = { graph: GraphState; dispatch: Dispatch<GraphAction> };

const screenshotCapture = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('screenshot') === '1';
if (screenshotCapture) document.documentElement.dataset.screenshotInteract = '1';

export function VersionTreePanel({ graph, dispatch }: Props) {
  const activePath = useMemo(() => branchPathIds(graph.nodes, graph.activeBranchId), [graph.nodes, graph.activeBranchId]);
  const layout = useMemo(() => layoutBranchView(layoutGraph(graph.nodes), graph.selectedId, activePath), [graph.nodes, graph.selectedId, activePath]);
  const levelColor = useMemo(() => levelColorLookup(layout.nodes), [layout.nodes]);
  const viewport = useRef<HTMLDivElement>(null);
  const branchMenu = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const zoomRef = useRef(zoom);
  const [grid, setGrid] = useState(true);
  const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(() => new Set());
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const initialFit = useRef(false);
  const screenshotReady = useRef(false);
  const previousCount = useRef(graph.nodes.length);
  const focusId = screenshotFocusId(graph);
  const focusNode = layout.nodes.find(node => node.id === focusId);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const selected = layout.nodes.find(node => node.id === graph.selectedId);
  const presentation = useMemo(() => presentTree(layout, graph.selectedId, collapsedLevels, graph.activeBranchId),
    [layout, graph.selectedId, collapsedLevels, graph.activeBranchId]);
  const endpoints = presentation.endpoints;
  const jumperEndpointId = endpoints.find(node => node.branchId === presentation.selectedBranchId)?.id ?? endpoints[0]?.id;
  const jumperIndex = Math.max(0, endpoints.findIndex(node => node.id === jumperEndpointId));
  const jumperEndpoint = endpoints[jumperIndex];
  const branches = endpoints.map(endpoint => ({ branchId: endpoint.branchId, name: branchName(endpoint.branchId, graph.nodes), endpoint }));
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
    const endpoint = endpoints.find(node => node.branchId === branchId);
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
    if (screenshotReady.current || !screenshotCapture) return;
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
          const nearestCount = focusNode
            ? presentation.groups.slice().sort((a, b) => {
              const da = (a.x - focusNode.x) ** 2 + (a.y - focusNode.y) ** 2;
              const db = (b.x - focusNode.x) ** 2 + (b.y - focusNode.y) ** 2;
              return da - db;
            })[0]
            : presentation.groups[0];
          const targets = [
            nearestCount && {
              x: nearestCount.x + treeTheme.branchCountDiameter / 2 + treeTheme.countHintGap + treeTheme.countHintWidth,
              y: nearestCount.y,
              width: treeTheme.branchCountDiameter + treeTheme.countHintGap + treeTheme.countHintWidth,
              height: treeTheme.branchCountDiameter,
            },
            focusNode && {
              x: focusNode.x + geometry.cardOffsetX + geometry.cardWidth / 2,
              y: focusNode.y + geometry.cardOffsetY + geometry.cardHeight / 2,
              width: geometry.cardWidth,
              height: geometry.cardHeight + 120,
            },
          ].filter(Boolean) as { x: number; y: number; width: number; height: number }[];
          if (targets.length) {
            const frame = frameScreenshotTargets(targets, width, height, treeTheme.minZoom);
            zoomRef.current = frame.zoom;
            setZoom(frame.zoom);
            requestAnimationFrame(() => {
              element.scrollTo({ left: frame.left, top: frame.top, behavior: 'instant' });
              requestAnimationFrame(markScreenshotReady);
            });
          } else {
            requestAnimationFrame(() => requestAnimationFrame(markScreenshotReady));
          }
        } else {
          const next = Math.max(0.55, Math.min(1, (width - 24) / layout.width));
          setZoom(next); zoomRef.current = next;
        }
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [layout.width, screenshotCapture, focusNode, presentation.groups]);

  useEffect(() => {
    if (!screenshotCapture) return;
    const timer = window.setTimeout(markScreenshotReady, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  function changeZoom(next: number, clientX?: number, clientY?: number) {
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
    const next = Math.max(treeTheme.minZoom, Math.min(1, (element.clientWidth - 24) / layout.width, (element.clientHeight - 60) / layout.height));
    zoomRef.current = next; setZoom(next);
    requestAnimationFrame(() => element.scrollTo({ left: 0, top: 0, behavior: 'smooth' }));
  }

  function focusAtZoom(node: { x: number; y: number }, nextZoom: number, behavior: ScrollBehavior = 'smooth') {
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

  function goToEndpoint(node: typeof jumperEndpoint) {
    if (!node) return;
    dispatch({ type: 'select', id: node.id });
    focusAtZoom(node, 1);
  }

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
  const worldWidth = Math.max(layout.width + 240, viewportSize.width / zoom);
  const worldHeight = Math.max(layout.height + 240, viewportSize.height / zoom);

  return <section className="tree-panel" aria-labelledby="tree-title" data-selected-branch={presentation.selectedBranchId || undefined} data-active-branch={graph.activeBranchId} style={{
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
    '--active-branch-color': treeTheme.activeBranchColor,
    '--version-label-size': `${treeTheme.versionLabelFontSize}px`,
    '--station-offset-x': `${-geometry.cardOffsetX - treeTheme.stationRadius - 1}px`,
    '--station-offset-y': `${-geometry.cardOffsetY - treeTheme.stationRadius - 1}px`,
  } as CSSProperties}>
    <div className="panel-header"><div className="panel-heading"><h2 id="tree-title">Version stream</h2></div><div className="panel-header-actions"><button className={`icon-button ${grid ? 'is-active' : ''}`} onClick={() => setGrid(!grid)} aria-label="Toggle isometric grid" aria-pressed={grid} title="Toggle grid"><Icon name="grid"/></button><button className="icon-button" onClick={fitAll} aria-label="Fit all versions" title="Fit all versions"><Icon name="expand"/></button></div></div>
    <div className="canvas-shell">
      <div ref={viewport} className={`tree-viewport ${isPanning ? 'is-panning' : ''}`} tabIndex={0} aria-label="Version tree canvas. Scroll in any direction to pan. Control plus scroll to zoom. Click empty canvas to deselect." onPointerDown={startPan} onPointerMove={pan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}>
        <div className="canvas-size" style={{ width: worldWidth * zoom, height: worldHeight * zoom }}>
          <div className="canvas-world" style={{ width: worldWidth, height: worldHeight, transform: `scale(${zoom})` }}>
            <svg className="route-layer" width={worldWidth} height={worldHeight} aria-hidden="true">
              <IsometricGrid width={worldWidth} height={worldHeight} visible={grid}/>
              {/* Paint clearance first so connected segments do not erase each other's junctions. */}
              {presentation.routes.map(route => <path key={`clearance:${route.id}`} d={route.path} fill="none" stroke="var(--canvas-bg)" strokeWidth={treeTheme.routeWidth + treeTheme.routeClearance * 2} strokeLinejoin="round" strokeLinecap="round"/>)}
              {/* Routes arrive pre-sorted: default wiring, the level connector, the selected branch, then the checked-out spine on top. */}
              {presentation.routes.map(route => <g key={route.id} className="route" data-route-kind={route.kind} data-active={route.active} data-spine={route.spine || undefined}
                opacity={route.kind === 'horizontal-branch' ? treeTheme.levelConnectorOpacity : 1}>
                <path d={route.path} fill="none" stroke={route.kind === 'horizontal-branch' ? treeTheme.levelConnectorColor : route.spine ? 'var(--active-branch-color)' : levelColor(route.branchId, layout.nodes.find(node => node.id === route.targetId)?.row ?? layout.forks?.find(fork => fork.id === route.targetId)?.row ?? 0)} strokeWidth={treeTheme.routeWidth} strokeLinejoin="round" strokeLinecap="round"/>
                <path d={route.path} fill="none" stroke={treeTheme.routeStripeColor} strokeWidth={treeTheme.routeStripeWidth} opacity={treeTheme.routeStripeOpacity} strokeLinejoin="round" strokeLinecap="round"/>
              </g>)}
              {presentation.tip && <path data-branch-end={presentation.tip.id} fill={treeTheme.stationFill}
                d={`M ${presentation.tip.x} ${presentation.tip.y + treeTheme.stationRadius + treeTheme.endpointTriangleGap}
                  l ${treeTheme.endpointTriangleWidth / 2} ${treeTheme.endpointTriangleHeight}
                  h ${-treeTheme.endpointTriangleWidth} Z`}/>}
            </svg>
            {presentation.groups.map(group => <button key={group.id} className="branch-count"
              style={{ left: group.x, top: group.y }}
              aria-label={`${collapsedLevels.has(group.id) ? 'Expand' : 'Collapse'} ${group.nodeIds.length} versions at ${group.label}`}
              aria-expanded={!collapsedLevels.has(group.id)} onClick={() => toggleLevel(group.id)}>
              {group.nodeIds.length}
              <span className="branch-count-hint" aria-hidden="true"/>
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
              const color = activeRouteColor(levelColor(node.branchId, node.row), onSpine);
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
                }}>{node.label}</span>
                <VersionCard node={node} selected={node.id === graph.selectedId}
                  hasDescendants={presentation.nodesWithChildren.has(node.id)} onActivePath={onSpine}
                  isCurrentBranch={node.branchId === graph.activeBranchId}
                  canDeleteCurrent={canDeleteCurrent(graph.nodes, node.id)}
                  canDeleteFuture={canDeleteFuture(graph.nodes, node.id)}
                  color={color}
                  onSelect={() => dispatch({ type: 'select', id: node.id })}
                  onBranch={() => dispatch({ type: 'add-branch', sourceId: node.id })}
                  onCommit={() => dispatch({ type: 'add-commit', sourceId: node.id })}
                  onSwitchBranch={() => dispatch({ type: 'set-active-branch', branchId: node.branchId })}
                  onDeleteCurrent={() => dispatch({ type: 'delete-current', sourceId: node.id })}
                  onDeleteFuture={() => dispatch({ type: 'delete-future', sourceId: node.id })}
                  forceMenuOpen={screenshotCapture && node.id === focusId}/>
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
    <div className="sr-only" role="status" aria-live="polite">{graph.nodes.length} versions. {selected ? `Selected ${selected.label}.` : 'No version selected.'}</div>
  </section>;
}
