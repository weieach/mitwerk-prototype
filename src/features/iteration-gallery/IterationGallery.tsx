import type { RuntimeMode } from './EmbeddedPrototype';
import { panelIcons } from '../../components/panel-icons';
import { captureScreen } from '../../shared/capture-screens';
import { galleryDemoUpdateEvent } from '../../shared/demo-events';
import { createPortal } from 'react-dom';
import { VersionPanelSwitch } from '../../components/VersionPanelSwitch';
import { AnnotationOverlay } from '../annotations/FrameAnnotations';
import { LatestPromptIdContext } from '../annotations/annotation-context';
import { seedAnnotations } from '../annotations/store';
import { Icon } from '../../components/Icon';
import { RowSelect } from '../../components/RowSelect';
import { PanelHeader } from '../../components/PanelHeader';
import { ZoomScaleButton } from '../../components/ZoomScaleButton';
import '@phosphor-icons/web/regular/style.css';
import { TrackedInterface } from './TrackedInterface';
import type { VisualReference } from './references';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { containedFrameTarget, frameBorderEntrance, timelineEntrance } from './theater-transition';
import type { GalleryCamera, TheaterTarget } from './theater-transition';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { AlbumView } from './AlbumView';
import { referenceCapture } from './theater-layout';
import { TheaterView } from './TheaterView';
import { simulationAdvanced } from './playback-selection';
import { resolveFrameRequest, buildVersions, versionsForScreen, defaultVersionRange, inRange, rangeCounts, ranges, versionKeepsPush } from './model';
import type { Capture, GalleryFrame, RangeKey, FrameRequest } from './model';
import { galleryTokens as t } from './tokens';
import { effectiveProgress, isSimulating, simulateCaptures, simulatedCount, workStateTokens } from '../../shared/work-state';
import { simulatedGalleryUrls, warmCaptures } from './capture-cache';
import { usePanelWorkState } from '../../shared/useWorkState';
import './gallery.css';

type Catalog = { frames: Capture[]; ignored: number; references?: VisualReference[] };

export function IterationGallery({ onRuntimeChange, onPlaybackVersion, headerTarget, headerActions, playbackOnly = false, onExitPlayback, pushRequest, onSwitchPanel, onToggle, expanded }: { onRuntimeChange?:(mode:RuntimeMode|null)=>void; onPlaybackVersion?:(version:number|null)=>void; headerTarget?:HTMLElement|null; headerActions?:ReactNode; playbackOnly?:boolean; onExitPlayback?:()=>void; onToggle?:()=>void; expanded?:boolean; onSwitchPanel?:()=>void; pushRequest: FrameRequest | null }) {
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode|null>(null);
  const [liveRequestKey, setLiveRequestKey] = useState(0);
  const consumeLiveRequest = useCallback((key: number) => {
    setLiveRequestKey(current => current === key ? 0 : current);
  }, []);
  const runtimeChanged = useCallback((mode:RuntimeMode|null) => { setRuntimeMode(mode); onRuntimeChange?.(mode); }, [onRuntimeChange]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [chosenRange, setRange] = useState<RangeKey | null>(() => {
    const params = new URLSearchParams(location.search);
    const capturedRange = params.get('range');
    return params.get('screenshot') === '1' && ranges.some(option => option.value === capturedRange) ? capturedRange as RangeKey : null;
  });
  const [interfaceId, setInterfaceId] = useState<string>(t.interfaces[0].value);
  const [now, setNow] = useState(Date.now);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<'album' | 'focusing' | 'turning' | 'theater' | 'returning' | 'orbiting'>('album');
  const [selectedId, setSelectedId] = useState('');
  const [milestoneFrame, setMilestoneFrame] = useState<{frame: GalleryFrame; onComplete?: () => void} | null>(null);
  const [navigationKey, setNavigationKey] = useState(0);
  const [target, setTarget] = useState<TheaterTarget | null>(null);
  const [exportSlot, setExportSlot] = useState<HTMLSpanElement | null>(null);
  const [framePickerSlot, setFramePickerSlot] = useState<HTMLDivElement | null>(null);
  const viewStack = useRef<HTMLDivElement>(null);
  const galleryRoot = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const root = galleryRoot.current;
    const footer = root?.querySelector<HTMLElement>('.gallery-footer');
    if (!root || !footer) return;
    const measure = () => root.style.setProperty('--gallery-runtime-footer-height', `${footer.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(footer); measure();
    return () => observer.disconnect();
  }, []);
  const updateTimelineMotion = useCallback((progress: number) => {
    const pose = timelineEntrance(progress);
    galleryRoot.current?.style.setProperty('--timeline-enter-opacity', String(pose.opacity));
    galleryRoot.current?.style.setProperty('--timeline-enter-offset', `${pose.offsetVh}vh`);
    galleryRoot.current?.style.setProperty('--frame-border-opacity', String(frameBorderEntrance(progress).opacity));
  }, []);
  const [returnReady, setReturnReady] = useState(false);
  const startReturn = useCallback(() => setReturnReady(true), []);
  const finishTurn = useCallback(() => { setView(previous => previous === 'returning' ? 'album' : 'theater'); setTarget(null); }, []);
  const exit = useCallback(() => {
    if (view !== 'theater') return;
    setMilestoneFrame(null);
    if (playbackOnly) onExitPlayback?.();
    const shown = viewStack.current?.querySelector<HTMLElement>('.theater-view')?.dataset.frameId;
    const screen = viewStack.current?.querySelector('.theater-screen');
    if (!shown || !screen) { setView('album'); return; }
    const image = screen.querySelector('img');
    const rect = image?.getBoundingClientRect() ?? screen.getBoundingClientRect();
    setSelectedId(shown); setTarget(image?.naturalWidth ? containedFrameTarget(rect, image.naturalWidth, image.naturalHeight) : rect);
    setReturnReady(false); setView('returning');
  }, [view, playbackOnly, onExitPlayback]);
  const camera = useRef<GalleryCamera | null>(null);
  // A finished chat reply in this sample project demos a live update: the newest frame drops back into the gallery.
  useEffect(() => {
    const arrive = () => { if (view === 'album') camera.current?.arrive(); };
    window.addEventListener(galleryDemoUpdateEvent, arrive);
    return () => window.removeEventListener(galleryDemoUpdateEvent, arrive);
  }, [view]);



  useEffect(() => {
    const abort = new AbortController();
    async function read() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}gallery/manifest.json`, { signal: abort.signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('The screenshot catalog could not be loaded.');
        const next = await response.json() as Catalog;
        if (!Array.isArray(next.frames)) throw new Error('The screenshot catalog is invalid.');
        if (!abort.signal.aborted) { setCatalog(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next); setError(''); setNow(Date.now()); }
      } catch (error) { if (!abort.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load frames.'); }
    }
    void read();
    const timer = window.setInterval(read, t.refreshMs);
    return () => { abort.abort(); window.clearInterval(timer); };
  }, [retry]);

  const work = usePanelWorkState();
  const simulating = isSimulating(work);
  const targetCaptures = simulatedCount(catalog?.frames.length ?? 0, effectiveProgress(work));
  const [shownCaptures, setShownCaptures] = useState(targetCaptures);
  // While simulating, redraw only once the next state's sampled images are decoded (or the wait runs out).
  useEffect(() => {
    if (targetCaptures === shownCaptures) return;
    if (!simulating || !catalog) { setShownCaptures(targetCaptures); return; }
    let done = false;
    const apply = () => { if (!done) { done = true; setShownCaptures(targetCaptures); } };
    const timer = window.setTimeout(apply, workStateTokens.imageWaitMs);
    void warmCaptures(simulatedGalleryUrls(catalog.frames, targetCaptures, interfaceId)).then(apply);
    return () => { done = true; window.clearTimeout(timer); };
  }, [targetCaptures, shownCaptures, simulating, catalog, interfaceId]);
  // The work state simulator replays the catalog chronologically; its clock is the newest capture shown.
  const displayedCaptures = simulating ? shownCaptures : targetCaptures;
  const simulated = useMemo(() => simulateCaptures(catalog?.frames ?? [], displayedCaptures), [catalog, displayedCaptures]);
  const allVersions = useMemo(() => buildVersions(simulated.captures), [simulated]);
  const latestPromptId = useMemo(() => allVersions.flatMap(version => version.frames).reduce<GalleryFrame | null>((latest, frame) => frame.kind === 'prompt' && (!latest || frame.timestamp > latest.timestamp || (frame.timestamp === latest.timestamp && (frame.number ?? 0) > (latest.number ?? 0))) ? frame : latest, null)?.id ?? null, [allVersions]);
  const versions = useMemo(() => versionsForScreen(allVersions, interfaceId), [allVersions, interfaceId]);
  // The complete history the simulated album grows into, so its first versions stay in place.
  const extent = useMemo(() => simulating && catalog ? versionsForScreen(buildVersions(catalog.frames), interfaceId) : undefined, [simulating, catalog, interfaceId]);
  const clock = simulated.now ?? now;
  // The simulator always shows all time, so earlier work never falls outside the range.
  const range = simulating ? 'all' : chosenRange ?? defaultVersionRange;
  const baseline = useMemo(() => referenceCapture(versions.flatMap(version => version.frames), t.theaterReference), [versions]);
  const visibleFrames = useMemo(() => versions.flatMap(version => (versionKeepsPush(version.frames) ? version.frames : version.frames.filter(frame => frame.kind !== 'push')).filter(frame => inRange(frame, range, clock))), [versions, range, clock]);
  const counts = useMemo(() => rangeCounts(versions, range, clock), [versions, range, clock]);
  const rangePrompts = visibleFrames.filter(frame => frame.kind === 'prompt').length;
  const rangePromptLabel = ` (${rangePrompts} ${rangePrompts === 1 ? 'prompt' : 'prompts'})`;
  const select = useCallback((id: string, animate = false) => { setSelectedId(id); if (animate) setNavigationKey(key => key + 1); }, []);
  const handledPush = useRef<typeof pushRequest>(null);
  useEffect(() => {
    if (!pushRequest || handledPush.current === pushRequest || !['album', 'theater'].includes(view)) return;
    if ('live' in pushRequest && !pushRequest.live) { handledPush.current = pushRequest; setLiveRequestKey(key => -Math.abs(key) - 1); return; }
    const push = resolveFrameRequest(allVersions, pushRequest);
    if (!push) return;
    if (captureScreen(push) !== interfaceId) { setInterfaceId(captureScreen(push)); return; }
    handledPush.current = pushRequest;
    if (!inRange(push, range, clock)) setRange('all');
    select(push.id, true);
    if ('live' in pushRequest) setLiveRequestKey(key => Math.abs(key) + 1);
    setMilestoneFrame(pushRequest.milestone ? {frame:push, onComplete:pushRequest.onMilestoneClose} : null);
    if (view === 'album') { updateTimelineMotion(0); setView('turning'); }
  }, [pushRequest, versions, view, select, updateTimelineMotion, range, clock]);
  const enterPlayback = useCallback(() => {
    if (view !== 'album' || !visibleFrames.length) return;
    const latest = visibleFrames.reduce((last, frame) => frame.timestamp >= last.timestamp ? frame : last);
    setSelectedId(latest.id); setView('focusing');
    const enter = () => { updateTimelineMotion(0); setNavigationKey(key => key + 1); setView('turning'); };
    if (camera.current) camera.current.focus(latest.id, enter); else enter();
  }, [view, visibleFrames, updateTimelineMotion]);
  useEffect(() => {
    if (!playbackOnly || view !== 'album' || !visibleFrames.length || (pushRequest && handledPush.current !== pushRequest)) return;
    // Let the split settle before measuring the camera's latest-frame destination.
    const tick = requestAnimationFrame(enterPlayback);
    return () => cancelAnimationFrame(tick);
  }, [playbackOnly, view, visibleFrames, enterPlayback, pushRequest]);
  function switchView(mode: 'Gallery' | 'Playback') {
    if (mode === 'Gallery') {
      // In server mode the Gallery tab stays available: close the runtime while turning back to the gallery.
      if (runtimeMode) setLiveRequestKey(key => -Math.abs(key) - 1);
      exit();
    } else enterPlayback();
  }
  function open(id: string) { if (view !== 'album') return; updateTimelineMotion(0); setSelectedId(id); setNavigationKey(key => key + 1); setView('turning'); }

  useLayoutEffect(() => {
    if (view !== 'turning') return;
    let tick = requestAnimationFrame(() => { tick = requestAnimationFrame(() => {
      const screen = viewStack.current?.querySelector('.theater-screen');
      const frame = visibleFrames.find(item => item.id === selectedId);
      if (screen && frame) setTarget(containedFrameTarget(screen.getBoundingClientRect(), frame.width, frame.height)); else finishTurn();
    }); });
    return () => cancelAnimationFrame(tick);
  }, [view, selectedId, visibleFrames, finishTurn]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (handledPush.current) return;
    if (params.get('screenshot') !== '1' || !['theater', 'transition', 'timeline-transition'].includes(params.get('galleryView') ?? '')) return;
    const frames = versions.flatMap(version => version.frames);
    const pushVersion = Number(params.get('pushVersion')) || t.capturePushVersion;
    const ranged = frames.filter(frame => inRange(frame, range, clock));
    const featured = params.get('frameNumber') ? frames.find(frame => frame.kind === 'prompt' && frame.number === Number(params.get('frameNumber')))
      : params.get('playhead') === 'end' ? ranged.at(-1)
      : params.get('frameKind') === 'prototype' ? frames.filter(frame => frame.kind === 'push').sort((a,b) => a.timestamp - b.timestamp).at(-2)
      : params.get('frameKind') === 'push'
      ? frames.find(frame => frame.kind === 'push' && (frame.version === pushVersion || frame.number === pushVersion)) ?? frames.find(frame => frame.kind === 'push')
      : referenceCapture(frames, t.theaterReference);
    if (featured && !inRange(featured, range, clock)) { setRange('all'); return; }
    const id = featured?.id;
    if (id) {
      setSelectedId(id);
      if (params.get('playhead') === 'end') setNavigationKey(key => key + 1);
      setView(params.get('galleryView') === 'theater' ? 'theater' : 'turning');
    }
  }, [versions, range, clock]);

  // Follow added/removed work, not a view transition or an explicit frame selection.
  const latestVisible = visibleFrames.reduce<GalleryFrame | undefined>((last, frame) => !last || frame.timestamp >= last.timestamp ? frame : last, undefined);
  const previousLatestId = useRef(latestVisible?.id);
  useEffect(() => {
    const advanced = simulationAdvanced(previousLatestId.current, latestVisible?.id, simulating, view === 'theater');
    previousLatestId.current = latestVisible?.id;
    if (advanced && latestVisible && latestVisible.id !== selectedId) select(latestVisible.id);
  }, [simulating, view, latestVisible?.id, selectedId, select]);

  useEffect(() => { if (simulating) return; try { seedAnnotations(versions.flatMap(version => version.frames)); } catch { /* Demo seeds can be retried after storage is available. */ } }, [versions, simulating]);

  const header = <PanelHeader title="Version blocks" icon={panelIcons.versionBlocks} mode={view === 'album' || view === 'focusing' || view === 'returning' ? 'Gallery' : 'Playback'} onModeChange={switchView} modeAction={runtimeMode ? { label: 'Return to Playback', onClick: () => setLiveRequestKey(key => -Math.abs(key) - 1) } : undefined} modeDisabled={!visibleFrames.length || !['album','theater'].includes(view)} onTitleClick={!runtimeMode && view === 'theater' ? exit : undefined} onToggle={onToggle} expanded={expanded} actions={<>
      <span className="gallery-header-runtime-controls" inert={!!runtimeMode} aria-hidden={!!runtimeMode}><VersionPanelSwitch onClick={onSwitchPanel} target="Version stream"/>
      {view !== 'album' && view !== 'focusing' && <div className="gallery-range"><RowSelect label="Date range" align="center" value={range} onChange={value => { setRange(value as RangeKey); setNow(Date.now()); }} options={ranges}/></div>}
      <div className="gallery-frame-picker-slot" ref={setFramePickerSlot}/>
      {headerActions}</span>
      <span className="playback-export-slot" ref={setExportSlot}/>
    </>}/>;

  // Only Live server exits on a surround click; saved prototypes require the explicit exit action.
  // Covered controls are inert, so their clicks land on these ancestors.
  function exitRuntimeOutsideFrame(event: MouseEvent<HTMLElement>) {
    if (runtimeMode !== 'live' || (event.target as Element).closest('.theater-screen, .runtime-exit-scrim button, .prototype-version-controls, .panel-header')) return;
    setLiveRequestKey(key => -Math.abs(key) - 1);
  }

  return <LatestPromptIdContext.Provider value={latestPromptId}><section ref={galleryRoot} data-gallery-phase={view} className={`iteration-gallery gallery-phase-${view}${runtimeMode ? ' gallery-runtime-active' : ''}${returnReady && view === 'returning' ? ' gallery-return-ready' : ''}`} aria-label="Version blocks" onClick={exitRuntimeOutsideFrame} style={{ '--annotation-blur': `${t.annotations.blur}px`, '--annotation-blur-ms': `${t.annotations.blurMs}ms`, '--annotation-enter-ms': `${t.annotations.enterMs}ms`, '--annotation-exit-ms': `${t.annotations.exitMs}ms`, '--annotation-frame-delay': `${t.annotations.frameDelayMs}ms`, '--annotation-ui-delay': `${t.annotations.uiDelayMs}ms`, '--gallery-label-background': t.labelBackdrop.color, '--gallery-label-opacity': `${t.labelBackdrop.opacity * 100}%`, '--gallery-label-padding-inline': `${t.labelBackdrop.paddingInline}px`, '--gallery-label-padding': `${t.labelBackdrop.paddingBlock}px ${t.labelBackdrop.paddingInline}px`, '--gallery-axis-line-height': t.axisText.lineHeight, '--gallery-header-gap': `${t.controls.headerGap}px`, '--gallery-token-lift': `${t.controls.tokenLift}px`, '--gallery-floating-background': t.controls.floatingBackground, '--gallery-floating-label-opacity': t.controls.labelOpacity, '--gallery-frame-selector-share': `${t.controls.frameSelectorShare * 100}%`, '--gallery-floating-width': `${t.controls.floatingWidth}px`, '--gallery-floating-pad-inline': `${t.controls.floatingPaddingInline}px`, '--gallery-floating-pad-block': `${t.controls.floatingPaddingBlock}px`, '--gallery-file-max-width': `${t.controls.fileMaxWidth}px`, '--gallery-control-inset': `${t.controls.inset}px`, '--gallery-control-gap': `${t.controls.gap}px`, '--gallery-frame-select-max-width': `${t.controls.frameSelectMaxWidth}px`, '--theater-focus-background': t.theater.focusBackground, '--theater-frame-shadow': t.theater.frameShadow, '--theater-controls-fade': `${t.theaterMotion.controlsFadeMs}ms`, '--gallery-transition': `${t.transitionMs}ms`, '--gallery-label-size': `${t.labelFontSize}px`, '--runtime-backdrop-color': t.runtimeBackdrop.color } as CSSProperties}>
    <div className="gallery-runtime-backdrop" data-active={!!runtimeMode} aria-hidden/>
    {headerTarget ? createPortal(header, headerTarget) : header}
    {error && <div className="gallery-message" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
    {!catalog ? <div className="gallery-empty">{error ? 'Screenshot catalog unavailable.' : 'Reading saved frames…'}</div>
      : !versions.length ? <div className="gallery-empty">{simulating ? 'No versions yet.' : 'No saved frames found.'}</div>
      : <div className="gallery-view-stack" ref={viewStack}>
      {<><AlbumView focusing={view === 'focusing'} onSelectFrame={id => select(id, true)} framePickerSlot={framePickerSlot} rangeStats={catalog ? `${counts.versions}/${counts.versionTotal} versions${rangePromptLabel}` : 'Loading frames…'} onMotion={updateTimelineMotion} turning={view === 'turning'} returning={view === 'returning'} hidden={view === 'theater' || view === 'orbiting'} onReturnStarted={startReturn} theaterTarget={target} theaterId={selectedId} onTurnComplete={finishTurn} versions={versions} range={range} now={clock} simulating={simulating} extent={extent} onOpen={open} onZoom={setZoom} onCamera={api => { camera.current = api; }}/>{!visibleFrames.length && <div className="gallery-message">No frames in this range. Earlier versions remain visible in gray.</div>}</>}
      {view !== 'album' && view !== 'focusing' && <div className="gallery-theater-layer" inert={view === 'turning' || view === 'returning'} aria-hidden={view === 'turning' || view === 'returning'}><TheaterView onRangeChange={setRange} exportTarget={exportSlot} runtimeCatalog={allVersions.flatMap(version => version.frames)} liveRequestKey={liveRequestKey} onLiveRequestHandled={consumeLiveRequest} onRuntimeChange={runtimeChanged} onPlaybackVersion={onPlaybackVersion} navigationKey={navigationKey} references={catalog?.references ?? []} baseline={baseline ?? t.viewportPresets[1]} frames={visibleFrames} catalog={versions.flatMap(version => version.frames)} range={range} now={clock} selectedId={selectedId} onSelect={select} onOrbit={(id, rect) => playbackOnly ? null : camera.current?.orbit(id, rect, () => { setSelectedId(id); setView('orbiting'); }, () => { setView('album'); setTarget(null); }) ?? null} onDismiss={exit} active={view === 'theater'}/></div>}
      </div>}
    <footer className="gallery-footer" aria-hidden={!!runtimeMode} inert={!!runtimeMode || view === 'turning' || view === 'returning' || view === 'orbiting'}>
      <TrackedInterface value={interfaceId} onChange={value => { setInterfaceId(value); setSelectedId(''); setView('album'); setTarget(null); }}/>
      {view !== 'theater' && view !== 'orbiting' && <div className="panel-header-actions">
        <div className="gallery-range"><RowSelect label="Date range" align="center" value={range} onChange={value => { setRange(value as RangeKey); setNow(Date.now()); }} options={ranges}/></div>
        <button className="icon-button" aria-label="Zoom gallery out" disabled={zoom <= t.zoomMin} onClick={() => camera.current?.zoom(-1)}><Icon name="minus"/></button>
        <ZoomScaleButton zoom={zoom} onResetZoom={() => camera.current?.zoom(0)} onResetView={() => camera.current?.reset()}/>
        <button className="icon-button" aria-label="Zoom gallery in" disabled={zoom >= t.zoomMax} onClick={() => camera.current?.zoom(1)}><Icon name="plus"/></button>
      </div>}
    </footer>
    {milestoneFrame && view === 'theater' && galleryRoot.current && <RequestedMilestoneOverlay key={milestoneFrame.frame.id} frame={milestoneFrame.frame} onComplete={milestoneFrame.onComplete} container={galleryRoot.current} onClose={() => setMilestoneFrame(null)}/>}
  </section></LatestPromptIdContext.Provider>;
}

/** Resolve the originating card on save, cancel, or navigation away from its overlay. */
function RequestedMilestoneOverlay({frame, container, onClose, onComplete}: {
  frame: GalleryFrame; container: HTMLElement; onClose: () => void; onComplete?: () => void;
}) {
  const completion = useRef<{timer: ReturnType<typeof setTimeout>; callback?: () => void} | undefined>(undefined);
  useEffect(() => {
    // Ignore StrictMode's simulated unmount, but resolve a replaced card's request.
    if (completion.current?.callback === onComplete) clearTimeout(completion.current?.timer);
    return () => { completion.current = {callback:onComplete, timer:setTimeout(() => onComplete?.(), 0)}; };
  }, [onComplete]);
  return <AnnotationOverlay frame={frame} milestoneOnly fromChatVersionCard container={container} onClose={onClose}/>;
}
