import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AlbumView } from './AlbumView';
import { TheaterView } from './TheaterView';
import { buildVersions, inRange, rangeCounts, ranges, ratioLabel } from './model';
import type { Capture, RangeKey } from './model';
import { galleryTokens as t } from './tokens';
import './gallery.css';

type Catalog = { frames: Capture[]; ignored: number };
export function IterationGallery() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [range, setRange] = useState<RangeKey>('7');
  const [now, setNow] = useState(Date.now);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<'album' | 'theater'>('album');
  const [selectedId, setSelectedId] = useState('');
  const camera = useRef<{ center: () => void; reset: () => void } | null>(null);

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
  const visibleFrames = useMemo(() => versions.flatMap(version => version.frames).filter(frame => inRange(frame, range, now)), [versions, range, now]);
  const counts = useMemo(() => rangeCounts(versions, range, now), [versions, range, now]);
  const select = useCallback((id: string) => setSelectedId(id), []);
  function open(id: string) { setSelectedId(id); setView('theater'); }

  return <section className="iteration-gallery" aria-labelledby="gallery-title" style={{ '--gallery-transition': `${t.transitionMs}ms`, '--gallery-label-size': `${t.labelFontSize}px` } as CSSProperties}>
    <header className="panel-header">
      <div className="panel-heading"><h2 id="gallery-title">Iteration gallery</h2></div>
      <div className="panel-header-actions">
        {view === 'theater' ? <button className="icon-button" onClick={() => setView('album')}>← Gallery</button>
          : <>
            <button className="icon-button" aria-label="Zoom gallery out" disabled={zoom <= t.zoomMin} onClick={() => setZoom(Math.max(t.zoomMin, zoom - t.zoomStep))}>−</button>
            <button className="icon-button" aria-label="Reset gallery zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
            <button className="icon-button" aria-label="Zoom gallery in" disabled={zoom >= t.zoomMax} onClick={() => setZoom(Math.min(t.zoomMax, zoom + t.zoomStep))}>+</button>
            <div className="album-camera-actions">
              <button className="icon-button album-reset" onClick={() => camera.current?.center()}>Center view</button>
              <button className="icon-button album-reset" onClick={() => camera.current?.reset()}>Reset view</button>
            </div>
          </>}
      </div>
    </header>
    {error && <div className="gallery-message" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
    {!catalog ? <div className="gallery-empty">{error ? 'Screenshot catalog unavailable.' : 'Reading saved frames…'}</div>
      : !versions.length ? <div className="gallery-empty">No saved frames found.</div>
      : view === 'album' ? <><AlbumView versions={versions} range={range} now={now} zoom={zoom} onOpen={open} onZoom={setZoom} onCamera={api => { camera.current = api; }}/>{!visibleFrames.length && <div className="gallery-message">No frames in this range. Earlier versions remain visible in gray.</div>}</>
      : <TheaterView frames={visibleFrames} selectedId={selectedId} onSelect={select}/>}
    <footer className="gallery-footer">
      <div className="gallery-range">
        <label><span className="sr-only">Date range</span><select aria-label="Date range" value={range} onChange={event => { setRange(event.target.value as RangeKey); setNow(Date.now()); }}>{ranges.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <span className="gallery-small">{catalog
          ? `${ratioLabel(counts.frames, counts.frameTotal, 'saved frame', 'saved frames')} · ${ratioLabel(counts.versions, counts.versionTotal, 'version', 'versions')}`
          : 'Loading frames…'}</span>
      </div>
      {catalog && catalog.ignored > 0 && <span className="gallery-small" title="Unrecognized or unreadable PNG files were skipped.">{catalog.ignored} files skipped</span>}
      <button className="icon-button" disabled title="Token usage is not included in capture filenames.">See token usage</button>
    </footer>
  </section>;
}
