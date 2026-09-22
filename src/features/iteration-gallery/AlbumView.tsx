import { useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryVersion, RangeKey } from './model';
import { dateTicks, formatDate, formatTime } from './model';
import { buildAlbum, pointList, project } from './geometry';
import type { AlbumBlock, FramePlane } from './geometry';
import { galleryTokens as t } from './tokens';

function Block({ block }: { block: AlbumBlock }) {
  const { width: w, height: h, start: a, end: b } = block;
  const face = (depth: number) => [project(0, 0, depth), project(w, 0, depth), project(w, h, depth), project(0, h, depth)];
  return <g className={`album-block ${block.active ? '' : 'is-disabled'}`} data-active={block.active}>
    <polygon points={pointList([project(0, 0, a), project(w, 0, a), project(w, 0, b), project(0, 0, b)])}/>
    <polygon points={pointList([project(w, 0, a), project(w, h, a), project(w, h, b), project(w, 0, b)])}/>
    <polygon points={pointList(face(a))}/><polygon points={pointList(face(b))}/>
    <line x1={project(0, h, a).x} y1={project(0, h, a).y} x2={project(0, h, b).x} y2={project(0, h, b).y}/>
  </g>;
}

function Plane({ plane, showImage, hovered = false, onOpen, onInspect }: { plane: FramePlane; showImage: boolean; hovered?: boolean; onOpen?: (id: string) => void; onInspect?: (id: string) => void }) {
  const at = project(plane.x, plane.y, plane.depth);
  return <g className={`album-plane ${hovered ? 'is-hovered' : ''}`} style={{ transform: `translateY(${hovered ? -t.hoverLift : 0}px)` }} pointerEvents={showImage ? 'auto' : 'none'} onPointerDown={event => event.preventDefault()} onClick={() => onOpen?.(plane.frame.id)} onMouseEnter={() => onInspect?.(plane.frame.id)}>
    <g transform={`matrix(${Math.sqrt(3) / 2} 0.5 0 1 ${at.x} ${at.y})`}>
      <rect width={plane.width} height={plane.height} className="album-frame-outline"/>
      {showImage && <image href={`${import.meta.env.BASE_URL}${plane.frame.url}`} width={plane.width} height={plane.height} preserveAspectRatio="xMidYMid meet" opacity={hovered ? 1 : t.endpointOpacity}/>}
    </g>
  </g>;
}

export function AlbumView({ versions, range, now, zoom, onOpen }: {
  versions: GalleryVersion[]; range: RangeKey; now: number; zoom: number; onOpen: (id: string) => void;
}) {
  const album = useMemo(() => buildAlbum(versions, range, now), [versions, range, now]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const sceneRef = useRef<SVGSVGElement>(null);
  const [sceneWidth, setSceneWidth] = useState(640);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSceneWidth(entry.contentRect.width));
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => observer.disconnect();
  }, []);
  const frames = versions.flatMap(version => version.frames);
  const active = album.planes.filter(plane => plane.active);
  const hovered = album.planes.find(plane => plane.frame.id === hoveredId && plane.active);
  const endpoints = new Set([active[0]?.frame.id, active.at(-1)?.frame.id]);
  const dateMarks = dateTicks(frames);
  const { bounds } = album;
  const labelScale = bounds.width / Math.max(1, sceneWidth);
  const versionRulerY = t.maxImageHeight + t.padding * 2 + t.rulerGap;
  const hoverAt = hovered && project(hovered.x, hovered.y - t.hoverLift, hovered.depth);
  return <div className="album-scroll" aria-label="Isometric iteration gallery">
    <div className="album-zoom" style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 100}%`, height: `calc(${zoom * 100}% - ${zoom * 84}px)` }}>
      <svg ref={sceneRef} className="album-scene" viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`} role="group" aria-label="Saved frames grouped into versions. Hover a slice to inspect it, or select it to open theater view." onMouseLeave={() => setHoveredId(null)}>
        <g className="album-rulers" style={{ fontSize: t.labelFontSize * labelScale }} aria-hidden="true">
          <text x={project(-t.rulerGap, 0, 0).x} y={project(-t.rulerGap, 0, 0).y - t.labelFontSize * 3 * labelScale}>Date</text>
          <text x={project(album.width + t.rulerGap, versionRulerY + 32, 0).x} y={project(album.width + t.rulerGap, versionRulerY + 32, 0).y}>Version</text>
          <line x1={project(-t.rulerGap, 0, 0).x} y1={project(-t.rulerGap, 0, 0).y} x2={project(-t.rulerGap, 0, album.depth).x} y2={project(-t.rulerGap, 0, album.depth).y}/>
          <line x1={project(album.width + t.rulerGap, versionRulerY, 0).x} y1={project(album.width + t.rulerGap, versionRulerY, 0).y} x2={project(album.width + t.rulerGap, versionRulerY, album.depth).x} y2={project(album.width + t.rulerGap, versionRulerY, album.depth).y}/>
          {dateMarks.map(mark => { const depth = album.planes.find(plane => plane.frame.id === mark.id)?.depth ?? 0; const p = project(-t.rulerGap, 0, depth); return <g key={mark.timestamp}><line x1={p.x} y1={p.y} x2={p.x - 10} y2={p.y - 8}/><text x={p.x - 12} y={p.y - 12} textAnchor="end">{formatDate(mark.timestamp)}</text></g>; })}
          {versions.map(version => { const p = project(album.width + t.rulerGap, versionRulerY, (version.index + .5) * t.versionDepth); return <g key={version.number}><line x1={p.x} y1={p.y} x2={p.x + 9} y2={p.y + 6}/><text x={p.x + 12} y={p.y + 14}>V{version.number}</text></g>; })}
        </g>
        {[...album.blocks].reverse().map(block => <Block key={block.key} block={block}/>)}
        {[...album.planes].reverse().map(plane => <g key={plane.frame.id} className={plane.active ? '' : 'is-disabled'}>
          <Plane plane={plane} showImage={plane.active && endpoints.has(plane.frame.id)} onOpen={onOpen} onInspect={setHoveredId}/>
        </g>)}
        {album.planes.map(plane => {
          const block = album.blocks.find(block => block.version === plane.frame.version)!;
          const roof = [project(0, 0, plane.hitStart), project(block.width, 0, plane.hitStart), project(block.width, 0, plane.hitEnd), project(0, 0, plane.hitEnd)];
          const side = [project(block.width, 0, plane.hitStart), project(block.width, block.height, plane.hitStart), project(block.width, block.height, plane.hitEnd), project(block.width, 0, plane.hitEnd)];
          return <g key={`hit:${plane.frame.id}`} role="button" tabIndex={plane.active ? 0 : -1} aria-disabled={!plane.active}
            aria-label={`Open V${plane.frame.version}, ${formatTime(plane.frame.timestamp)}, ${plane.frame.kind} ${plane.frame.number ?? ''}: ${plane.frame.summary}`}
            className={`album-hit ${plane.active ? '' : 'is-disabled'}`}
            onMouseEnter={() => setHoveredId(plane.active ? plane.frame.id : null)} onFocus={() => setHoveredId(plane.frame.id)} onBlur={() => setHoveredId(null)}
            onClick={() => plane.active && onOpen(plane.frame.id)} onKeyDown={event => { if (plane.active && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onOpen(plane.frame.id); } }}>
            <polygon points={pointList(roof)}/><polygon points={pointList(side)}/>
          </g>;
        })}
        {hovered && <Plane key={hovered.frame.id} plane={hovered} showImage hovered onOpen={onOpen}/>}
        {hovered && hoverAt && <g pointerEvents="none" className="album-hover-label" textAnchor={hoverAt.x > bounds.x + bounds.width / 2 ? 'end' : 'start'} transform={`translate(${hoverAt.x} ${hoverAt.y - 8}) scale(${labelScale})`}>
          <text y="-18">V{hovered.frame.version} · {formatTime(hovered.frame.timestamp)}</text>
          <text>{hovered.frame.summary.length > t.labelSummaryLength ? `${hovered.frame.summary.slice(0, t.labelSummaryLength)}…` : hovered.frame.summary}</text>
        </g>}
      </svg>
    </div>
    <div className="album-caption" aria-live="polite">
      {hovered ? <><strong>V{hovered.frame.version} · {formatTime(hovered.frame.timestamp)}</strong><span>{hovered.frame.summary}</span><span>{hovered.frame.kind} {hovered.frame.number ?? ''} · Click to open theater</span></>
        : <><span>{active.length} frames in this range · {versions.length} versions</span><span>Hover a slice to lift a frame. Click to play its history.</span></>}
    </div>
  </div>;
}
