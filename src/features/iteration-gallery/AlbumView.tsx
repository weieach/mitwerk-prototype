import { useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryVersion, RangeKey } from './model';
import { formatTime, representativeFrames } from './model';
import { buildAlbum } from './geometry';
import { AlbumScene } from './AlbumScene';

export function AlbumView({ versions, range, now, zoom, onOpen, onZoom, onCamera }: {
  versions: GalleryVersion[]; range: RangeKey; now: number; zoom: number;
  onOpen: (id: string) => void; onZoom: (zoom: number) => void;
  onCamera?: (camera: { center: () => void; reset: () => void } | null) => void;
}) {
  const album = useMemo(() => buildAlbum(versions, range, now), [versions, range, now]);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<AlbumScene | null>(null);
  const callbacks = useRef({ onOpen, onZoom, onCamera });
  callbacks.current = { onOpen, onZoom, onCamera };
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [keyboardId, setKeyboardId] = useState('');
  const active = album.planes.filter(plane => plane.active);
  const hovered = active.find(plane => plane.frame.id === hoveredId);
  const chosen = active.find(plane => plane.frame.id === keyboardId) ?? active[0];

  useEffect(() => {
    try {
      scene.current = new AlbumScene(host.current!, {
        hover: setHoveredId, open: id => callbacks.current.onOpen(id),
        zoom: value => callbacks.current.onZoom(value), error: setError,
      });
    } catch { setError('3D rendering is unavailable in this browser. You can still choose and open saved frames below.'); }
    callbacks.current.onCamera?.({ center: () => scene.current?.center(), reset: () => scene.current?.reset() });
    return () => { callbacks.current.onCamera?.(null); scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => {
    scene.current?.update(album, versions, representativeFrames(versions, range, now).map(frame => frame.id));
    const params = new URLSearchParams(location.search);
    if (params.get('screenshot') === '1' && params.get('galleryView') === 'reset') scene.current?.reset();
    else if (params.get('screenshot') === '1') scene.current?.center();
    if (params.get('screenshot') === '1' && params.get('galleryHover') === '1') {
      const candidates = album.planes.filter(plane => plane.active);
      const middle = candidates.reduce<typeof candidates[number] | undefined>((nearest, plane) =>
        !nearest || Math.abs(plane.depth - album.depth / 2) < Math.abs(nearest.depth - album.depth / 2) ? plane : nearest, undefined);
      if (middle) { setKeyboardId(middle.frame.id); scene.current?.inspect(middle.frame.id); }
    }
  }, [album, versions, range, now]);
  useEffect(() => { scene.current?.setZoom(zoom); }, [zoom]);

  return <div className="album-webgl">
    <div ref={host} className="album-3d-viewport" aria-label="Interactive 3D album">
      {error && <div className="gallery-empty album-3d-error" role="status">{error}</div>}
    </div>
    <div className="album-caption" aria-live="polite">
      {hovered && <><strong>V{hovered.frame.version} · {formatTime(hovered.frame.timestamp)}</strong><span>{hovered.frame.summary}</span></>}
      <div className="gallery-toolbar">
        <select aria-label="Saved frame" disabled={!active.length} value={chosen?.frame.id ?? ''} onChange={event => { setKeyboardId(event.target.value); scene.current?.inspect(event.target.value); }}>
          {!active.length && <option value="">No frames in range</option>}
          {active.map(({ frame }) => <option key={frame.id} value={frame.id}>V{frame.version} · {frame.kind} {frame.number ?? ''} · {formatTime(frame.timestamp)}</option>)}
        </select>
        <button onClick={() => chosen && onOpen(chosen.frame.id)} disabled={!chosen}>Open frame</button>
      </div>
    </div>
    <div className="album-view-controls">
      <span>Drag to rotate · Scroll to zoom · Right-drag to pan · Click a frame to play</span>
    </div>
  </div>;
}
