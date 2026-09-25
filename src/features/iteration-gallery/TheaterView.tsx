import "@phosphor-icons/web/fill/style.css";
import { ReferenceFiles } from '../../components/ReferenceFiles';
import { frameReferences, type VisualReference } from './references';
import { FullscreenPreview } from './FullscreenPreview';
import { usePrototype } from './usePrototype';
import { BranchTag } from '../../components/BranchTag';
import { formatVersion, galleryBranchPaint } from './model';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { GalleryFrame, LoopMode, RangeKey } from './model';
import { formatTime, playbackStep, ranges, inRange } from './model';
import { galleryTokens as t } from './tokens';
import { aspectRatioLabel, fitPrototypeFrame, presentedFrame, theaterFrameSize, wheelFrameDelta } from './theater-layout';
import { FrameLoader } from './frame-loader';
import { adjacentPushIndex } from './timeline';
import { PlaybackTimeline } from './PlaybackTimeline';
import { containedFrameTarget, reservedControlContains } from './theater-transition';
import type { TheaterOrbit, TheaterTarget } from './theater-transition';
import { theaterCaption, theaterCaptionLead } from './theater-layout';
import { Icon } from '../../components/Icon';
import { TrackedInterface } from './TrackedInterface';

function PlaybackTip({ label, children, edge }: { label: string; children: ReactNode; edge?: 'start' | 'end' }) {
  const [hover, setHover] = useState(false);
  return <span className={`playback-tip${edge ? ` is-${edge}` : ''}`} onFocus={() => setHover(true)} onBlur={() => setHover(false)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    {children}
    {hover && <span className="capsule-tooltip" role="tooltip">{label}</span>}
  </span>;
}

export function TheaterView({ navigationKey, references, frames, catalog, range, now, selectedId, onSelect, onOrbit, onDismiss, active, baseline, interfaceId, onInterface }: { navigationKey: number; references: VisualReference[]; baseline: { width: number; height: number }; active: boolean; interfaceId: string; onInterface: (value: string) => void; onOrbit: (id: string, target: TheaterTarget) => TheaterOrbit | null; onDismiss: () => void; frames: GalleryFrame[]; catalog: GalleryFrame[]; range: RangeKey; now: number; selectedId: string; onSelect: (id: string, animate?: boolean) => void }) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ pointer: number; x: number; y: number; frameClick: boolean; orbit: TheaterOrbit | null } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [enterReady, setEnterReady] = useState(false);
  const [enterSettled, setEnterSettled] = useState(false);
  const enterShape = useRef<HTMLButtonElement>(null);
  const enterLabel = useRef<HTMLSpanElement>(null);
  useEffect(() => { setFullscreenId(null); }, [selectedId, active]);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<LoopMode>('loop');
  const [direction, setDirection] = useState(1);
  const [preset, setPreset] = useState('original');
  const [custom, setCustom] = useState({ width: 1280, height: 800 });
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
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
  const fullscreen = active && frame?.kind === 'push' && fullscreenId === frame.id;
  const showingPreview = !!previewFrame && !!previewImage;
  const previousPush = adjacentPushIndex(catalog, Math.max(0, catalog.findIndex(item => item.id === selectedId)), -1);
  const nextPush = adjacentPushIndex(catalog, Math.max(0, catalog.findIndex(item => item.id === selectedId)), 1);

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
    if (prototype.open) setEnterSettled(true);
  }, [prototype.open]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('screenshot') !== '1') return;
    if (params.get('viewport') === 'phone') setPreset('phone');
    if (params.get('prototypeOpen') === '1' && prototype.available && frame?.kind === 'push') {
      setPlaying(false);
      if (params.get('overlay') === '1') setFullscreenId(frame.id);
      void prototype.enter();
    }
  }, [prototype.available, frame?.id, frame?.kind]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const lingerKey = `${previewFrame?.id ?? requested?.id ?? ''}:${(previewFrame ?? requested)?.kind ?? ''}`;
  useEffect(() => {
    setEnterReady(false);
    setEnterSettled(false);
    if (!lingerKey.endsWith(':push')) return;
    const timer = window.setTimeout(() => setEnterReady(true), t.theater.enterDelayMs);
    return () => window.clearTimeout(timer);
  }, [lingerKey]);
  useEffect(() => {
    const shape = enterShape.current;
    const label = enterLabel.current;
    if (!enterReady || enterSettled || !shape || !label) return;
    const expand = shape.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: t.theater.enterExpandMs, easing: 'ease-out', fill: 'forwards' });
    const fade = label.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t.theater.enterFadeMs, delay: t.theater.enterExpandMs, easing: 'ease-out', fill: 'forwards' });
    return () => { expand.cancel(); fade.cancel(); };
  }, [enterReady, enterSettled]);

  if (!frame) return <div className="gallery-empty">No frames in this date range. Choose a wider range to play.</div>;
  const viewport = t.viewportPresets.find(option => option.value === preset)!;
  const dimensions = preset === 'original' ? baseline : preset === 'custom' ? custom : viewport;
  const naturalFrame = theaterFrameSize(stageSize, baseline, baseline);
  const staticRatio = baseline.width / Math.max(baseline.height, 1);
  const staticHeight = Math.min(naturalFrame.height, stageSize.height);
  const staticFrame = { width: staticHeight * staticRatio, height: staticHeight };
  const prototypeFrame = fitPrototypeFrame({ width: stageSize.width, height: staticFrame.height }, dimensions);
  const frameSize = frame?.kind === 'push' && prototype.open ? prototypeFrame : staticFrame;
  function selectFrame(next: number) {
    prototype.exit();
    const nextFrame = frames[next];
    if (previewImage?.id === nextFrame.id) setDisplayed(previewImage);
    setPlaying(false); setPreviewId(null); setPreviewImage(null); onSelect(nextFrame.id);
  }
  stepFrame.current = move => {
    if (!active || frames.length < 2 || gesture.current) return;
    const next = Math.max(0, Math.min(frames.length - 1, index + move));
    if (next !== index) selectFrame(next);
  };
  function skipPush(next: number | null) {
    if (next === null) return;
    const push = catalog[next];
    if (!push) return;
    setDirection(1); setPlaying(false); setPreviewId(null); setPreviewImage(null); onSelect(push.id);
  }

  function goToCommit() {
    if (!frame) return;
    window.dispatchEvent(new CustomEvent('mitwerk-go-to-commit', { detail: { version: frame.version } }));
  }
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!active || !event.isPrimary || event.button !== 0 || gesture.current) return;
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
    gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, frameClick: !!(event.target as HTMLElement).closest('.theater-screen'), orbit: null };
    root.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
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
    setEnterSettled(true);
    if (prototype.available === false) { setToast('No saved codebase for this push.'); return; }
    if (frame) setFullscreenId(frame.id);
    void prototype.enter();
  }
  const exitPrototype = frame?.kind === 'push' && prototype.open
    ? <button className="theater-text-action is-exit" onClick={() => { prototype.exit(); setFullscreenId(null); }}><Icon name="close"/>Exit prototype</button>
    : null;

  function resizeSide(side: 'left' | 'right', event: ReactPointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    const startX = event.clientX;
    const start = frameSize;
    const handle = event.currentTarget;
    try { handle.setPointerCapture(event.pointerId); } catch { /* A captured pointer is optional; window listeners still resize. */ }
    const move = (pointer: PointerEvent) => {
      const dx = pointer.clientX - startX;
      const width = Math.max(120, Math.min(stageSize.width, start.width + (side === 'right' ? dx : -dx)));
      setPreset('custom');
      setCustom({ width: Math.round(width), height: Math.round(start.height) });
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }
  const prototypeMode = frame.kind === 'push' && prototype.open;

  const playbackOptions = <div className="playback-options">
        <label><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={speed} onChange={event => setSpeed(+event.target.value)}>{t.speeds.map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
        <select aria-label="Playback loop" value={mode} onChange={event => { setMode(event.target.value as LoopMode); setDirection(1); }}><option value="once">Play once</option><option value="loop">Loop</option><option value="ping-pong">Ping-pong</option></select>
        </div>;
  const rangeLabel = ranges.find(option => option.value === range)!.label.toLowerCase();
  const rangeFrames = catalog.filter(frame => inRange(frame, range, now));
  function scrollTimeline(edge: 'start' | 'end') {
    const next = edge === 'start' ? rangeFrames[0] : rangeFrames.at(-1);
    if (!next) return;
    prototype.exit(); setPlaying(false); setPreviewId(null); setPreviewImage(null);
    onSelect(next.id, true);
  }

  return <div className="theater-view" data-frame-id={frame?.id} data-selected-frame-id={requested?.id} data-preview-frame-id={previewFrame?.id} data-frame-ready={ready && stageMeasured}
    style={{ '--theater-footer-gap': `${t.theater.playbackFooterGap}px` } as CSSProperties}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
    {fullscreen && <FullscreenPreview label={`${formatVersion(frame.version)} full screen`} ratio={dimensions.width / dimensions.height}
      onClose={() => setFullscreenId(null)} footer={null}>
      {prototype.open && prototype.url
        ? <iframe className="theater-prototype" src={prototype.url} title={`${formatVersion(frame.version)} interactive archived prototype`}
            sandbox="allow-scripts" referrerPolicy="no-referrer"/>
        : <img draggable={false} src={`${import.meta.env.BASE_URL}${frame.url}`} alt={`${formatVersion(frame.version)}: ${frame.summary}`}/>}
    </FullscreenPreview>}
    <div className="gallery-toolbar theater-top-toolbar" data-orbit-blocked>
      <TrackedInterface value={interfaceId} onChange={onInterface}/>
      <div className="playback-options-top">{playbackOptions}</div>
      {prototypeMode && <>
      <select value={preset} onChange={event => setPreset(event.target.value)} aria-label="Preview viewport">
        {t.viewportPresets.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {preset === 'custom' && <div className="gallery-custom-size">
        <input aria-label="Custom viewport width" type="number" min="120" max="4096" value={custom.width} onChange={event => setCustom({ ...custom, width: Math.max(120, Math.min(4096, +event.target.value || 120)) })}/>
        <span>×</span><input aria-label="Custom viewport height" type="number" min="120" max="4096" value={custom.height} onChange={event => setCustom({ ...custom, height: Math.max(120, Math.min(4096, +event.target.value || 120)) })}/>
      </div>}
      <span className="gallery-small">{aspectRatioLabel(dimensions.width, dimensions.height)}</span>
      </>}

    </div>
    <div className="theater-body" ref={bodyRef} style={{ '--theater-metadata-height': `${t.theater.metadataHeight}px`, '--theater-metadata-max': `${t.theater.metadataHeightMaxVh}vh`, '--theater-metadata-gap': `${t.theater.metadataGap}px` } as CSSProperties}>
      <div className="theater-stage" style={{ width: prototypeMode ? '100%' : frameSize.width, '--theater-action-gap': `${t.theater.actionGap}px`, '--theater-frame-bed': t.theater.frameBed } as CSSProperties}>
      <div className="theater-frame-actions" data-orbit-blocked ref={actionsRef}>
        {exitPrototype}
        <button className="theater-text-action" onClick={goToCommit}><Icon name="commit"/>Go to commit</button>
        <button className="theater-text-action" onClick={event => event.stopPropagation()}><Icon name="plus"/>Add frame to chat</button>
        {frame.kind === 'push' && (prototype.open
          ? <button className="theater-text-action" onClick={() => { setPlaying(false); setFullscreenId(frame.id); }}><Icon name="expand"/>Full screen</button>
          : enterReady && <button ref={enterShape} className={`theater-text-action is-enter${enterSettled ? ' is-shown' : ''}`} disabled={!active || prototype.loading} onClick={enterPrototype} style={{ transformOrigin: 'right center' }}>
            <span ref={enterLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="arrow"/>Enter prototype</span>
          </button>)}
      </div>
        {prototypeMode ? <div className="theater-frame-bed" style={{ '--theater-bed-height': `${staticFrame.height}px` } as CSSProperties}><div className={`theater-screen${displayed?.kind === 'push' ? ' is-push' : ''}`} ref={screenRef} data-orbit-blocked style={{ height: frameSize.height, width: frameSize.width }}>
          {!fullscreen && prototype.url && <iframe className="theater-prototype" src={prototype.url} title={`${formatVersion(frame.version)} interactive archived prototype`} sandbox="allow-scripts" referrerPolicy="no-referrer"/>}
          {displayed ? <img draggable={false} src={`${import.meta.env.BASE_URL}${displayed.url}`} alt={`${formatVersion(displayed.version)}: ${displayed.summary}`} aria-hidden={showingPreview}/>
            : <div className="gallery-empty">{failedImage ? 'This saved image could not be loaded.' : 'Loading frame…'}</div>}
          {showingPreview && <img draggable={false} className="theater-preview-image" src={`${import.meta.env.BASE_URL}${frame.url}`} alt={`Preview ${formatVersion(frame.version)}: ${frame.summary}`}/>}
          {prototype.loading && <div className="theater-loading" role="status">Building prototype…</div>}
          {!fullscreen && <>
            <button type="button" className="theater-resize is-left" aria-label="Resize frame from the left" data-orbit-blocked onPointerDown={event => resizeSide('left', event)}/>
            <button type="button" className="theater-resize is-right" aria-label="Resize frame from the right" data-orbit-blocked onPointerDown={event => resizeSide('right', event)}/>
          </>}
        </div></div> : <div className={`theater-screen${displayed?.kind === 'push' ? ' is-push' : ''}`} ref={screenRef} style={{ height: frameSize.height, width: '100%' }}>
          {displayed ? <img draggable={false} src={`${import.meta.env.BASE_URL}${displayed.url}`} alt={`${formatVersion(displayed.version)}: ${displayed.summary}`} aria-hidden={showingPreview}/>
            : <div className="gallery-empty">{failedImage ? 'This saved image could not be loaded.' : 'Loading frame…'}</div>}
          {showingPreview && <img draggable={false} className="theater-preview-image" src={`${import.meta.env.BASE_URL}${frame.url}`} alt={`Preview ${formatVersion(frame.version)}: ${frame.summary}`}/>}
        </div>}
      <div className="theater-metadata" ref={metaRef} style={{ '--theater-reference-width': `${t.theater.referenceChipWidth}px`, '--line-added': t.theater.addedColor, '--line-removed': t.theater.removedColor, '--theater-row-gap': `${t.theater.metadataRowGap}px`, '--theater-summary-gap': `${t.theater.metadataRowGap * (t.theater.summaryGapScale - 1)}px` } as CSSProperties}>
        {failedImage && displayed && <span role="status" data-orbit-blocked>The next image could not be loaded. The previous frame is still shown.</span>}
        <div className="theater-version" data-orbit-blocked>
          <span className="theater-version-group">
            <span className="theater-version-tag">{formatVersion(frame.version)}</span>
            {frame.branch && <BranchTag name={frame.branch} color={galleryBranchPaint(frame.branch, branches)}/>}
            {frame.added ? <span className="gallery-small theater-lines"><span className="is-added">+{frame.added}</span> <span className="is-removed">−{frame.removed}</span> lines</span> : null}
          </span>
          <time dateTime={new Date(frame.timestamp).toISOString()}>{formatTime(frame.timestamp)}</time>
        </div>
        <p className="theater-summary"><span data-orbit-blocked data-orbit-inline>{frame.kind === 'push' ? <strong>{theaterCaptionLead(frame)}</strong> : theaterCaptionLead(frame)}{theaterCaption(frame)}</span></p>
        <ReferenceFiles files={frameReferences(frame, catalog, references)}/>
      </div>
      </div>
    </div>
    <div className="theater-playback" data-orbit-blocked>
      <div className="gallery-toolbar playback-controls">
        <PlaybackTip label={`Scroll to timeline start (${rangeLabel})`} edge="start"><button className="icon-button" aria-label="Scroll to timeline start" disabled={!rangeFrames.length} onClick={() => scrollTimeline('start')}><i className="ph-fill ph-caret-line-left" aria-hidden="true"/></button></PlaybackTip>
        <div className="playback-transport">
        <PlaybackTip label="Jump to last push"><button className="icon-button" onClick={() => skipPush(previousPush)} disabled={previousPush === null} aria-label="Previous push"><span className="skip-marks is-previous"><Icon name="play" size={16}/><Icon name="play" size={16}/></span></button></PlaybackTip>
        <PlaybackTip label={playing ? 'Pause' : 'Play'}><button className="icon-button playback-toggle" onClick={() => { prototype.exit(); if (!playing && mode === 'once' && index === frames.length - 1) onSelect(frames[0].id); setPlaying(!playing); }} disabled={frames.length < 2} aria-label={playing ? 'Pause playback' : 'Play frames'}><Icon name={playing ? 'pause' : 'play'} size={26}/></button></PlaybackTip>
        <PlaybackTip label="Jump to next push"><button className="icon-button" onClick={() => skipPush(nextPush)} disabled={nextPush === null} aria-label="Next push"><span className="skip-marks"><Icon name="play" size={16}/><Icon name="play" size={16}/></span></button></PlaybackTip>
        </div>
        <div className="playback-end-controls">
          <PlaybackTip label={`Scroll to timeline end (${rangeLabel})`} edge="end"><button className="icon-button" aria-label="Scroll to timeline end" disabled={!rangeFrames.length} onClick={() => scrollTimeline('end')}><i className="ph-fill ph-caret-line-right" aria-hidden="true"/></button></PlaybackTip>
        </div>
      </div>
      <PlaybackTimeline navigationKey={navigationKey} viewportRef={timelineRef} frames={frames} catalog={catalog} range={range} now={now} index={Math.max(0, index)} selectedId={selectedId} previewIndex={previewIndex} onPreview={next => { if (prototype.open || prototype.loading) return; setPreviewId(next === null ? null : frames[next].id); if (next === null) setPreviewImage(null); }} onSelect={selectFrame} onSelectPush={id => { prototype.exit(); setPlaying(false); setPreviewId(null); setPreviewImage(null); onSelect(id); }}/>
      {toast && <div className="project-toast" role="status">{toast}</div>}
    </div>
  </div>;
}
