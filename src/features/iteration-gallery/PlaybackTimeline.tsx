import { useMemo } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { GalleryFrame } from './model';
import { buildTimeline, nearestTimelineFrame } from './timeline';
import { galleryTokens as t } from './tokens';

export function PlaybackTimeline({ frames, index, previewIndex, onPreview, onSelect }: { previewIndex: number; onPreview: (index: number | null) => void; frames: GalleryFrame[]; index: number; onSelect: (index: number) => void }) {
  const timeline = useMemo(() => buildTimeline(frames), [frames]);
  const position = timeline.marks.find(mark => mark.index === index)?.position ?? 0;
  const previewPosition = timeline.marks.find(mark => mark.index === previewIndex)?.position;
  function pointerIndex(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return nearestTimelineFrame(timeline.marks, (event.clientX - rect.left) / rect.width);
  }
  return <div className="gallery-timeline" role="slider" tabIndex={0} aria-label="Playback position"
    aria-valuemin={0} aria-valuemax={Math.max(0, frames.length - 1)} aria-valuenow={index}
    aria-valuetext={`Frame ${index + 1} of ${frames.length}, V${frames[index]?.version}`}
    style={{ '--timeline-height': `${t.timeline.height}px`, '--timeline-playhead-height': `${t.timeline.height + t.timeline.playheadOverhang * 2}px`, '--timeline-playhead-width': `${t.timeline.playheadWidth}px`, '--timeline-major-height': `${t.timeline.majorTickHeight}px`, '--timeline-preview-opacity': t.timeline.previewOpacity, '--timeline-minor-height': `${t.timeline.minorTickHeight}px`, '--timeline-progress': `${position * 100}%` } as CSSProperties}
    onClick={event => event.stopPropagation()}
    onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); onSelect(pointerIndex(event)); }}
    onPointerEnter={event => { if (event.pointerType !== 'touch') onPreview(pointerIndex(event)); }}
    onPointerMove={event => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) onSelect(pointerIndex(event));
      else if (event.pointerType !== 'touch') onPreview(pointerIndex(event));
    }}
    onPointerLeave={() => onPreview(null)}
    onPointerCancel={() => onPreview(null)}
    onBlur={() => onPreview(null)}
    onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onKeyDown={event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? frames.length - 1
        : ['ArrowRight', 'ArrowUp'].includes(event.key) ? index + 1
        : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? index - 1 : null;
      if (next === null) return;
      event.preventDefault(); onPreview(null); onSelect(Math.max(0, Math.min(frames.length - 1, next)));
    }}>
    <div className="gallery-timeline-track" aria-hidden="true">
      <div className="gallery-timeline-progress"/>
      {timeline.versions.map(version => <div className="gallery-timeline-version" key={version.number} style={{ left: `${version.start * 100}%`, width: `${(version.end - version.start) * 100}%` }} title={`V${version.number} · ${version.marks.length} saved frames`}/>)}
      {timeline.marks.map(mark => <i className="gallery-timeline-mark" key={mark.id} style={{ left: `${mark.position * 100}%` }}/>) }
    </div>
    <div className="gallery-timeline-playhead" aria-hidden="true"/>
    {previewPosition !== undefined && <div className="gallery-timeline-playhead gallery-timeline-preview" aria-hidden="true" style={{ left: `${previewPosition * 100}%` }}/> }
  </div>;
}
