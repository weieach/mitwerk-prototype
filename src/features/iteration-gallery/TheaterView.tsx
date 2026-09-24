import { formatVersion, galleryBranchPaint } from './model';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { GalleryFrame, LoopMode, RangeKey } from './model';
import { formatTime, playbackStep } from './model';
import { galleryTokens as t } from './tokens';
import { presentedFrame, theaterFrameSize, wheelFrameDelta } from './theater-layout';
import { FrameLoader } from './frame-loader';
import { adjacentPushIndex } from './timeline';
import { PlaybackTimeline } from './PlaybackTimeline';
import { containedFrameTarget, reservedControlContains } from './theater-transition';
import type { TheaterOrbit, TheaterTarget } from './theater-transition';
import { theaterCaption } from './theater-layout';
import { Icon } from '../../components/Icon';

export function TheaterView({ frames, catalog, range, now, selectedId, onSelect, onOrbit, onDismiss, active, baseline }: { baseline: { width: number; height: number }; active: boolean; onOrbit: (id: string, target: TheaterTarget) => TheaterOrbit | null; onDismiss: () => void; frames: GalleryFrame[]; catalog: GalleryFrame[]; range: RangeKey; now: number; selectedId: string; onSelect: (id: string) => void }) {
  const gesture = useRef<{ pointer: number; x: number; y: number; frameClick: boolean; orbit: TheaterOrbit | null } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<LoopMode>('loop');
  const [direction, setDirection] = useState(1);
  const [preset, setPreset] = useState('original');
  const [interfaceId, setInterfaceId] = useState<string>(t.interfaces[0].value);
  const [custom, setCustom] = useState({ width: 1280, height: 800 });
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const wheel = useRef(0);
  const stepFrame = useRef<(move: number) => void>(() => {});
  const [stageSize, setStageSize] = useState({ width: 600, height: 220 });
  const index = Math.max(0, frames.findIndex(frame => frame.id === selectedId));
  const branches = useMemo(() => [...new Set(catalog.map(item => item.branch).filter((branch): branch is string => !!branch))], [catalog]);
  const requested = frames[index];
  const [displayed, setDisplayed] = useState<GalleryFrame | null>(null);
  const loader = useRef<FrameLoader | null>(null);
  if (!loader.current) loader.current = new FrameLoader(t.theater.imageCacheSize);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<GalleryFrame | null>(null);
  const previewIndex = frames.findIndex(item => item.id === previewId);
  const previewFrame = frames[previewIndex];
  const frame = presentedFrame(!!previewFrame, previewImage, displayed, requested);
  const showingPreview = !!previewFrame && !!previewImage;
  const previousPush = adjacentPushIndex(frames, index, -1);
  const nextPush = adjacentPushIndex(frames, index, 1);

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

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(body).rowGap || getComputedStyle(body).gap) || t.theater.metadataGap;
      const meta = metaRef.current?.offsetHeight ?? 0;
      setStageSize({ width: body.clientWidth, height: Math.max(120, body.clientHeight - meta - gap - (actionsRef.current?.offsetHeight ?? 0) - t.theater.actionGap) });
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

  if (!frame) return <div className="gallery-empty">No frames in this date range. Choose a wider range to play.</div>;
  const viewport = t.viewportPresets.find(option => option.value === preset)!;
  const dimensions = preset === 'original' ? baseline : preset === 'custom' ? custom : viewport;
  const frameSize = theaterFrameSize(stageSize, baseline, dimensions);
  function selectFrame(next: number) {
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
    setDirection(1); selectFrame(next);
  }

  // Shared placeholder for both frame clicks and the explicit action. Navigation is deferred.
  function goToCommit() {}
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!active || !event.isPrimary || event.button !== 0 || gesture.current) return;
    const root = event.currentTarget;
    if ((event.target as HTMLElement).closest('button, input, select, label, a, [data-orbit-blocked]')) return;
    // Control rows reserve their own box and margins; open gaps between them dismiss theater.
    const blocked = [...root.querySelectorAll<HTMLElement>('[data-orbit-blocked]')].some(element => {
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

  return <div className="theater-view" data-frame-id={frame?.id} data-selected-frame-id={requested?.id} data-preview-frame-id={previewFrame?.id} data-frame-ready={ready}
    style={{ '--theater-footer-gap': `${t.theater.playbackFooterGap}px` } as CSSProperties}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
    <div className="gallery-toolbar" data-orbit-blocked>
      <select aria-label="Tracked interface" value={interfaceId} onChange={event => setInterfaceId(event.target.value)}>
        {t.interfaces.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <select value={preset} onChange={event => setPreset(event.target.value)} aria-label="Preview viewport">
        {t.viewportPresets.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {preset === 'custom' && <div className="gallery-custom-size">
        <input aria-label="Custom viewport width" type="number" min="120" max="4096" value={custom.width} onChange={event => setCustom({ ...custom, width: Math.max(120, Math.min(4096, +event.target.value || 120)) })}/>
        <span>×</span><input aria-label="Custom viewport height" type="number" min="120" max="4096" value={custom.height} onChange={event => setCustom({ ...custom, height: Math.max(120, Math.min(4096, +event.target.value || 120)) })}/>
      </div>}
      <span className="gallery-small">{dimensions.width} × {dimensions.height}</span>

    </div>
    <div className="theater-body" ref={bodyRef} style={{ '--theater-metadata-height': `${t.theater.metadataHeight}px`, '--theater-metadata-gap': `${t.theater.metadataGap}px` } as CSSProperties}>
      <div className="theater-stage" style={{ width: frameSize.width, '--theater-action-gap': `${t.theater.actionGap}px` } as CSSProperties}>
      <div className="theater-frame-actions" data-orbit-blocked ref={actionsRef}>
        <button className="theater-text-action" onClick={goToCommit}><Icon name="commit"/>Go to commit</button>
        <button className="theater-text-action" onClick={event => event.stopPropagation()}><Icon name="plus"/>Add frame to chat</button>
      </div>
        <div className="theater-screen" ref={screenRef} style={{ height: frameSize.height, width: '100%' }}>
          {displayed ? <img draggable={false} src={`${import.meta.env.BASE_URL}${displayed.url}`} alt={`${formatVersion(displayed.version)}: ${displayed.summary}`} aria-hidden={showingPreview}/>
            : <div className="gallery-empty">{failedImage ? 'This saved image could not be loaded.' : 'Loading frame…'}</div>}
          {showingPreview && <img draggable={false} className="theater-preview-image" src={`${import.meta.env.BASE_URL}${frame.url}`} alt={`Preview ${formatVersion(frame.version)}: ${frame.summary}`}/>}
        </div>
      </div>
      <div className="theater-metadata" ref={metaRef} style={{ '--line-added': t.theater.addedColor, '--line-removed': t.theater.removedColor, '--theater-row-gap': `${t.theater.metadataRowGap}px`, '--theater-summary-gap': `${t.theater.metadataRowGap * (t.theater.summaryGapScale - 1)}px` } as CSSProperties}>
        {failedImage && displayed && <span role="status" data-orbit-blocked>The next image could not be loaded. The previous frame is still shown.</span>}
        <div className="theater-version" data-orbit-blocked><strong>{formatVersion(frame.version)} · {frame.kind} {frame.number ?? ''}</strong><time dateTime={new Date(frame.timestamp).toISOString()}>{formatTime(frame.timestamp)}</time></div>
        <p className="theater-summary"><em>{theaterCaption(frame)}</em></p>
        {(frame.branch || frame.added) && <div className="theater-branch-row">
          {frame.branch && <span className="theater-branch-tag" style={{ borderColor: galleryBranchPaint(frame.branch, branches) }}><Icon name="branch" size={12}/>{frame.branch}</span>}
          {frame.added ? <span className="gallery-small theater-lines"><span className="is-added">+{frame.added}</span> <span className="is-removed">−{frame.removed}</span> lines</span> : null}
        </div>}
      </div>
    </div>
    <div className="theater-playback" data-orbit-blocked>
      <div className="gallery-toolbar playback-controls">
        <div className="playback-transport">
        <button className="icon-button" onClick={() => skipPush(previousPush)} disabled={previousPush === null} aria-label="Previous push">◀◀</button>
        <button className="icon-button playback-toggle" onClick={() => { if (!playing && mode === 'once' && index === frames.length - 1) onSelect(frames[0].id); setPlaying(!playing); }} disabled={frames.length < 2} aria-label={playing ? 'Pause playback' : 'Play frames'}><Icon name={playing ? 'pause' : 'play'} size={20}/></button>
        <button className="icon-button" onClick={() => skipPush(nextPush)} disabled={nextPush === null} aria-label="Next push">▶▶</button>
        </div>
        <div className="playback-options">
        <label><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={speed} onChange={event => setSpeed(+event.target.value)}>{t.speeds.map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
        <select aria-label="Playback loop" value={mode} onChange={event => { setMode(event.target.value as LoopMode); setDirection(1); }}><option value="once">Play once</option><option value="loop">Loop</option><option value="ping-pong">Ping-pong</option></select>
        </div>
      </div>
      <PlaybackTimeline frames={frames} catalog={catalog} range={range} now={now} index={index} previewIndex={previewIndex} onPreview={next => { setPreviewId(next === null ? null : frames[next].id); if (next === null) setPreviewImage(null); }} onSelect={selectFrame}/>
    </div>
  </div>;
}
