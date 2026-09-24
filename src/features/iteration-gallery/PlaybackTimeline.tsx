import { formatVersion, inRange } from './model';
import { useMemo } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { GalleryFrame, RangeKey } from './model';
import { buildTimeline, timelinePointerIndex } from './timeline';
import { galleryTokens as t } from './tokens';

export function PlaybackTimeline({ frames, catalog, range, now, index, previewIndex, onPreview, onSelect }: { catalog: GalleryFrame[]; range: RangeKey; now: number; previewIndex: number; onPreview: (index: number | null) => void; frames: GalleryFrame[]; index: number; onSelect: (index: number) => void }) {
  const timeline = useMemo(() => buildTimeline(catalog.map(frame => ({ ...frame, enabled: inRange(frame, range, now) }))), [catalog, range, now]);
  const position = timeline.marks.find(mark => mark.index === index)?.position ?? 0;
  const tipIndex = previewIndex;
  const tipPosition = tipIndex >= 0 ? timeline.marks.find(mark => mark.index === tipIndex)?.position : undefined;
  const previewPosition = previewIndex >= 0 ? tipPosition : undefined;
  function pointerIndex(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return timelinePointerIndex(timeline, (event.clientX - rect.left) / rect.width);
  }
  return <div className="gallery-timeline" role="slider" tabIndex={0} aria-label="Playback position"
    aria-valuemin={0} aria-valuemax={Math.max(0, frames.length - 1)} aria-valuenow={index}
    aria-valuetext={`Frame ${index + 1} of ${frames.length}, ${formatVersion(frames[index]?.version)}`}
    style={{ '--timeline-height': `${t.timeline.height}px`, '--timeline-playhead-height': `${t.timeline.height + t.timeline.playheadOverhang * 2}px`, '--timeline-playhead-width': `${t.timeline.playheadWidth}px`, '--timeline-preview-opacity': t.timeline.previewOpacity, '--timeline-minor-height': `${t.timeline.minorTickHeight}px`, '--timeline-progress': `${position * 100}%`, '--gallery-disabled': t.timeline.disabledOpacity, '--timeline-disabled-border': t.timeline.disabledBorderOpacity } as CSSProperties}
    onClick={event => event.stopPropagation()}
    onPointerDown={event => { if (event.button !== 0) return; const next = pointerIndex(event); if (next === null) return; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); onSelect(next); }}
    onPointerEnter={event => { if (event.pointerType !== 'touch') onPreview(pointerIndex(event)); }}
    onPointerMove={event => {
      const next = pointerIndex(event);
      if (next === null) { if (!event.currentTarget.hasPointerCapture(event.pointerId)) onPreview(null); return; }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) onSelect(next);
      else if (event.pointerType !== 'touch') onPreview(next);
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
      {timeline.versions.map(version => {
        const width = version.end - version.start;
        const progress = Math.max(0, Math.min(1, (position - version.start) / width));
        return <div className={`gallery-timeline-version${version.enabled ? '' : ' is-disabled'}`} key={version.number}
          style={{ left: `${version.start * 100}%`, width: `${width * 100}%` }}>
          <div className="gallery-timeline-progress" style={{ width: `${progress * 100}%` }}/>
          {version.marks.map(mark => <i className="gallery-timeline-mark" key={mark.id}
            style={{ left: `${(mark.position - version.start) / width * 100}%` }}/>) }
        </div>;
      })}
    </div>
    <div className="gallery-timeline-playhead" aria-hidden="true"/>
    {previewPosition !== undefined && <div className="gallery-timeline-playhead gallery-timeline-preview" aria-hidden="true" style={{ left: `${previewPosition * 100}%` }}/> }
    {tipPosition !== undefined && frames[tipIndex] && <span className="capsule-tooltip gallery-timeline-tip" role="tooltip" style={{ left: `${tipPosition * 100}%` }}>{formatVersion(frames[tipIndex].version)}</span>}
  </div>;
}
