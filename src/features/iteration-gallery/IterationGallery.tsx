import { VersionPanelSwitch } from '../../components/VersionPanelSwitch';
import { seedAnnotations } from '../annotations/store';
import { Icon } from '../../components/Icon';
import { RowSelect } from '../../components/RowSelect';
import { AdaptivePanelTitle } from '../../components/AdaptivePanelTitle';
import { ResetViewButton } from '../../components/ResetViewButton';
import '@phosphor-icons/web/regular/style.css';
import { TrackedInterface } from './TrackedInterface';
import type { VisualReference } from './references';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { containedFrameTarget, frameBorderEntrance, timelineEntrance } from './theater-transition';
import type { GalleryCamera, TheaterTarget } from './theater-transition';
import type { CSSProperties } from 'react';
import { AlbumView } from './AlbumView';
import { referenceCapture } from './theater-layout';
import { TheaterView } from './TheaterView';
import { buildVersions, inRange, rangeCounts, ranges, versionKeepsPush } from './model';
import type { Capture, RangeKey } from './model';
import { galleryTokens as t } from './tokens';
import './gallery.css';

type Catalog = { frames: Capture[]; ignored: number; references?: VisualReference[] };

export function IterationGallery({ pushRequest, onSwitchPanel }: { onSwitchPanel?:()=>void; pushRequest: { version: number } | null }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [range, setRange] = useState<RangeKey>(() => {
    const params = new URLSearchParams(location.search);
    const capturedRange = params.get('range');
    return params.get('screenshot') === '1' && ranges.some(option => option.value === capturedRange) ? capturedRange as RangeKey : '7';
  });
  const [interfaceId, setInterfaceId] = useState<string>(t.interfaces[0].value);
  const [now, setNow] = useState(Date.now);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<'album' | 'turning' | 'theater' | 'returning' | 'orbiting'>('album');
  const [selectedId, setSelectedId] = useState('');
  const [navigationKey, setNavigationKey] = useState(0);
  const [target, setTarget] = useState<TheaterTarget | null>(null);
  const [framePickerSlot, setFramePickerSlot] = useState<HTMLDivElement | null>(null);
  const viewStack = useRef<HTMLDivElement>(null);
  const galleryRoot = useRef<HTMLElement>(null);
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
    const shown = viewStack.current?.querySelector<HTMLElement>('.theater-view')?.dataset.frameId;
    const screen = viewStack.current?.querySelector('.theater-screen');
    if (!shown || !screen) { setView('album'); return; }
    const image = screen.querySelector('img');
    const rect = image?.getBoundingClientRect() ?? screen.getBoundingClientRect();
    setSelectedId(shown); setTarget(image?.naturalWidth ? containedFrameTarget(rect, image.naturalWidth, image.naturalHeight) : rect);
    setReturnReady(false); setView('returning');
  }, [view]);
  const camera = useRef<GalleryCamera | null>(null);



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

  const versions = useMemo(() => buildVersions(catalog?.frames ?? []), [catalog]);
  const baseline = useMemo(() => referenceCapture(versions.flatMap(version => version.frames), t.theaterReference), [versions]);
  const visibleFrames = useMemo(() => versions.flatMap(version => (versionKeepsPush(version.frames) ? version.frames : version.frames.filter(frame => frame.kind !== 'push')).filter(frame => inRange(frame, range, now))), [versions, range, now]);
  const counts = useMemo(() => rangeCounts(versions, range, now), [versions, range, now]);
  const rangePrompts = visibleFrames.filter(frame => frame.kind === 'prompt').length;
  const rangePromptLabel = ` (${rangePrompts} ${rangePrompts === 1 ? 'prompt' : 'prompts'})`;
  const select = useCallback((id: string, animate = false) => { setSelectedId(id); if (animate) setNavigationKey(key => key + 1); }, []);
  const handledPush = useRef(pushRequest);
  useEffect(() => {
    if (!pushRequest || handledPush.current === pushRequest) return;
    const push = versions.flatMap(version => version.frames).find(frame => frame.kind === 'push' && frame.version === pushRequest.version);
    if (!push) return;
    handledPush.current = pushRequest;
    select(push.id, true);
    if (view === 'album') { updateTimelineMotion(0); setView('turning'); }
  }, [pushRequest, versions, view, select, updateTimelineMotion]);
  function open(id: string) { if (view !== 'album') return; updateTimelineMotion(0); setSelectedId(id); setView('turning'); }

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
    if (params.get('screenshot') !== '1' || !['theater', 'transition', 'timeline-transition'].includes(params.get('galleryView') ?? '')) return;
    const frames = versions.flatMap(version => version.frames);
    const pushVersion = Number(params.get('pushVersion')) || t.capturePushVersion;
    const ranged = frames.filter(frame => inRange(frame, range, now));
    const featured = params.get('frameNumber') ? frames.find(frame => frame.kind === 'prompt' && frame.number === Number(params.get('frameNumber')))
      : params.get('playhead') === 'end' ? ranged.at(-1)
      : params.get('frameKind') === 'push'
      ? frames.find(frame => frame.kind === 'push' && (frame.version === pushVersion || frame.number === pushVersion)) ?? frames.find(frame => frame.kind === 'push')
      : referenceCapture(frames, t.theaterReference);
    if (featured && !inRange(featured, range, now)) { setRange('all'); return; }
    const id = featured?.id;
    if (id) {
      setSelectedId(id);
      if (params.get('playhead') === 'end') setNavigationKey(key => key + 1);
      setView(params.get('galleryView') === 'theater' ? 'theater' : 'turning');
    }
  }, [versions, range, now]);

  useEffect(() => { try { seedAnnotations(versions.flatMap(version => version.frames)); } catch { /* Demo seeds can be retried after storage is available. */ } }, [versions]);

  return <section ref={galleryRoot} data-gallery-phase={view} className={`iteration-gallery gallery-phase-${view}${returnReady && view === 'returning' ? ' gallery-return-ready' : ''}`} aria-label="Iteration Visualizer" style={{ '--gallery-header-gap': `${t.controls.headerGap}px`, '--gallery-token-lift': `${t.controls.tokenLift}px`, '--gallery-floating-background': t.controls.floatingBackground, '--gallery-floating-label-opacity': t.controls.labelOpacity, '--gallery-frame-selector-share': `${t.controls.frameSelectorShare * 100}%`, '--gallery-floating-width': `${t.controls.floatingWidth}px`, '--gallery-floating-pad-inline': `${t.controls.floatingPaddingInline}px`, '--gallery-floating-pad-block': `${t.controls.floatingPaddingBlock}px`, '--gallery-file-max-width': `${t.controls.fileMaxWidth}px`, '--gallery-control-inset': `${t.controls.inset}px`, '--gallery-control-gap': `${t.controls.gap}px`, '--gallery-frame-select-max-width': `${t.controls.frameSelectMaxWidth}px`, '--theater-focus-background': t.theater.focusBackground, '--theater-frame-shadow': t.theater.frameShadow, '--theater-controls-fade': `${t.theaterMotion.controlsFadeMs}ms`, '--gallery-transition': `${t.transitionMs}ms`, '--gallery-label-size': `${t.labelFontSize}px` } as CSSProperties}>
    <header className="panel-header">
      <div className="panel-heading">
        <AdaptivePanelTitle full="Iteration Visualizer" short="Visualizer"/><VersionPanelSwitch onClick={onSwitchPanel} target="Version stream"/>
      </div>
      <div className="panel-header-actions" inert={view === 'turning' || view === 'returning' || view === 'orbiting'}>
        <div className="gallery-range">
          <RowSelect label="Date range" value={range} onChange={value => { setRange(value as RangeKey); setNow(Date.now()); }}
            options={ranges}/>
        </div>
        <div className="gallery-frame-picker-slot" ref={setFramePickerSlot}/>
      </div>
    </header>
    {error && <div className="gallery-message" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
    {!catalog ? <div className="gallery-empty">{error ? 'Screenshot catalog unavailable.' : 'Reading saved frames…'}</div>
      : !versions.length ? <div className="gallery-empty">No saved frames found.</div>
      : <div className="gallery-view-stack" ref={viewStack}>
      {<><AlbumView onSelectFrame={id => select(id, true)} framePickerSlot={framePickerSlot} rangeStats={catalog ? `${counts.versions}/${counts.versionTotal} versions${rangePromptLabel}` : 'Loading frames…'} onMotion={updateTimelineMotion} turning={view === 'turning'} returning={view === 'returning'} hidden={view === 'theater' || view === 'orbiting'} onReturnStarted={startReturn} theaterTarget={target} theaterId={selectedId} onTurnComplete={finishTurn} versions={versions} range={range} now={now} zoom={zoom} onOpen={open} onZoom={setZoom} onCamera={api => { camera.current = api; }}/>{!visibleFrames.length && <div className="gallery-message">No frames in this range. Earlier versions remain visible in gray.</div>}</>}
      {view !== 'album' && <div className="gallery-theater-layer" inert={view === 'turning' || view === 'returning'} aria-hidden={view === 'turning' || view === 'returning'}><TheaterView navigationKey={navigationKey} references={catalog?.references ?? []} baseline={baseline ?? t.viewportPresets[1]} frames={visibleFrames} catalog={versions.flatMap(version => version.frames)} range={range} now={now} selectedId={selectedId} onSelect={select} onOrbit={(id, rect) => camera.current?.orbit(id, rect, () => { setSelectedId(id); setView('orbiting'); }, () => { setView('album'); setTarget(null); }) ?? null} onDismiss={exit} active={view === 'theater'}/></div>}
      </div>}
    <footer className="gallery-footer" inert={view === 'turning' || view === 'returning' || view === 'orbiting'}>
      <TrackedInterface value={interfaceId} onChange={setInterfaceId}/>
      {view !== 'theater' && view !== 'orbiting' && <div className="panel-header-actions">
        <button className="icon-button" aria-label="Zoom gallery out" disabled={zoom <= t.zoomMin} onClick={() => setZoom(Math.max(t.zoomMin, zoom - t.zoomStep))}><Icon name="minus"/></button>
        <button className="icon-button" aria-label="Reset gallery zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
        <button className="icon-button" aria-label="Zoom gallery in" disabled={zoom >= t.zoomMax} onClick={() => setZoom(Math.min(t.zoomMax, zoom + t.zoomStep))}><Icon name="plus"/></button>
        <div className="album-camera-actions">
          <ResetViewButton onReset={() => camera.current?.reset()} onCenter={() => camera.current?.center()}/>
        </div>
      </div>}
    </footer>
  </section>;
}
