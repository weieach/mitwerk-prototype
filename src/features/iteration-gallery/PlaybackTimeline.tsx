import { bindTimelineScrolling } from './timeline-scroll';
import { TimelineScroller } from './TimelineScroller';
import { usePlayheadMotion } from './usePlayheadMotion';
import { formatVersion, galleryBranchPaint, inRange } from './model';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, RefObject } from 'react';
import type { GalleryFrame, RangeKey } from './model';
import { buildTimeline, centeredTimelineScroll, fitTimeline, timelineDisabledRegions, timelinePointerIndex, timelineRangeScroll, type JumpScale } from './timeline';
import { galleryTokens as t } from './tokens';

export function PlaybackTimeline({ unit = 'frame', hasMilestone = () => false, branches = [], navigationKey, active, frames, catalog, range, now, index, selectedId, previewIndex, onPreview, onSelect, onSelectPush, viewportRef }: { unit?: JumpScale; hasMilestone?: (version: number) => boolean; branches?: string[]; navigationKey: number; active: boolean; viewportRef: RefObject<HTMLDivElement | null>; catalog: GalleryFrame[]; range: RangeKey; now: number; previewIndex: number; onPreview: (index: number | null) => void; frames: GalleryFrame[]; index: number; selectedId: string; onSelect: (index: number) => void; onSelectPush: (id: string) => void }) {
  const [pushTip, setPushTip] = useState<number | null>(null);
  const [rangeTip, setRangeTip] = useState<{ x: number; text: string } | null>(null);
  const containerRef = viewportRef;
  const preview = useRef(onPreview);
  useLayoutEffect(() => { preview.current = onPreview; }, [onPreview]);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const clear = () => { preview.current(null); setPushTip(null); setRangeTip(null); };
    element.addEventListener('scroll', clear, { passive: true });
    const unbind = bindTimelineScrolling(element, clear);
    return () => { unbind(); element.removeEventListener('scroll', clear); };
  }, [containerRef]);
  useEffect(() => setRangeTip(null), [range, catalog]);
  const [availableWidth, setAvailableWidth] = useState(0);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const versionCount = useMemo(() => new Set(catalog.map(frame => frame.version)).size, [catalog]);
  const sizing = fitTimeline(versionCount, availableWidth, unit === 'milestone');
  const timeline = useMemo(() => buildTimeline(catalog.map(frame => ({ ...frame, enabled: inRange(frame, range, now) })), sizing.gapDepth), [catalog, range, now, sizing.gapDepth]);
  const rangeScroll = timelineRangeScroll(timeline.versions, availableWidth, availableWidth * sizing.contentScale, availableWidth * sizing.contentScale * sizing.trackFraction);
  function scrollToRange() {
    if (!rangeScroll) return;
    const viewport = containerRef.current;
    const firstBlock = viewport?.querySelector<HTMLElement>('.gallery-timeline-version:not(.is-disabled)');
    if (!viewport || !firstBlock) return;
    // Lead with the first in-range block, unless the range is too short to fill the viewport: then just show the end.
    const left = Math.min(viewport.scrollLeft + firstBlock.getBoundingClientRect().left - viewport.getBoundingClientRect().left - t.timeline.edgePadding,
      viewport.scrollWidth - viewport.clientWidth);
    viewport?.querySelector<HTMLElement>('.gallery-timeline-scrubber')?.focus({ preventScroll:true });
    onPreview(null); setRangeTip(null); setPushTip(null);
    viewport.scrollTo({ left, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  const selectedMark = timeline.marks.find(mark => mark.id === selectedId);
  const selectedPush = timeline.pushes.find(node => node.frameId === selectedId);
  const targetPosition = selectedPush ? (selectedPush.start + selectedPush.end) / 2 : selectedMark?.position ?? timeline.marks.find(mark => mark.index === index)?.position ?? 0;
  const position = usePlayheadMotion(targetPosition, navigationKey);
  // Measure the actual track, including its push gutters and animated unit sizing.
  // Settle the initial seek before the staggered playback controls are revealed.
  useLayoutEffect(() => {
    if (!active) return;
    const viewport = containerRef.current;
    const track = viewport?.querySelector<HTMLElement>('.gallery-timeline');
    if (!viewport || !track) return;
    const center = () => {
      if (viewport.querySelector('.gallery-timeline-scrubber')?.matches(':active')) return;
      const x = viewport.scrollLeft + track.getBoundingClientRect().left - viewport.getBoundingClientRect().left + targetPosition * track.clientWidth;
      viewport.scrollTo({ left: centeredTimelineScroll(x, viewport.clientWidth, viewport.scrollWidth), behavior: 'instant' });
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(viewport); observer.observe(track);
    return () => observer.disconnect();
  }, [navigationKey, targetPosition, active]);
  const tipIndex = previewIndex;
  const tipPosition = tipIndex >= 0 ? timeline.marks.find(mark => mark.index === tipIndex)?.position : undefined;
  const previewPosition = previewIndex >= 0 ? tipPosition : undefined;
  function pointerIndex(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return timelinePointerIndex(timeline, (event.clientX - rect.left) / rect.width);
  }
  function updateRangeTip(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = (event.clientX - rect.left) / rect.width;
    const block = timeline.versions.find(version => !version.enabled && point >= version.start && point <= version.end);
    const mark = block?.marks.reduce<(typeof timeline.marks)[number] | undefined>((best, mark) => !best || Math.abs(mark.position - point) < Math.abs(best.position - point) ? mark : best, undefined);
    const frame = mark && catalog.find(frame => frame.id === mark.id);
    if (!frame || event.pointerType === 'touch') { setRangeTip(null); return; }
    const age = Math.max(0, Math.floor((now - frame.timestamp) / 86_400_000));
    const date = frame.timestamp > now ? 'future date' : age ? `${age}d ago` : 'earlier today';
    setRangeTip({ x: event.clientX - containerRef.current!.getBoundingClientRect().left, text: `Outside range · ${date}` });
  }
  const span = `${sizing.trackFraction * 100}%`;
  return <div className="gallery-timeline-container" data-unit={unit}><div className="gallery-timeline-scroll" ref={containerRef} style={{ '--timeline-span': span, '--timeline-content-span': `${sizing.contentScale * 100}%`, '--timeline-tooltip-space': `${t.timeline.tooltipSpace}px`, '--timeline-edge-padding': `${t.timeline.edgePadding}px`, '--timeline-push-background': t.timeline.pushBackground, '--timeline-push-hover-background': t.timeline.pushHoverBackground, '--timeline-height': `${t.timeline.height}px`, '--timeline-playhead-height': `${t.timeline.height + t.timeline.playheadOverhang * 2}px`, '--timeline-playhead-width': `${t.timeline.playheadWidth}px`, '--timeline-preview-opacity': t.timeline.previewOpacity, '--timeline-minor-height': `${t.timeline.minorTickHeight}px`, '--timeline-progress': `${position * 100}%`, '--gallery-disabled': t.timeline.disabledOpacity } as CSSProperties}><div className="gallery-timeline-width"><div className="gallery-timeline">
    <div className="gallery-timeline-scrubber" role="slider" tabIndex={0} aria-label="Playback position"
    aria-valuemin={0} aria-valuemax={Math.max(0, frames.length - 1)} aria-valuenow={index}
    aria-valuetext={`Frame ${index + 1} of ${frames.length}, ${formatVersion(frames[index]?.version)}`}
    onClick={event => event.stopPropagation()}
    onPointerDown={event => { if (event.button !== 0) return; const next = pointerIndex(event); if (next === null) { if (rangeTip) scrollToRange(); return; } event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); onSelect(next); }}
    onPointerEnter={event => { updateRangeTip(event); if (event.pointerType !== 'touch') onPreview(pointerIndex(event)); }}
    onPointerMove={event => {
      updateRangeTip(event);
      const next = pointerIndex(event);
      if (next === null) { if (!event.currentTarget.hasPointerCapture(event.pointerId)) onPreview(null); return; }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) onSelect(next);
      else if (event.pointerType !== 'touch') onPreview(next);
    }}
    onPointerLeave={event => { onPreview(null); if (!(event.relatedTarget instanceof Element && event.relatedTarget.closest('.timeline-range-hint'))) setRangeTip(null); }}
    onPointerCancel={() => { onPreview(null); setRangeTip(null); }}
    onBlur={event => { onPreview(null); if (!(event.relatedTarget instanceof Element && event.relatedTarget.closest('.timeline-range-hint'))) setRangeTip(null); }}
    onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onKeyDown={event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? frames.length - 1
        : ['ArrowRight', 'ArrowUp'].includes(event.key) ? index + 1
        : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? index - 1 : null;
      if (next === null) return;
      event.preventDefault(); onPreview(null); onSelect(Math.max(0, Math.min(frames.length - 1, next)));
    }}>
    <div className="gallery-timeline-track" aria-hidden="true">
      {timelineDisabledRegions(timeline.versions).map(region => <div className="gallery-timeline-disabled-region" key={region.start}
        style={{ left: `${region.start * 100}%`, width: `${(region.end - region.start) * 100}%` }}/>) }
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
    {timeline.pushes.map(node => {
      // Version playback lights every saved push; milestone playback colors milestone pushes by branch, like the Idea stream.
      const pushFrame = node.frameId ? catalog.find(item => item.id === node.frameId) : undefined;
      const target = !!pushFrame && (unit === 'version' || (unit === 'milestone' && hasMilestone(node.version)));
      return <button key={node.version} type="button"
      className={`gallery-timeline-push${node.floating ? ' is-floating' : ''}${target ? ' is-unit-target' : ''}`} aria-label={`${formatVersion(node.version)} · push node`}
      aria-disabled={node.frameId === null} data-push-version={node.version}
      style={{ left: `${node.start * 100}%`, width: `${(node.end - node.start) * 100}%`, ...(target && unit === 'milestone' ? { '--push-unit-color': galleryBranchPaint(pushFrame!.branch ?? 'main', branches) } : {}) } as CSSProperties}
      onPointerDown={event => event.stopPropagation()}
      onPointerEnter={() => { onPreview(null); setRangeTip(null); setPushTip(node.version); }}
      onPointerLeave={() => setPushTip(null)} onFocus={() => { onPreview(null); setPushTip(node.version); }} onBlur={() => setPushTip(null)}
      onClick={event => { event.stopPropagation(); onPreview(null); if (node.frameId) onSelectPush(node.frameId); }}>
      {pushTip === node.version && <span className="capsule-tooltip gallery-timeline-tip" role="tooltip">{formatVersion(node.version)} · push node{node.frameId === null && <span className="sr-only"> — no saved push</span>}</span>}
    </button>; })}
    <div className="gallery-timeline-playhead" aria-hidden="true"/>
    {previewPosition !== undefined && <div className="gallery-timeline-playhead gallery-timeline-preview" aria-hidden="true" style={{ left: `${previewPosition * 100}%` }}/> }
  </div></div></div>
    {rangeTip && <button type="button" className="timeline-range-hint" aria-label={`${rangeTip.text}. Scroll to start of selected range`} style={{ left: `clamp(0px, ${rangeTip.x}px - var(--timeline-range-hint-width) / 2, 100% - var(--timeline-range-hint-width))` }} onClick={scrollToRange} onPointerLeave={event => { if (!(event.relatedTarget instanceof Element && event.relatedTarget.closest('.gallery-timeline-scrubber'))) setRangeTip(null); }}>{rangeTip.text}</button>}
    <TimelineScroller viewportRef={containerRef} contentKey={versionCount}/>
  </div>;
}
