import { PanelIcon } from '../../components/PanelIcon';
import { attachFrame, writeFrameDrag } from '../workbench/frame-context';
import { annotationBookmarkColor } from '../annotations/appearance';
import { FrameAnnotations } from '../annotations/FrameAnnotations';
import "@phosphor-icons/web/fill/style.css";
import { ReferenceFiles } from '../../components/ReferenceFiles';
import { frameReferences, type VisualReference } from './references';
import { EmbeddedPrototype, type RuntimeMode } from './EmbeddedPrototype';
import { liveFrameIds } from './runtime-targets';
import { usePrototype } from './usePrototype';
import { formatVersion } from './model';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { GalleryFrame, LoopMode, RangeKey } from './model';
import { formatTime, playbackStep, ranges, inRange } from './model';
import { galleryTokens as t } from './tokens';
import { presentedFrame, theaterFrameSize, wheelFrameDelta } from './theater-layout';
import { FrameLoader } from './frame-loader';
import { adjacentTimelineIndex, type JumpScale } from './timeline';
import { PlaybackJump } from './PlaybackJump';
import { PlaybackTimeline } from './PlaybackTimeline';
import { containedFrameTarget, reservedControlContains } from './theater-transition';
import type { TheaterOrbit, TheaterTarget } from './theater-transition';
import { theaterCaption, theaterCaptionLead } from './theater-layout';
import { Icon } from '../../components/Icon';
import { RowSelect } from '../../components/RowSelect';

function PlaybackTip({ label, children, edge }: { label: string; children: ReactNode; edge?: 'start' | 'end' }) {
  const [hover, setHover] = useState(false);
  return <span className={`playback-tip${edge ? ` is-${edge}` : ''}`} onFocus={() => setHover(true)} onBlur={() => setHover(false)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    {children}
    {hover && <span className="capsule-tooltip" role="tooltip">{label}</span>}
  </span>;
}

const loopModes: { value: LoopMode; label: string }[] = [{ value: 'once', label: 'No loop' }, { value: 'loop', label: 'Loop' }, { value: 'ping-pong', label: 'Ping-pong' }];

const frameContextOf = (frame: GalleryFrame) => ({ id: frame.id, url: `${import.meta.env.BASE_URL}${frame.url}`, label: `${formatVersion(frame.version)} · ${frame.summary}`, filename: frame.filename });

export function TheaterView({ runtimeCatalog, liveRequestKey = 0, onRuntimeChange, onPlaybackVersion, navigationKey, references, frames, catalog, range, now, selectedId, onSelect, onOrbit, onDismiss, active, baseline }: { runtimeCatalog: GalleryFrame[]; liveRequestKey?:number; onRuntimeChange?:(mode:RuntimeMode|null)=>void; onPlaybackVersion?:(version:number|null)=>void; navigationKey: number; references: VisualReference[]; baseline: { width: number; height: number }; active: boolean; onOrbit: (id: string, target: TheaterTarget) => TheaterOrbit | null; onDismiss: () => void; frames: GalleryFrame[]; catalog: GalleryFrame[]; range: RangeKey; now: number; selectedId: string; onSelect: (id: string, animate?: boolean) => void }) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ pointer: number; x: number; y: number; frameClick: boolean; orbit: TheaterOrbit | null } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode | null>(null);
  const [runtimeExiting, setRuntimeExiting] = useState(false);
  const runtimeExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (runtimeExitTimer.current) clearTimeout(runtimeExitTimer.current); }, []);
  function openRuntime(mode: RuntimeMode) {
    if (runtimeExitTimer.current) clearTimeout(runtimeExitTimer.current);
    runtimeExitTimer.current = null;
    setRuntimeExiting(false); setRuntimeMode(mode);
  }
  const entryButton = useRef<HTMLButtonElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (runtimeMode) exitButton.current?.focus(); }, [runtimeMode]);
  const handledLiveRequest = useRef(0);
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (runtimeExitTimer.current) clearTimeout(runtimeExitTimer.current);
    runtimeExitTimer.current = null;
    setRuntimeExiting(false); setRuntimeMode(null);
  }, [selectedId, active]);
  useEffect(() => { onRuntimeChange?.(runtimeMode); }, [runtimeMode, onRuntimeChange]);
  useEffect(() => () => onRuntimeChange?.(null), [onRuntimeChange]);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<LoopMode>('once');
  const [jumpScale, setJumpScale] = useState<JumpScale>(() => {
    try { return localStorage.getItem('mitwerk-playback-jump-scale') === 'version' ? 'version' : 'frame'; } catch { return 'frame'; }
  });
  const [direction, setDirection] = useState(1);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const actions = actionsRef.current;
    const buttons = actions?.querySelector<HTMLElement>('.theater-action-buttons');
    if (!actions || !buttons) return;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(buttons).columnGap) || 0;
      const children = [...buttons.children] as HTMLElement[];
      const required = children.reduce((sum, child) => sum + child.getBoundingClientRect().width, 0) + Math.max(0, children.length - 1) * gap;
      buttons.classList.toggle('is-wrapped', required > buttons.clientWidth + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(buttons); [...buttons.children].forEach(child => observer.observe(child)); measure();
    return () => observer.disconnect();
  });
  const metaRef = useRef<HTMLDivElement>(null);
  const wheel = useRef(0);
  const stepFrame = useRef<(move: number) => void>(() => {});
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [stageMeasured, setStageMeasured] = useState(false);
  const index = frames.findIndex(frame => frame.id === selectedId);
  const branches = useMemo(() => [...new Set(catalog.map(item => item.branch).filter((branch): branch is string => !!branch))], [catalog]);
  const requested = catalog.find(item => item.id === selectedId) ?? frames[Math.max(0, index)];
  const [displayed, setDisplayed] = useState<GalleryFrame | null>(null);
  const loader = useRef<FrameLoader | null>(null);
  if (!loader.current) loader.current = new FrameLoader(t.theater.imageCacheSize);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<GalleryFrame | null>(null);
  const previewIndex = frames.findIndex(item => item.id === previewId);
  const previewFrame = frames[previewIndex];
  const frame = presentedFrame(!!previewFrame, previewImage, displayed, requested);
  const prototype = usePrototype(frame, active);
  useEffect(() => {
    setPlaying(false); setPreviewId(null); setPreviewImage(null); prototype.exit();
  }, [navigationKey]);
  const liveTarget = !!frame && liveFrameIds(runtimeCatalog).has(frame.id);
  const showingPreview = !!previewFrame && !!previewImage;
  const navigationFrames = catalog.filter(item => inRange(item, range, now));
  const navigationIndex = navigationFrames.findIndex(item => item.id === selectedId);
  const previousJump = adjacentTimelineIndex(navigationFrames, navigationIndex, -1, jumpScale);
  const nextJump = adjacentTimelineIndex(navigationFrames, navigationIndex, 1, jumpScale);

  useEffect(() => {
    if (!previewFrame) return;
    let stale = false;
    loader.current!.load(`${import.meta.env.BASE_URL}${previewFrame.url}`).then(() => {
      if (!stale) setPreviewImage(previewFrame);
    }).catch(() => { /* Keep the selected image visible if a preview cannot load. */ });
    return () => { stale = true; };
  }, [previewFrame]);
  const ready = displayed?.id === requested?.id;

  useEffect(() => {
    if (!requested) return;
    let stale = false;
    setFailedImage(null);
    loader.current!.load(`${import.meta.env.BASE_URL}${requested.url}`).then(() => {
      if (!stale) setDisplayed(requested);
    }).catch(() => { if (!stale) { setFailedImage(requested.id); setPlaying(false); } });
    return () => { stale = true; };
  }, [requested]);

  useEffect(() => {
    if (!requested) return;
    let nextIndex = index, nextDirection = direction;
    for (let offset = 0; offset < t.theater.preloadFrames; offset++) {
      const next = playbackStep(nextIndex, frames.length, nextDirection, mode);
      nextIndex = next.index; nextDirection = next.direction;
      void loader.current!.load(`${import.meta.env.BASE_URL}${frames[nextIndex].url}`).catch(() => {});
      if (!next.playing) break;
    }
  }, [requested, frames, index, direction, mode]);
  useEffect(() => { if (!active) setPlaying(false); }, [active]);
  const sequence = frames.map(frame => frame.id).join('|');

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      const meta = metaRef.current?.offsetHeight ?? 0;
      const actions = (actionsRef.current?.offsetHeight ?? 0) + t.theater.actionGap;
      const height = Math.max(0, body.clientHeight - meta - t.theater.metadataGap - actions);
      setStageSize({ width: body.clientWidth, height });
      setStageMeasured(body.clientWidth > 0 && height > 0);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    if (metaRef.current) observer.observe(metaRef.current);
    if (actionsRef.current) observer.observe(actionsRef.current);
    measure();
    return () => observer.disconnect();
  }, [Boolean(frame)]);

  // Follow the image actually on screen, never a loading request or hover preview.
  const playingVersion = playing && active ? displayed?.version ?? null : null;
  useEffect(() => { onPlaybackVersion?.(playingVersion); }, [playingVersion, onPlaybackVersion]);
  useEffect(() => () => onPlaybackVersion?.(null), [onPlaybackVersion]);

  useEffect(() => { setPlaying(false); setDirection(1); setPreviewId(null); setPreviewImage(null); wheel.current = 0; }, [sequence]);
  useEffect(() => {
    if (!playing || !frame || !ready || !active || previewFrame) return;
    const timer = window.setTimeout(() => {
      const next = playbackStep(index, frames.length, direction, mode);
      onSelect(frames[next.index].id); setDirection(next.direction); setPlaying(next.playing);
    }, t.playbackIntervalMs / speed);
    return () => window.clearTimeout(timer);
  }, [playing, frame, ready, active, previewFrame, index, frames, direction, mode, speed, onSelect]);
  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * stageSize.height : event.deltaY;
      const result = wheelFrameDelta(pixels, wheel.current, t.theater.wheelStep);
      wheel.current = result.accumulated;
      if (result.move) stepFrame.current(result.move);
    };
    screen.addEventListener('wheel', onWheel, { passive: false });
    return () => screen.removeEventListener('wheel', onWheel);
  }, [Boolean(frame), stageSize.height]);
  useEffect(() => {
    if (prototype.error) setToast(prototype.error);
  }, [prototype.error]);
  useEffect(() => {
    if (!active || !ready || !liveRequestKey || handledLiveRequest.current === liveRequestKey) return;
    handledLiveRequest.current = liveRequestKey;
    if (liveRequestKey < 0) { exitPrototype(); return; }
    setPlaying(false); setPreviewId(null); setPreviewImage(null); openRuntime('live');
  }, [active, ready, liveRequestKey]);
  const capturedRuntime = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (capturedRuntime.current || params.get('screenshot') !== '1' || !active || !ready) return;
    if (params.get('prototypeOpen') === '1' && prototype.available && frame?.kind === 'push') {
      capturedRuntime.current = true; setPlaying(false); openRuntime('prototype'); void prototype.enter();
    }
  }, [prototype.available, frame?.id, active, ready]);
  const capturedFrameChip = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (capturedFrameChip.current || params.get('screenshot') !== '1' || params.get('frameChip') !== '1' || !active || !ready || !frame) return;
    capturedFrameChip.current = true; attachFrame(frameContextOf(frame));
  }, [frame?.id, active, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!frame) return <div className="gallery-empty">No frames in this date range. Choose a wider range to play.</div>;
  const naturalFrame = theaterFrameSize(stageSize, baseline, baseline);
  const staticRatio = baseline.width / Math.max(baseline.height, 1);
  const staticHeight = Math.min(naturalFrame.height, stageSize.height);
  const staticFrame = { width: staticHeight * staticRatio, height: staticHeight };
  const frameSize = staticFrame;
  function selectFrame(next: number) {
    prototype.exit();
    const nextFrame = frames[next];
    if (previewImage?.id === nextFrame.id) setDisplayed(previewImage);
    setPlaying(false); setPreviewId(null); setPreviewImage(null); onSelect(nextFrame.id);
  }
  stepFrame.current = move => {
    if (runtimeMode || !active || frames.length < 2 || gesture.current) return;
    const next = Math.max(0, Math.min(frames.length - 1, index + move));
    if (next !== index) selectFrame(next);
  };
  function jump(next: number | null) {
    if (next === null) return;
    setDirection(1); prototype.exit(); setPlaying(false); setPreviewId(null); setPreviewImage(null); onSelect(navigationFrames[next].id, true);
  }
  function chooseJump(scale: JumpScale, direction: -1 | 1) {
    setJumpScale(scale);
    try { localStorage.setItem('mitwerk-playback-jump-scale', scale); } catch { /* Keep the session preference when storage is unavailable. */ }
    jump(adjacentTimelineIndex(navigationFrames, navigationIndex, direction, scale));
  }

  const frameContext = () => frameContextOf(frame);
  function goToCommit() {
    if (!frame) return;
    window.dispatchEvent(new CustomEvent('mitwerk-go-to-commit', { detail: { version: frame.version } }));
  }
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (runtimeMode || !active || !event.isPrimary || event.button !== 0 || gesture.current) return;
    const root = event.currentTarget;
    if ((event.target as HTMLElement).closest('button, input, select, label, a, [data-orbit-blocked]')) return;
    // Control rows reserve their own box and margins; open gaps between them dismiss theater.
    const blocked = [...root.querySelectorAll<HTMLElement>('[data-orbit-blocked]:not([data-orbit-inline])')].some(element => {
      const style = getComputedStyle(element);
      const margin = (side: string) => parseFloat(style.getPropertyValue(`margin-${side}`)) || 0;
      const bounds = element.getBoundingClientRect(), row = root.getBoundingClientRect();
      return reservedControlContains(
        { left: row.left, width: row.width, top: row.top, height: row.height },
        { left: bounds.left, width: bounds.width, top: bounds.top, height: bounds.height },
        event.clientX, event.clientY,
        { left: margin('left'), right: margin('right'), top: margin('top'), bottom: margin('bottom') },
      );
    });
    if (blocked) return;
    const frameClick = !!(event.target as HTMLElement).closest('.theater-screen');
    gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, frameClick, orbit: null };
    // The frame image is a native drag source for chat; orbit starts from the theater area around it.
    if (!frameClick) root.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId || drag.frameClick) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.orbit && Math.hypot(dx, dy) >= t.webgl.dragThreshold) {
      const screen = event.currentTarget.querySelector('.theater-screen');
      if (!screen) return;
      const target = containedFrameTarget(screen.getBoundingClientRect(), frame!.width, frame!.height);
      drag.orbit = onOrbit(frame!.id, target);
      if (!drag.orbit) return;
      setPlaying(false);
    }
    drag.orbit?.move(dx, dy);
  }
  function pointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    gesture.current = null;
    drag.orbit?.end();
    if (!drag.orbit && event.type === 'pointerup') {
      if (drag.frameClick) goToCommit();
      else onDismiss();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function enterPrototype() {
    setPlaying(false); setPreviewId(null); setPreviewImage(null);
    if (liveTarget) { openRuntime('live'); return; }
    if (prototype.available === false) { setToast('No saved codebase for this push.'); return; }
    openRuntime('prototype'); void prototype.enter();
  }
  function exitPrototype() {
    if (runtimeExitTimer.current || runtimeExiting) return;
    setRuntimeExiting(true);
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : t.annotations.exitMs;
    runtimeExitTimer.current = setTimeout(() => {
      runtimeExitTimer.current = null;
      prototype.exit(); setRuntimeMode(null); setRuntimeExiting(false);
      requestAnimationFrame(() => entryButton.current?.focus());
    }, duration);
  }

  const playbackOptions = <div className="playback-options">
        <RowSelect label="Playback speed" value={String(speed)} onChange={value => setSpeed(+value)} options={t.speeds.map(value => ({ value: String(value), label: `${value}×` }))}/>
        <RowSelect label="Playback loop" value={mode} onChange={value => { setMode(value as LoopMode); setDirection(1); }} options={loopModes}/>
        </div>;
  const rangeLabel = ranges.find(option => option.value === range)!.label.toLowerCase();
  const rangeFrames = catalog.filter(item => inRange(item, range, now));
  const atRangeStart = rangeFrames[0]?.id === selectedId;
  const atRangeEnd = rangeFrames.at(-1)?.id === selectedId;
  function scrollTimeline(edge: 'start' | 'end') {
    const next = edge === 'start' ? rangeFrames[0] : rangeFrames.at(-1);
    if (!next) return;
    prototype.exit(); setPlaying(false); setPreviewId(null); setPreviewImage(null);
    onSelect(next.id, true);
  }

  return <div className={`theater-view${runtimeMode ? ' is-runtime' : ''}`} data-runtime-exiting={runtimeExiting} data-frame-id={frame?.id} data-selected-frame-id={requested?.id} data-preview-frame-id={previewFrame?.id} data-range-edge={atRangeEnd ? 'end' : atRangeStart ? 'start' : ''} data-frame-ready={ready && stageMeasured}
    style={{ '--theater-footer-gap': `${t.theater.playbackFooterGap}px`, '--theater-action-buttons-gap': `${t.theater.actionButtonsGap}px` } as CSSProperties}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
    <div className="theater-body" ref={bodyRef} style={{ '--theater-metadata-height': `${t.theater.metadataHeight}px`, '--theater-metadata-max': `${t.theater.metadataHeightMaxVh}vh`, '--theater-metadata-gap': `${t.theater.metadataGap}px` } as CSSProperties}>
      <div className="theater-stage" style={{ width: '100%', '--theater-action-gap': `${t.theater.actionGap}px`, '--theater-frame-bed': t.theater.frameBed } as CSSProperties}>
      <div className="theater-frame-actions" inert={!!runtimeMode} aria-hidden={!!runtimeMode} data-orbit-blocked ref={actionsRef}>
        {frame.kind !== 'push' && <FrameAnnotations key={navigationKey} color={annotationBookmarkColor(frame.branch, branches)} frame={frame} active={active && ready && !playing} onOpen={() => { setPlaying(false); setDisplayed(frame); setPreviewId(null); setPreviewImage(null); onSelect(frame.id); }}/>}
        <div className="theater-action-buttons">

        <button className="theater-text-action frame-chat-action" onClick={event => { event.stopPropagation(); attachFrame(frameContext()); }}><Icon name="plus"/>Add frame to chat</button>
        {(frame.kind === 'push' || liveTarget) && <button ref={entryButton} className="theater-text-action frame-chat-action is-enter" disabled={!active || (!liveTarget && (prototype.loading || prototype.available === null))} onClick={enterPrototype}>
          {liveTarget ? <PanelIcon name="globe"/> : <Icon name="play"/>}{liveTarget ? 'Live server' : 'Enter prototype'}
        </button>}
        </div>
      </div>
        <div className={`theater-screen${displayed?.kind === 'push' ? ' is-push' : ''}${runtimeMode ? ' is-runtime-screen' : ''}`} inert={runtimeExiting} ref={screenRef} style={{ height: frameSize.height, width: '100%' }}
          onDragStart={event => { if (runtimeMode) { event.preventDefault(); return; } setPlaying(false); writeFrameDrag(event.dataTransfer, frameContext()); }}>
          {runtimeMode ? <EmbeddedPrototype key={runtimeMode} mode={runtimeMode} url={prototype.url} loading={prototype.loading} error={prototype.error} version={frame.version} onRetry={() => void prototype.enter()}/> : displayed ? <img draggable src={`${import.meta.env.BASE_URL}${displayed.url}`} alt={`${formatVersion(displayed.version)}: ${displayed.summary}`} aria-hidden={showingPreview}/>
            : <div className="gallery-empty">{failedImage ? 'This saved image could not be loaded.' : 'Loading frame…'}</div>}
          {!runtimeMode && showingPreview && <img draggable className="theater-preview-image" src={`${import.meta.env.BASE_URL}${frame.url}`} alt={`Preview ${formatVersion(frame.version)}: ${frame.summary}`}/>}
        </div>
      <div className="theater-metadata" inert={!!runtimeMode} aria-hidden={!!runtimeMode} ref={metaRef} style={{ '--theater-reference-width': `${t.theater.referenceChipWidth}px`, '--line-added': t.theater.addedColor, '--line-removed': t.theater.removedColor, '--theater-row-gap': `${t.theater.metadataRowGap}px`, '--theater-summary-gap': `${t.theater.metadataRowGap * (t.theater.summaryGapScale - 1)}px` } as CSSProperties}>
        {failedImage && displayed && <span role="status" data-orbit-blocked>The next image could not be loaded. The previous frame is still shown.</span>}
        <div className="theater-version" data-orbit-blocked>
          <span className="theater-version-group">
            <span className="theater-version-tag">{formatVersion(frame.version)}</span><span>{theaterCaptionLead(frame).replace(/: $/, '')}</span>
          </span>
          <time dateTime={new Date(frame.timestamp).toISOString()}>{formatTime(frame.timestamp)}</time>
        </div>
        <p className="theater-summary"><span data-orbit-blocked data-orbit-inline>{theaterCaption(frame)}</span></p>
        <div className="theater-branch-row">
          {frame.branch && <span className="theater-branch"><Icon name="branch" size={12}/>{frame.branch}</span>}
          {(frame.added !== null || frame.removed !== null) && <span className="gallery-small theater-lines"><span className="is-added">+{frame.added ?? '0'}</span> <span className="is-removed">−{frame.removed ?? '0'}</span> lines</span>}
        </div>
        <ReferenceFiles files={frameReferences(frame, catalog, references)}/>
      </div>
      </div>
    </div>
    <div className="theater-playback" data-orbit-blocked>
      {runtimeMode && <div className="runtime-exit-scrim" inert={runtimeExiting}>
        <button ref={exitButton} className="theater-text-action" onClick={exitPrototype}><Icon name="close"/>Exit {runtimeMode === 'live' ? 'live server' : 'prototype'}</button>
      </div>}
      <div className="gallery-toolbar playback-controls" inert={!!runtimeMode} aria-hidden={!!runtimeMode} style={{ '--playback-enabled': t.theater.playbackEnabled, '--playback-disabled': t.theater.playbackDisabled } as CSSProperties}>
        <PlaybackTip label={`Jump to timeline start (${rangeLabel})`} edge="start"><button className="icon-button" aria-label="Jump to timeline start" disabled={!rangeFrames.length || atRangeStart} onClick={() => scrollTimeline('start')}><i className="ph-fill ph-caret-line-left" aria-hidden="true"/></button></PlaybackTip>
        <div className="playback-transport">
        <PlaybackJump direction={-1} scale={jumpScale} unavailable={previousJump === null} onJump={() => jump(previousJump)} onChoose={scale => chooseJump(scale, -1)}/>
        <PlaybackTip label={playing ? 'Pause' : 'Play'}><button className="icon-button playback-toggle" onClick={() => { prototype.exit(); if (!playing && mode === 'once' && index === frames.length - 1) onSelect(frames[0].id); setPlaying(!playing); }} disabled={frames.length < 2} aria-label={playing ? 'Pause playback' : 'Play frames'}><Icon name={playing ? 'pause' : 'play'}/></button></PlaybackTip>
        <PlaybackJump direction={1} scale={jumpScale} unavailable={nextJump === null} onJump={() => jump(nextJump)} onChoose={scale => chooseJump(scale, 1)}/>
        </div>
        <div className="playback-end-controls">
          {playbackOptions}
          <PlaybackTip label={`Jump to timeline end (${rangeLabel})`} edge="end"><button className="icon-button" aria-label="Jump to timeline end" disabled={!rangeFrames.length || atRangeEnd} onClick={() => scrollTimeline('end')}><i className="ph-fill ph-caret-line-right" aria-hidden="true"/></button></PlaybackTip>
        </div>
      </div>
      <div className="runtime-passive-timeline" inert={!!runtimeMode} aria-hidden={!!runtimeMode}><PlaybackTimeline navigationKey={navigationKey} viewportRef={timelineRef} frames={frames} catalog={catalog} range={range} now={now} index={Math.max(0, index)} selectedId={selectedId} previewIndex={previewIndex} onPreview={next => { if (prototype.open || prototype.loading) return; setPreviewId(next === null ? null : frames[next].id); if (next === null) setPreviewImage(null); }} onSelect={selectFrame} onSelectPush={id => { prototype.exit(); setPlaying(false); setPreviewId(null); setPreviewImage(null); onSelect(id); }}/></div>
      {toast && <div className="project-toast" role="status">{toast}</div>}
    </div>
  </div>;
}
