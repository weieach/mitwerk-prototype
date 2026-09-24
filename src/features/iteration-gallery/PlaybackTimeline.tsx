import { formatVersion, inRange } from './model';
import { useMemo, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { GalleryFrame, RangeKey } from './model';
import { buildTimeline, timelinePointerIndex } from './timeline';
import { galleryTokens as t } from './tokens';

export function PlaybackTimeline({ frames, catalog, range, now, index, selectedId, previewIndex, onPreview, onSelect, onSelectPush }: { catalog: GalleryFrame[]; range: RangeKey; now: number; previewIndex: number; onPreview: (index: number | null) => void; frames: GalleryFrame[]; index: number; selectedId: string; onSelect: (index: number) => void; onSelectPush: (id: string) => void }) {
  const [pushTip, setPushTip] = useState<number | null>(null);
  const timeline = useMemo(() => buildTimeline(catalog.map(frame => ({ ...frame, enabled: inRange(frame, range, now) }))), [catalog, range, now]);
  const selectedMark = timeline.marks.find(mark => mark.id === selectedId);
  const selectedPush = timeline.pushes.find(node => node.frameId === selectedId);
  const position = selectedMark?.position ?? (selectedPush ? (selectedPush.start + selectedPush.end) / 2 : timeline.marks.find(mark => mark.index === index)?.position ?? 0);
  const tipIndex = previewIndex;
  const tipPosition = tipIndex >= 0 ? timeline.marks.find(mark => mark.index === tipIndex)?.position : undefined;
  const previewPosition = previewIndex >= 0 ? tipPosition : undefined;
  function pointerIndex(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return timelinePointerIndex(timeline, (event.clientX - rect.left) / rect.width);
  }
  return <div className="gallery-timeline"
    style={{ '--timeline-push-background': t.timeline.pushBackground, '--timeline-push-hover': t.timeline.pushHoverBackground, '--timeline-height': `${t.timeline.height}px`, '--timeline-playhead-height': `${t.timeline.height + t.timeline.playheadOverhang * 2}px`, '--timeline-playhead-width': `${t.timeline.playheadWidth}px`, '--timeline-preview-opacity': t.timeline.previewOpacity, '--timeline-minor-height': `${t.timeline.minorTickHeight}px`, '--timeline-progress': `${position * 100}%`, '--gallery-disabled': t.timeline.disabledOpacity, '--timeline-disabled-border': t.timeline.disabledBorderOpacity } as CSSProperties}
    >
    <div className="gallery-timeline-scrubber" role="slider" tabIndex={0} aria-label="Playback position"
    aria-valuemin={0} aria-valuemax={Math.max(0, frames.length - 1)} aria-valuenow={index}
    aria-valuetext={`Frame ${index + 1} of ${frames.length}, ${formatVersion(frames[index]?.version)}`}
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
    {tipPosition !== undefined && frames[tipIndex] && <span className="capsule-tooltip gallery-timeline-tip" role="tooltip" style={{ left: `${tipPosition * 100}%` }}>{formatVersion(frames[tipIndex].version)}</span>}
    </div>
    {timeline.pushes.map(node => <button key={node.version} type="button"
      className={`gallery-timeline-push${node.floating ? ' is-floating' : ''}`} aria-label={`${formatVersion(node.version)} · push node`}
      aria-disabled={node.frameId === null} data-push-version={node.version}
      style={{ left: `${node.start * 100}%`, width: `${(node.end - node.start) * 100}%` }}
      onPointerDown={event => event.stopPropagation()}
      onPointerEnter={() => { onPreview(null); setPushTip(node.version); }}
      onPointerLeave={() => setPushTip(null)} onFocus={() => { onPreview(null); setPushTip(node.version); }} onBlur={() => setPushTip(null)}
      onClick={event => { event.stopPropagation(); onPreview(null); if (node.frameId) onSelectPush(node.frameId); }}>
      {pushTip === node.version && <span className="capsule-tooltip gallery-timeline-tip" role="tooltip">{formatVersion(node.version)} · push node{node.index === null && <span className="sr-only"> — no push in this date range</span>}</span>}
    </button>)}
    <div className="gallery-timeline-playhead" aria-hidden="true"/>
    {previewPosition !== undefined && <div className="gallery-timeline-playhead gallery-timeline-preview" aria-hidden="true" style={{ left: `${previewPosition * 100}%` }}/> }
  </div>;
}
