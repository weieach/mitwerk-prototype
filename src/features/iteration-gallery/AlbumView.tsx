import { AnnotationOverlay } from '../annotations/FrameAnnotations';
import { useAnnotations } from '../annotations/store';
import { createPortal } from 'react-dom';
import { SavedFrameSelect } from './SavedFrameSelect';
import { rotationCaptureProgress, uiCaptureProgress } from './theater-transition';
import { formatVersion, galleryPromptLabel } from './model';
import { userPromptText } from './theater-layout';
import type { GalleryCamera, TheaterTarget } from './theater-transition';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryVersion, RangeKey } from './model';
import { formatTime, representativeFrames } from './model';
import { buildAlbum } from './geometry';
import { AlbumScene } from './AlbumScene';
import { InfoTooltip } from '../../components/InfoTooltip';
import { galleryTokens as t } from './tokens';
import { AxisLabels } from './AxisLabels';
import type { AxisLabelsHandle } from './AxisLabels';

export function AlbumView({ simulating = false, extent, framePickerSlot, onSelectFrame, rangeStats, versions, range, now, onOpen, onZoom, onCamera, turning, returning, hidden, focusing, onReturnStarted, theaterTarget, theaterId, onTurnComplete, onMotion }: {
  focusing?: boolean; onMotion: (progress: number) => void; returning: boolean; hidden: boolean; onReturnStarted: () => void; turning: boolean; theaterTarget: TheaterTarget | null; theaterId: string; onTurnComplete: () => void;
  simulating?: boolean; extent?: GalleryVersion[]; framePickerSlot: HTMLDivElement | null; onSelectFrame: (id: string) => void; rangeStats: string;
  versions: GalleryVersion[]; range: RangeKey; now: number;
  onOpen: (id: string) => void; onZoom: (zoom: number) => void;
  onCamera?: (camera: GalleryCamera | null) => void;
}) {
  const annotations = useAnnotations();
  const annotationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    annotations.filter(note => note.frame.kind !== 'push').forEach(note => counts.set(note.frame.id, (counts.get(note.frame.id) ?? 0) + 1));
    return counts;
  }, [annotations]);
  const [annotationId, setAnnotationId] = useState<string | null>(null);
  const annotationFrame = versions.flatMap(version => version.frames).find(frame => frame.id === annotationId);
  const album = useMemo(() => buildAlbum(versions, range, now, extent), [versions, range, now, extent]);
  // The simulator frames the complete history once; the camera then holds still while the album grows into it.
  const frameAlbum = useMemo(() => extent ? buildAlbum(extent, 'all', Date.now()) : null, [extent]);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<AlbumScene | null>(null);
  const axisLabels = useRef<AxisLabelsHandle>(null);
  const callbacks = useRef({ onOpen, onZoom, onCamera, onMotion });
  callbacks.current = { onOpen, onZoom, onCamera, onMotion };
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [tokenView, setTokenView] = useState(false);
  const [keyboardId, setKeyboardId] = useState('');
  const keyboardIdRef = useRef(keyboardId);
  keyboardIdRef.current = keyboardId;
  const active = album.planes.filter(plane => plane.active);
  const hovered = active.find(plane => plane.frame.id === hoveredId);
  const chosen = active.find(plane => plane.frame.id === keyboardId);

  useEffect(() => {
    try {
      scene.current = new AlbumScene(host.current!, {
        annotate: setAnnotationId, tokenView: setTokenView, motion: progress => callbacks.current.onMotion(progress), hover: setHoveredId, open: id => callbacks.current.onOpen(id),
        zoom: value => callbacks.current.onZoom(value), error: setError,
        labels: labels => axisLabels.current?.update(labels),
      });
    } catch { setError('3D rendering is unavailable in this browser. You can still choose and open saved frames below.'); }
    callbacks.current.onCamera?.({ zoom: direction => scene.current?.zoomBy(direction), focus: (id, complete) => { if (scene.current) scene.current.focusFrame(id, complete); else complete(); }, center: () => scene.current?.center(), arrive: () => scene.current?.replayLatestArrival(), reset: () => scene.current?.reset(), top: () => scene.current?.top(), orbit: (id, target, ready, complete) => scene.current?.beginTheaterOrbit(id, target, ready, complete) ?? null });
    return () => { callbacks.current.onCamera?.(null); scene.current?.dispose(); scene.current = null; };
  }, []);
  // Showing the gallery without the reverse turn (bucket change, fallback exit) must release the held Playback turn first.
  useEffect(() => {
    if (!hidden && !returning && !turning && !focusing) scene.current?.releaseTheater();
  }, [hidden, returning, turning, focusing]);
  useEffect(() => {
    if (hidden || returning || (turning && host.current?.dataset.transitionProgress)) return;
    const params = new URLSearchParams(location.search);
    const still = params.get('screenshot') === '1';
    // Still captures show the settled state; interactive simulation animates added and moved frames.
    scene.current?.update(album, versions, representativeFrames(versions, range, now, simulating ? 'start' : 'spread').map(frame => frame.id), simulating && !still, simulating);
    if (simulating) { /* Framed by the effect below. */ }
    else if (still && params.get('galleryView') === 'tokens') scene.current?.top();
    else if (params.get('screenshot') === '1' && ['reset', 'transition', 'timeline-transition'].includes(params.get('galleryView') ?? '')) scene.current?.reset();
    else if (params.get('screenshot') === '1' && params.get('galleryView') !== 'theater') scene.current?.center();
    if (params.get('screenshot') === '1' && params.get('galleryHover') === '1') {
      const candidates = album.planes.filter(plane => plane.active);
      const middle = candidates.reduce<typeof candidates[number] | undefined>((nearest, plane) =>
        !nearest || Math.abs(plane.depth - album.depth / 2) < Math.abs(nearest.depth - album.depth / 2) ? plane : nearest, undefined);
      if (middle) { setKeyboardId(middle.frame.id); scene.current?.pin(middle.frame.id); scene.current?.inspect(middle.frame.id); }
    } else if (keyboardIdRef.current) scene.current?.pin(keyboardIdRef.current);
  }, [album, versions, range, now, simulating]);
  useEffect(() => {
    // Never during a frame focus or turn: those own the camera until Playback opens.
    if (!simulating || !frameAlbum || hidden || returning || focusing || turning) return;
    scene.current?.fit(frameAlbum, new URLSearchParams(location.search).get('screenshot') !== '1');
  }, [simulating, frameAlbum, hidden, returning, focusing, turning]);
  useEffect(() => { scene.current?.setAnnotations(annotationCounts); }, [annotationCounts, album]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('screenshot') !== '1' || params.get('annotationOverlay') !== '1' || params.get('galleryView') === 'theater') return;
    const frame = album.planes.find(plane => plane.active && annotationCounts.has(plane.frame.id));
    if (frame) { setAnnotationId(frame.frame.id); scene.current?.reset(); }
  }, [album, annotations]);
  useEffect(() => {
    if ((!turning && !returning) || !theaterTarget) return;
    if (!scene.current || error) { onTurnComplete(); return; }
    const params = new URLSearchParams(location.search);
    const freeze = params.get('screenshot') === '1' && ['transition', 'timeline-transition'].includes(params.get('galleryView') ?? '');
    const captureProgress = params.get('galleryView') === 'timeline-transition' ? uiCaptureProgress() : rotationCaptureProgress();
    scene.current.turnToTheater(theaterId, theaterTarget, onTurnComplete, freeze && !returning ? captureProgress : undefined, returning, onReturnStarted);
  }, [turning, returning, theaterTarget, theaterId, onTurnComplete, onReturnStarted, error]);

  return <div className="album-webgl" inert={turning || returning || hidden || focusing}>
    {annotationFrame && host.current && <AnnotationOverlay frame={annotationFrame} container={host.current.closest<HTMLElement>('.iteration-gallery')!}
      onClose={() => setAnnotationId(null)} onReturn={() => { setAnnotationId(null); onOpen(annotationFrame.id); }}/>}
    <div ref={host} className="album-3d-viewport" aria-label="Interactive 3D album">
      <AxisLabels ref={axisLabels} animateEntry={simulating && new URLSearchParams(location.search).get('screenshot') !== '1'}/>
      {hovered && !tokenView && !turning && !returning && !hidden && <div className="album-prompt-label"
        style={{top:`${t.promptLabel.topPercent}%`,fontSize:t.promptLabel.fontSize,maxWidth:`calc(100% - ${t.promptLabel.edgeGap * 2}px)`}}>
        {hovered.frame.number !== null && <div className="album-prompt-number">{hovered.frame.kind === 'push' ? 'Push' : 'Prompt'} #{hovered.frame.number}</div>}
        <div>{galleryPromptLabel((hovered.frame.fullPrompt && userPromptText(hovered.frame.fullPrompt)) ?? hovered.frame.commitMessage ?? hovered.frame.summary)}</div>
      </div>}
      {rangeStats && <span className="album-range-stats" title={rangeStats}>{rangeStats}</span>}
      <div className="album-navigation-help"><InfoTooltip label="Gallery navigation help">{tokenView ? 'Drag to pan, Scroll to zoom, Exit to rotate the gallery' : 'Drag to rotate, Scroll to zoom, Right-drag to pan, Click a frame to play'}</InfoTooltip></div>
      {framePickerSlot && createPortal(<div className="album-saved-frame" inert={turning || returning}>
        <SavedFrameSelect frames={active.map(plane => plane.frame)} counts={annotationCounts} value={hidden ? theaterId : chosen?.frame.id ?? ''}
          onChange={value => { if (hidden) { if (value) onSelectFrame(value); return; } setKeyboardId(value); scene.current?.pin(value || null); scene.current?.inspect(value || null); }}/>

      </div>, framePickerSlot)}

      <div className="album-floating-actions">
        {tokenView && <h3 className="token-view-heading">Token usage</h3>}
        <div className="album-token-stack">
          <button className="gallery-play album-token-toggle" aria-pressed={tokenView} onClick={() => tokenView ? scene.current?.reset(true) : scene.current?.top()}><i className={tokenView ? 'ph ph-arrow-u-up-left' : 'ph ph-chart-line'} aria-hidden="true" /><span className="album-token-label">{tokenView ? 'Exit' : 'See token usage'}</span></button>
        </div>
        {chosen && annotationCounts.has(chosen.frame.id) && <button className="gallery-play" onClick={() => setAnnotationId(chosen.frame.id)}>Annotations</button>}
        {chosen && <button className="album-open-frame gallery-play" onClick={() => onOpen(chosen.frame.id)}>Open frame</button>}
      </div>
      {error && <div className="gallery-empty album-3d-error" role="status">{error}</div>}
    </div>
    <div className="sr-only" aria-live="polite">{hovered && `${formatVersion(hovered.frame.version)} · ${formatTime(hovered.frame.timestamp)}. ${hovered.frame.summary}`}</div>
  </div>;
}
