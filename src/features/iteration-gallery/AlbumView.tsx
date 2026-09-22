import { useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryVersion, RangeKey } from './model';
import { formatTime } from './model';
import { buildAlbum } from './geometry';
import { AlbumScene } from './AlbumScene';

export function AlbumView({ versions, range, now, zoom, onOpen, onZoom }: {
  versions: GalleryVersion[]; range: RangeKey; now: number; zoom: number;
  onOpen: (id: string) => void; onZoom: (zoom: number) => void;
}) {
  const album = useMemo(() => buildAlbum(versions, range, now), [versions, range, now]);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<AlbumScene | null>(null);
  const callbacks = useRef({ onOpen, onZoom });
  callbacks.current = { onOpen, onZoom };
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
    return () => { scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => { scene.current?.update(album, versions); }, [album, versions]);
  useEffect(() => { scene.current?.setZoom(zoom); }, [zoom]);

  return <div className="album-webgl">
    <div ref={host} className="album-3d-viewport" aria-label="Interactive 3D album">
      <button className="icon-button album-reset" onClick={() => scene.current?.reset()} disabled={!!error}>Reset view</button>
      {error && <div className="gallery-empty album-3d-error" role="status">{error}</div>}
    </div>
    <div className="album-caption" aria-live="polite">
      {hovered ? <><strong>V{hovered.frame.version} · {formatTime(hovered.frame.timestamp)}</strong><span>{hovered.frame.summary}</span></>
        : <><span>{active.length} frames in this range · {versions.length} versions</span><span>Drag to rotate · Scroll to zoom · Right-drag to pan · Click a frame to play</span></>}
      <div className="gallery-toolbar">
        <select aria-label="Saved frame" disabled={!active.length} value={chosen?.frame.id ?? ''} onChange={event => { setKeyboardId(event.target.value); scene.current?.inspect(event.target.value); }}>
          {!active.length && <option value="">No frames in range</option>}
          {active.map(({ frame }) => <option key={frame.id} value={frame.id}>V{frame.version} · {frame.kind} {frame.number ?? ''} · {formatTime(frame.timestamp)}</option>)}
        </select>
        <button onClick={() => chosen && onOpen(chosen.frame.id)} disabled={!chosen}>Open frame</button>
      </div>
    </div>
  </div>;
}
