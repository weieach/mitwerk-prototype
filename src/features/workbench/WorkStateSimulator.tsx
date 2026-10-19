import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { X } from '../../components/PhosphorIcon';
import { formatFrameDate, type Capture } from '../iteration-gallery/model';
import { simulatorPreloadUrls, warmCaptures } from '../iteration-gallery/capture-cache';
import { galleryTokens } from '../iteration-gallery/tokens';
import { simulateCaptures, simulatedCount, workStateStore, workStateTokens } from '../../shared/work-state';
import { bindWorkStateShortcuts } from '../../shared/work-state-shortcuts';
import { useWorkState } from '../../shared/useWorkState';

/** Motion tokens for the sheet and for panels that animate while simulating; set on the app root. */
export const workStateStyle = { '--work-state-open': `${workStateTokens.panelOpenMs}ms`, '--work-state-close': `${workStateTokens.panelCloseMs}ms`, '--work-state-ease': workStateTokens.easing, '--work-state-grow': `${workStateTokens.growMs}ms` } as CSSProperties;

/**
 * Bottom sheet that replays the project from empty (left) to the current workspace (right).
 * The whole sheet is the slider, like the iOS Control Center brightness control: drag anywhere to
 * move the fill; every label floats above it with a difference blend so it reads on both sides.
 */
export function WorkStateSimulator({ frames }: { frames: Capture[] }) {
  const id = useId();
  const work = useWorkState();
  const visible = work.open && !work.hidden;
  useEffect(() => bindWorkStateShortcuts(window), []);
  const [interacted, setInteracted] = useState(work.progress < 1);
  const compactTitle = interacted || work.progress < 1;
  const count = simulatedCount(frames.length, work.progress);
  const simulated = useMemo(() => simulateCaptures(frames, count), [frames, count]);

  // First open: warm the gallery images for evenly spaced work states before the slider unlocks.
  const [warmed, setWarmed] = useState({ done: 0, total: 0 });
  useEffect(() => {
    if (!work.open || !work.loading) return;
    let cancelled = false;
    const started = performance.now();
    const finish = () => { if (cancelled) return; cancelled = true; window.setTimeout(() => workStateStore.ready(), Math.max(0, workStateTokens.preloadMinMs - (performance.now() - started))); };
    const timeout = window.setTimeout(finish, workStateTokens.preloadTimeoutMs);
    if (frames.length) {
      const urls = simulatorPreloadUrls(frames, galleryTokens.interfaces[0].value, workStateTokens.preloadSamples, workStateTokens.preloadLimit);
      void warmCaptures(urls, (done, total) => { if (!cancelled) setWarmed({ done, total }); }).then(finish);
    }
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [work.open, work.loading, frames]);

  const drag = useRef<{ pointer: number; x: number; progress: number; width: number } | null>(null);
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (work.loading || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, x: event.clientX, progress: work.progress, width: event.currentTarget.clientWidth };
  }
  // Like the iOS control, dragging moves the value by the distance travelled; a tap does not jump.
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    if (event.clientX !== start.x) setInteracted(true);
    workStateStore.setProgress(start.progress + (event.clientX - start.x) / Math.max(1, start.width));
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    workStateStore.commit();
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (work.loading) return;
    const step = event.shiftKey ? .1 : .01;
    const next = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? work.progress - step
      : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? work.progress + step
      : event.key === 'Home' ? 0 : event.key === 'End' ? 1 : null;
    if (next === null) return;
    event.preventDefault();
    setInteracted(true);
    workStateStore.setProgress(next);
  }

  const percent = Math.round(work.progress * 100);
  const latest = simulated.captures.length ? Math.max(...simulated.captures.map(frame => frame.timestamp)) : null;
  const moment = work.loading ? `Loading frames ${warmed.done}/${warmed.total}` : work.progress >= 1 ? 'Drag to simulate an earlier state of this project' : latest === null ? 'Empty project' : `As of ${formatFrameDate(latest)}`;
  const fill = work.loading ? (warmed.total ? warmed.done / warmed.total : 0) : work.progress;
  return <section className="work-state-simulator" data-open={visible || undefined} data-loading={work.loading || undefined} inert={!visible} aria-hidden={!visible} aria-labelledby={`${id}-title`}>
    <div className="work-state-reveal"><div className="work-state-sheet">
      <div className="work-state-slider" role="slider" tabIndex={0} aria-labelledby={`${id}-title`} aria-disabled={work.loading || undefined}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={work.loading ? moment : `${percent}% · ${moment}`}
        style={{ '--work-state-fill': fill } as CSSProperties}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onKeyDown={keyDown}>
        <span className="work-state-fill" aria-hidden="true"/>
        <div className="work-state-overlay">
          <span className="work-state-title" data-compact={compactTitle || undefined}><strong id={`${id}-title`} aria-label={compactTitle ? 'Work state' : 'Work state simulator'}>Work state<span className="work-state-title-suffix" aria-hidden={compactTitle}><span><span> simulator</span></span></span></strong><span className="work-state-moment">{moment}</span></span>
          <strong className="work-state-readout" aria-hidden="true">{percent}%</strong>
          <button type="button" className="work-state-close" aria-label="Close work state simulator" title="Close work state simulator" onClick={() => workStateStore.close()}><X size={15}/></button>
        </div>
      </div>
    </div></div>
  </section>;
}
