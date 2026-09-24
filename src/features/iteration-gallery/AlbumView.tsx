import { rotationCaptureProgress, timelineCaptureProgress } from './theater-transition';
import { formatVersion } from './model';
import type { GalleryCamera, TheaterTarget } from './theater-transition';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryVersion, RangeKey } from './model';
import { formatFrameLabel, formatTime, representativeFrames } from './model';
import { buildAlbum } from './geometry';
import { AlbumScene } from './AlbumScene';
import { InfoTooltip } from '../../components/InfoTooltip';
import { galleryTokens as t } from './tokens';
import { AxisLabels } from './AxisLabels';
import type { AxisLabelsHandle } from './AxisLabels';

export function AlbumView({ versions, range, now, zoom, onOpen, onZoom, onCamera, turning, returning, hidden, onReturnStarted, theaterTarget, theaterId, onTurnComplete, onMotion }: {
  onMotion: (progress: number) => void; returning: boolean; hidden: boolean; onReturnStarted: () => void; turning: boolean; theaterTarget: TheaterTarget | null; theaterId: string; onTurnComplete: () => void;
  versions: GalleryVersion[]; range: RangeKey; now: number; zoom: number;
  onOpen: (id: string) => void; onZoom: (zoom: number) => void;
  onCamera?: (camera: GalleryCamera | null) => void;
}) {
  const album = useMemo(() => buildAlbum(versions, range, now), [versions, range, now]);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<AlbumScene | null>(null);
  const axisLabels = useRef<AxisLabelsHandle>(null);
  const callbacks = useRef({ onOpen, onZoom, onCamera, onMotion });
  callbacks.current = { onOpen, onZoom, onCamera, onMotion };
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [keyboardId, setKeyboardId] = useState('');
  const keyboardIdRef = useRef(keyboardId);
  keyboardIdRef.current = keyboardId;
  const [interfaceId, setInterfaceId] = useState<string>(t.interfaces[0].value);
  const active = album.planes.filter(plane => plane.active);
  const hovered = active.find(plane => plane.frame.id === hoveredId);
  const chosen = active.find(plane => plane.frame.id === keyboardId);

  useEffect(() => {
    try {
      scene.current = new AlbumScene(host.current!, {
        motion: progress => callbacks.current.onMotion(progress), hover: setHoveredId, open: id => callbacks.current.onOpen(id),
        zoom: value => callbacks.current.onZoom(value), error: setError,
        labels: labels => axisLabels.current?.update(labels),
      });
    } catch { setError('3D rendering is unavailable in this browser. You can still choose and open saved frames below.'); }
    callbacks.current.onCamera?.({ center: () => scene.current?.center(), reset: () => scene.current?.reset(), orbit: (id, target, ready, complete) => scene.current?.beginTheaterOrbit(id, target, ready, complete) ?? null });
    return () => { callbacks.current.onCamera?.(null); scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => {
    if (hidden || returning || (turning && host.current?.dataset.transitionProgress)) return;
    scene.current?.update(album, versions, representativeFrames(versions, range, now).map(frame => frame.id));
    const params = new URLSearchParams(location.search);
    if (params.get('screenshot') === '1' && ['reset', 'transition', 'timeline-transition'].includes(params.get('galleryView') ?? '')) scene.current?.reset();
    else if (params.get('screenshot') === '1' && params.get('galleryView') !== 'theater') scene.current?.center();
    if (params.get('screenshot') === '1' && params.get('galleryHover') === '1') {
      const candidates = album.planes.filter(plane => plane.active);
      const middle = candidates.reduce<typeof candidates[number] | undefined>((nearest, plane) =>
        !nearest || Math.abs(plane.depth - album.depth / 2) < Math.abs(nearest.depth - album.depth / 2) ? plane : nearest, undefined);
      if (middle) { setKeyboardId(middle.frame.id); scene.current?.pin(middle.frame.id); scene.current?.inspect(middle.frame.id); }
    } else if (keyboardIdRef.current) scene.current?.pin(keyboardIdRef.current);
  }, [album, versions, range, now]);
  useEffect(() => { scene.current?.setZoom(zoom); }, [zoom]);
  useEffect(() => {
    if ((!turning && !returning) || !theaterTarget) return;
    if (!scene.current || error) { onTurnComplete(); return; }
    const params = new URLSearchParams(location.search);
    const freeze = params.get('screenshot') === '1' && ['transition', 'timeline-transition'].includes(params.get('galleryView') ?? '');
    const captureProgress = params.get('galleryView') === 'timeline-transition' ? timelineCaptureProgress() : rotationCaptureProgress();
    scene.current.turnToTheater(theaterId, theaterTarget, onTurnComplete, freeze && !returning ? captureProgress : undefined, returning, onReturnStarted);
  }, [turning, returning, theaterTarget, theaterId, onTurnComplete, onReturnStarted, error]);

  return <div className="album-webgl" inert={turning || returning || hidden}>
    <div className="gallery-toolbar album-frame-bar">
      <select aria-label="Tracked interface" value={interfaceId} onChange={event => setInterfaceId(event.target.value)}>
        {t.interfaces.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <select aria-label="Saved frame" disabled={!active.length} value={chosen?.frame.id ?? ''} onChange={event => { setKeyboardId(event.target.value); scene.current?.pin(event.target.value || null); scene.current?.inspect(event.target.value || null); }}>
        <option value="">{active.length ? 'Select a saved frame' : 'No frames in range'}</option>
        {active.map(({ frame }) => <option key={frame.id} value={frame.id}>{formatFrameLabel(frame)}</option>)}
      </select>
      <InfoTooltip label="Gallery navigation help">Drag to rotate · Scroll to zoom · Right-drag to pan · Click a frame to play</InfoTooltip>
    </div>
    <div ref={host} className="album-3d-viewport" aria-label="Interactive 3D album">
      <AxisLabels ref={axisLabels}/>
      {chosen && <button className="album-open-frame gallery-play" onClick={() => onOpen(chosen.frame.id)}>Open frame</button>}
      {error && <div className="gallery-empty album-3d-error" role="status">{error}</div>}
    </div>
    <div className="sr-only" aria-live="polite">{hovered && `${formatVersion(hovered.frame.version)} · ${formatTime(hovered.frame.timestamp)}. ${hovered.frame.summary}`}</div>
  </div>;
}
