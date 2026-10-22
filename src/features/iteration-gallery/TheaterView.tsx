import { createPortal } from 'react-dom';
import { useRuntimeReturn } from './useRuntimeReturn';
import { PlaybackExport } from './PlaybackExport';
import { PanelIcon } from '../../components/PanelIcon';
import { attachFrame, writeFrameDrag } from '../workbench/frame-context';
import { annotationBookmarkColor } from '../annotations/appearance';
import { FrameAnnotations } from '../annotations/FrameAnnotations';
import "@phosphor-icons/web/fill/style.css";
import { ReferenceFiles } from '../../components/ReferenceFiles';
import { frameReferences, type VisualReference } from './references';
import { EmbeddedPrototype, type RuntimeMode } from './EmbeddedPrototype';
import { adjacentPrototypeFrames, liveFrameIds } from './runtime-targets';
import { usePrototype } from './usePrototype';
import { formatVersion } from './model';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { GalleryFrame, LoopMode, RangeKey } from './model';
import { formatTime, playbackStep, ranges, inRange } from './model';
import { galleryTokens as t } from './tokens';
import { fitFrameToHeight, presentedFrame, theaterFrameSize, wheelFrameDelta } from './theater-layout';
import { FrameLoader } from './frame-loader';
import { adjacentTimelineIndex, firstJumpIndex, unitPlaybackStep, type JumpScale } from './timeline';
import { PlaybackJump } from './PlaybackJump';
import { PlaybackTimeline } from './PlaybackTimeline';
import { containedFrameTarget, reservedControlContains } from './theater-transition';
import type { TheaterOrbit, TheaterTarget } from './theater-transition';
import { theaterCaption, theaterCaptionLead } from './theater-layout';
import { Icon } from '../../components/Icon';
import { PlaybackControls } from './PlaybackControls';
import { TheaterCaption } from './TheaterCaption';
import { useSavedMilestones } from '../version-tree/useSavedMilestones';
import { versionMilestone } from '../version-tree/idea-stream';
import { galleryBranchPaint } from './model';
import { useLeavingValue } from '../../shared/useLeavingValue';

function PlaybackTip({ label, children, edge }: { label: string; children: ReactNode; edge?: 'start' | 'end' }) {
  const [hover, setHover] = useState(false);
  return <span className={`playback-tip${edge ? ` is-${edge}` : ''}`} onFocus={() => setHover(true)} onBlur={() => setHover(false)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    {children}
    {hover && <span className="capsule-tooltip" role="tooltip">{label}</span>}
  </span>;
}

function savedPlayUnit(): JumpScale {
  const params = new URLSearchParams(location.search);
  if (params.get('screenshot') === '1' && params.get('playUnit') === 'milestone') return 'milestone';
  try { const saved = localStorage.getItem('mitwerk-playback-jump-scale'); return saved === 'version' || saved === 'milestone' ? saved : 'frame'; } catch { return 'frame'; }
}

const frameContextOf = (frame: GalleryFrame) => ({ id: frame.id, url: `${import.meta.env.BASE_URL}${frame.url}`, label: `${formatVersion(frame.version)} · ${frame.summary}`, filename: frame.filename });

function PrototypeVersionLabel({ version }: { version: number }) {
  const label = useRef<HTMLSpanElement>(null);
  const previous = useRef(version);
  const animation = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    if (previous.current === version) return;
    previous.current = version;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animation.current?.cancel();
      return;
    }
    // Keep the ongoing reveal when another selection updates its text.
    if (animation.current?.playState === 'running') return;
    animation.current = label.current?.animate(
      [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
      { duration: t.theater.enterExpandMs, easing: 'cubic-bezier(.2,.7,.2,1)' },
    ) ?? null;
  }, [version]);
  useEffect(() => () => animation.current?.cancel(), []);
  return <span className="prototype-version-mask"><span ref={label} className="theater-version-tag" aria-live="polite">{formatVersion(version)}</span></span>;
}

export function TheaterView({ onRangeChange, exportTarget, runtimeCatalog, liveRequestKey = 0, onLiveRequestHandled, onRuntimeChange, onPlaybackVersion, navigationKey, references, frames, catalog, range, now, selectedId, onSelect, onOrbit, onDismiss, active, baseline }: { onRangeChange: (range: RangeKey) => void; exportTarget?: HTMLElement | null; runtimeCatalog: GalleryFrame[]; liveRequestKey?:number; onLiveRequestHandled:(key:number)=>void; onRuntimeChange?:(mode:RuntimeMode|null)=>void; onPlaybackVersion?:(version:number|null)=>void; navigationKey: number; references: VisualReference[]; baseline: { width: number; height: number }; active: boolean; onOrbit: (id: string, target: TheaterTarget) => TheaterOrbit | null; onDismiss: () => void; frames: GalleryFrame[]; catalog: GalleryFrame[]; range: RangeKey; now: number; selectedId: string; onSelect: (id: string, animate?: boolean) => void }) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ pointer: number; x: number; y: number; frameClick: boolean; dismissible: boolean; orbit: TheaterOrbit | null } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode | null>(null);
  const [runtimeExiting, setRuntimeExiting] = useState(false);
  const runtimeLayout = !!runtimeMode && !runtimeExiting;
  const pendingPrototype = useRef<string | null>(null);
  const runtimeExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (runtimeExitTimer.current) clearTimeout(runtimeExitTimer.current); }, []);
  function openRuntime(mode: RuntimeMode) {
    if (runtimeExitTimer.current) clearTimeout(runtimeExitTimer.current);
    runtimeExitTimer.current = null;
    setRuntimeExiting(false); setRuntimeMode(mode);
  }
  const entryButton = useRef<HTMLButtonElement>(null);
  const runtimeRef = useRef<HTMLElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (runtimeMode) exitButton.current?.focus(); }, [runtimeMode]);
  const [toast, setToast] = useState('');
  const projectToast = useLeavingValue(toast);
  useEffect(() => {
    if (active && pendingPrototype.current === selectedId) return;
    pendingPrototype.current = null;
    if (runtimeExitTimer.current) clearTimeout(runtimeExitTimer.current);
    runtimeExitTimer.current = null;
    setRuntimeExiting(false); setRuntimeMode(null);
  }, [selectedId, active]);
  useEffect(() => { onRuntimeChange?.(runtimeLayout ? runtimeMode : null); }, [runtimeLayout, runtimeMode, onRuntimeChange]);
  useEffect(() => () => onRuntimeChange?.(null), [onRuntimeChange]);
  const [jumpScale, setJumpScale] = useState<JumpScale>(savedPlayUnit);
  useEffect(() => { if (jumpScale === 'milestone') onRangeChange('all'); }, [jumpScale, onRangeChange]);
  const [speed, setSpeed] = useState<number>(() => t.unitSpeeds[jumpScale]);
  const [mode, setMode] = useState<LoopMode>(() => jumpScale === 'milestone' ? 'loop' : 'once');
  const [direction, setDirection] = useState(1);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const captureRuntimeRect = useRuntimeReturn(screenRef, runtimeExiting, active);
  const actionsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const actions = actionsRef.current;
    const buttons = actions?.querySelector<HTMLElement>('.theater-action-buttons');
    if (!actions || !buttons) return;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(buttons).columnGap) || 0;
      const children = [...buttons.children] as HTMLElement[];
      const required = children.reduce((sum, child) => sum + child.getBoundingClientRect().width, 0) + Math.max(0, children.length - 1) * gap;
      buttons.classList.toggle('is-wrapped', required > buttons.clientWidth + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(buttons); [...buttons.children].forEach(child => observer.observe(child)); measure();
    return () => observer.disconnect();
  });
  const metaRef = useRef<HTMLDivElement>(null);
  const wheel = useRef(0);
  const stepFrame = useRef<(move: number) => void>(() => {});
  const [stageSize, setStageSize] = useState({ width: 0, height: 0, actions: 0, bodyHeight: 0, caption: 0 });
  const [stageMeasured, setStageMeasured] = useState(false);
  const index = frames.findIndex(frame => frame.id === selectedId);
  const branches = useMemo(() => [...new Set(catalog.map(item => item.branch).filter((branch): branch is string => !!branch))], [catalog]);
  const requested = catalog.find(item => item.id === selectedId) ?? frames[Math.max(0, index)];
  const [displayed, setDisplayed] = useState<GalleryFrame | null>(null);
  const loader = useRef<FrameLoader | null>(null);
  if (!loader.current) loader.current = new FrameLoader(t.theater.imageCacheSize);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<GalleryFrame | null>(null);
  const previewIndex = frames.findIndex(item => item.id === previewId);
  const previewFrame = frames[previewIndex];
  const frame = presentedFrame(!!previewFrame, previewImage, displayed, requested);
  const prototype = usePrototype(frame, active);
  useEffect(() => {
    setPlaying(false); setPreviewId(null); setPreviewImage(null); prototype.exit();
  }, [navigationKey]);
  const liveTarget = !!frame && liveFrameIds(runtimeCatalog).has(frame.id);
  const showingPreview = !!previewFrame && !!previewImage;
  const navigationFrames = catalog.filter(item => inRange(item, range, now));
  const navigationIndex = navigationFrames.findIndex(item => item.id === selectedId);
  const milestones = useSavedMilestones();
  const hasMilestone = (version: number) => versionMilestone(milestones, version) !== '';
  const previousJump = adjacentTimelineIndex(navigationFrames, navigationIndex, -1, jumpScale, hasMilestone);
  const nextJump = adjacentTimelineIndex(navigationFrames, navigationIndex, 1, jumpScale, hasMilestone);

  useEffect(() => {
    if (!previewFrame) return;
    let stale = false;
    loader.current!.load(`${import.meta.env.BASE_URL}${previewFrame.url}`).then(() => {
      if (!stale) setPreviewImage(previewFrame);
    }).catch(() => { /* Keep the selected image visible if a preview cannot load. */ });
    return () => { stale = true; };
  }, [previewFrame]);
  const ready = displayed?.id === requested?.id;
  useEffect(() => {
    if (!pendingPrototype.current || pendingPrototype.current !== frame?.id || !ready || !active || prototype.available === null) return;
    pendingPrototype.current = null;
    if (prototype.available) void prototype.enter();
  }, [frame?.id, requested?.id, ready, active, prototype.available]);

  useEffect(() => {
    if (!requested) return;
    let stale = false;
    setFailedImage(null);
    loader.current!.load(`${import.meta.env.BASE_URL}${requested.url}`).then(() => {
      if (!stale) setDisplayed(requested);
    }).catch(() => { if (!stale) { setFailedImage(requested.id); setPlaying(false); } });
    return () => { stale = true; };
  }, [requested]);

  useEffect(() => {
    if (!active || !ready || !requested) return;
    let nextIndex = index, nextDirection = direction;
    for (let offset = 0; offset < t.theater.preloadFrames; offset++) {
      const next = playbackStep(nextIndex, frames.length, nextDirection, mode);
      nextIndex = next.index; nextDirection = next.direction;
      void loader.current!.load(`${import.meta.env.BASE_URL}${frames[nextIndex].url}`).catch(() => {});
      if (!next.playing) break;
    }
  }, [active, ready, requested, frames, index, direction, mode]);
  useEffect(() => { if (!active) setPlaying(false); }, [active]);
  const sequence = frames.map(frame => frame.id).join('|');

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      // Reserve a bounded caption area independent of prompt length, keeping the
      // image position stable as text wraps or a longer prompt is selected.
      // The floor always fits the version row, two prompt lines and the branch row, so a short
      // panel shrinks the frame instead of clipping the prompt.
      const metaElement = metaRef.current;
      const versionRow = metaElement?.querySelector<HTMLElement>('.theater-version');
      const summary = metaElement?.querySelector<HTMLElement>('.theater-summary');
      const lineHeight = summary ? parseFloat(getComputedStyle(summary).lineHeight) || 0 : 0;
      const rowGap = t.theater.metadataRowGap;
      const floor = (versionRow?.offsetHeight ?? 0) + lineHeight * (t.theater.metadataMinCaptionLines + 1) + rowGap * t.theater.summaryGapScale * 2;
      const meta = Math.max(floor, Math.min(t.theater.metadataHeight, body.clientHeight * t.theater.metadataHeightShare));
      body.style.setProperty('--theater-metadata-height', `${meta}px`);
      const view = body.parentElement!;
      const actionsElement = actionsRef.current;
      const frameGap = actionsElement ? parseFloat(getComputedStyle(actionsElement).marginBottom) || 0 : 0;
      const metadataGap = t.theater.metadataGap;
      const actions = (actionsElement?.offsetHeight ?? 0) + frameGap;
      const playbackOnly = !!body.closest('.workspace-gallery-only');
      const width = Math.min(body.clientWidth, window.innerWidth * t.theater.contentMaxViewportShare,
        playbackOnly ? view.clientWidth * t.theater.contentShare : body.clientWidth);
      const exitRow = view.querySelector<HTMLElement>('.runtime-exit-scrim');
      const runtimeClearance = exitRow ? (parseFloat(getComputedStyle(exitRow).bottom) || 0) + exitRow.offsetHeight + t.controls.inset : t.controls.inset;
      const height = Math.max(0, body.clientHeight - (runtimeLayout ? 2 * runtimeClearance : 0));
      setStageSize({ width: runtimeLayout ? body.clientWidth : width, height, actions, bodyHeight: body.clientHeight, caption: meta + metadataGap });
      setStageMeasured(body.clientWidth > 0 && height > 0);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    observer.observe(body.parentElement!);
    window.addEventListener('resize', measure);
    const workspace = body.closest('.workspace');
    const modeObserver = new MutationObserver(measure);
    if (workspace) modeObserver.observe(workspace, { attributes: true, attributeFilter: ['class'] });
    if (metaRef.current) observer.observe(metaRef.current);
    if (actionsRef.current) observer.observe(actionsRef.current);
    measure();
    return () => { observer.disconnect(); modeObserver.disconnect(); window.removeEventListener('resize', measure); };
  }, [Boolean(frame), runtimeLayout]);

  // Follow the image actually on screen, never a loading request or hover preview.
  const playingVersion = playing && active ? displayed?.version ?? null : null;
  useEffect(() => { onPlaybackVersion?.(playingVersion); }, [playingVersion, onPlaybackVersion]);
  useEffect(() => () => onPlaybackVersion?.(null), [onPlaybackVersion]);

  useEffect(() => { setPlaying(false); setDirection(1); setPreviewId(null); setPreviewImage(null); wheel.current = 0; }, [sequence]);
  useEffect(() => {
    if (!playing || !frame || !ready || !active || previewFrame) return;
    const timer = window.setTimeout(() => {
      if (jumpScale !== 'frame') {
        // Version and milestone playback step between push nodes of the selected range.
        const next = unitPlaybackStep(navigationFrames, navigationIndex, direction > 0 ? 1 : -1, jumpScale, mode, hasMilestone);
        if (next.index !== navigationIndex) onSelect(navigationFrames[next.index].id);
        setDirection(next.direction); setPlaying(next.playing);
        return;
      }
      const next = playbackStep(index, frames.length, direction, mode);
      onSelect(frames[next.index].id); setDirection(next.direction); setPlaying(next.playing);
    }, t.playbackIntervalMs / speed);
    return () => window.clearTimeout(timer);
  }, [playing, frame, ready, active, previewFrame, index, frames, direction, mode, speed, onSelect, jumpScale, navigationIndex, milestones]);
  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * stageSize.height : event.deltaY;
      const result = wheelFrameDelta(pixels, wheel.current, t.theater.wheelStep);
      wheel.current = result.accumulated;
      if (result.move) stepFrame.current(result.move);
    };
    screen.addEventListener('wheel', onWheel, { passive: false });
    return () => screen.removeEventListener('wheel', onWheel);
  }, [Boolean(frame), stageSize.height]);
  useEffect(() => {
    if (prototype.error) setToast(prototype.error);
  }, [prototype.error]);
  useEffect(() => {
    // Exit requests also apply while Playback is turning back to the gallery, so a runtime never outlives it.
    if (!liveRequestKey || (liveRequestKey > 0 && (!active || !ready))) return;
    // Consume in the owner so remounting Playback cannot replay an old open request.
    onLiveRequestHandled(liveRequestKey);
    if (liveRequestKey < 0) { if (runtimeMode) exitPrototype(); return; }
    setPlaying(false); setPreviewId(null); setPreviewImage(null); openRuntime('live');
  }, [active, ready, liveRequestKey, onLiveRequestHandled]);
  const capturedRuntime = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (capturedRuntime.current || params.get('screenshot') !== '1' || !active || !ready) return;
    if (params.get('prototypeOpen') === '1' && prototype.available && frame?.kind === 'push') {
      capturedRuntime.current = true; setPlaying(false); openRuntime('prototype'); void prototype.enter();
    }
  }, [prototype.available, frame?.id, active, ready]);
  const capturedFrameChip = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (capturedFrameChip.current || params.get('screenshot') !== '1' || params.get('frameChip') !== '1' || !active || !ready || !frame) return;
    capturedFrameChip.current = true; attachFrame(frameContextOf(frame));
  }, [frame?.id, active, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!frame) return <div className="gallery-empty">No frames in this date range. Choose a wider range to play.</div>;
  const fullFrame = theaterFrameSize(stageSize, baseline, baseline);
  const naturalFrame = runtimeLayout ? fullFrame : fitFrameToHeight(fullFrame, stageSize.bodyHeight - stageSize.actions - stageSize.caption, t.theater.frameMinWidthShare);
  const staticRatio = baseline.width / Math.max(baseline.height, 1);
  const staticHeight = runtimeLayout ? Math.min(naturalFrame.height, stageSize.height) : naturalFrame.height;
  const staticFrame = { width: staticHeight * staticRatio, height: staticHeight };
  const frameSize = staticFrame;
  const stageHeight = stageSize.actions + frameSize.height + stageSize.caption;
  // Center the complete section above the transport, keeping the frame full-width.
  const stageTop = Math.max(0, Math.min(stageSize.bodyHeight - stageHeight, (stageSize.bodyHeight - stageHeight) / 2 + t.theater.stageOffsetY));
  const scrollStage = !runtimeLayout && stageHeight > stageSize.bodyHeight;
  function selectFrame(next: number) {
    prototype.exit();
    const nextFrame = frames[next];
    if (previewImage?.id === nextFrame.id) setDisplayed(previewImage);
    setPlaying(false); setPreviewId(null); setPreviewImage(null); onSelect(nextFrame.id);
  }
  stepFrame.current = move => {
    if (runtimeMode || !active || frames.length < 2 || gesture.current) return;
    const next = Math.max(0, Math.min(frames.length - 1, index + move));
    if (next !== index) selectFrame(next);
  };
  function jump(next: number | null) {
    if (next === null) return;
    setDirection(1); prototype.exit(); setPlaying(false); setPreviewId(null); setPreviewImage(null); onSelect(navigationFrames[next].id, true);
  }
  /** The Play unit also drives the transport arrows; it sets the speed, and milestone playback loops. */
  function chooseUnit(scale: JumpScale) {
    setJumpScale(scale); setSpeed(t.unitSpeeds[scale]);
    if (scale === 'milestone') { onRangeChange('all'); setMode('loop'); setDirection(1); }
    try { localStorage.setItem('mitwerk-playback-jump-scale', scale); } catch { /* Keep the session preference when storage is unavailable. */ }
  }

  const frameContext = () => frameContextOf(frame);
  function goToCommit() {
    if (!frame) return;
    window.dispatchEvent(new CustomEvent('mitwerk-go-to-commit', { detail: { version: frame.version } }));
  }
  function inContentColumn(root: HTMLElement, x: number) {
    const content = root.querySelector<HTMLElement>('.theater-stage');
    if (!content) return true;
    const bounds = content.getBoundingClientRect(), style = getComputedStyle(root);
    // Protect the content and its inline padding for the entire height below the header.
    return x >= bounds.left - (parseFloat(style.paddingLeft) || 0)
      && x <= bounds.right + (parseFloat(style.paddingRight) || 0);
  }
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (runtimeMode || !active || !event.isPrimary || event.button !== 0 || gesture.current) return;
    const root = event.currentTarget;
    if ((event.target as HTMLElement).closest('button, input, select, label, a, [data-orbit-blocked]')) return;
    // Control rows reserve their own box and margins independently of the content column.
    const blocked = [...root.querySelectorAll<HTMLElement>('[data-orbit-blocked]:not([data-orbit-inline])')].some(element => {
      const style = getComputedStyle(element);
      const margin = (side: string) => parseFloat(style.getPropertyValue(`margin-${side}`)) || 0;
      const bounds = element.getBoundingClientRect(), row = root.getBoundingClientRect();
      return reservedControlContains(
        { left: row.left, width: row.width, top: row.top, height: row.height },
        { left: bounds.left, width: bounds.width, top: bounds.top, height: bounds.height },
        event.clientX, event.clientY,
        { left: margin('left'), right: margin('right'), top: margin('top'), bottom: margin('bottom') },
      );
    });
    if (blocked) return;
    const frameClick = !!(event.target as HTMLElement).closest('.theater-screen');
    gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, frameClick, dismissible: !inContentColumn(root, event.clientX), orbit: null };
    // The frame image is a native drag source for chat; orbit starts from the theater area around it.
    if (!frameClick) root.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId || drag.frameClick) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.orbit && Math.hypot(dx, dy) >= t.webgl.dragThreshold) {
      const screen = event.currentTarget.querySelector('.theater-screen');
      if (!screen) return;
      const target = containedFrameTarget(screen.getBoundingClientRect(), frame!.width, frame!.height);
      drag.orbit = onOrbit(frame!.id, target);
      if (!drag.orbit) return;
      setPlaying(false);
    }
    drag.orbit?.move(dx, dy);
  }
  function pointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    gesture.current = null;
    drag.orbit?.end();
    if (!drag.orbit && event.type === 'pointerup') {
      if (drag.frameClick) goToCommit();
      else if (drag.dismissible && !inContentColumn(event.currentTarget, event.clientX)) onDismiss();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function enterPrototype() {
    setPlaying(false); setPreviewId(null); setPreviewImage(null);
    if (liveTarget) { openRuntime('live'); return; }
    if (prototype.available === false) { setToast('No saved codebase for this push.'); return; }
    openRuntime('prototype'); void prototype.enter();
  }
  function exitPrototype() {
    if (runtimeExitTimer.current || runtimeExiting) return;
    pendingPrototype.current = null;
    captureRuntimeRect();
    setRuntimeExiting(true);
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : t.theaterMotion.runtimeReturnMs;
    runtimeExitTimer.current = setTimeout(() => {
      runtimeExitTimer.current = null;
      prototype.exit(); setRuntimeMode(null); setRuntimeExiting(false);
      requestAnimationFrame(() => entryButton.current?.focus());
    }, duration);
  }

  const prototypeVersion = requested?.version ?? frame.version;
  const prototypeNeighbors = adjacentPrototypeFrames(runtimeCatalog, prototypeVersion);
  function switchPrototype(target: GalleryFrame | null) {
    if (!target || runtimeExiting) return;
    pendingPrototype.current = target.id;
    prototype.exit(); setPlaying(false); setPreviewId(null); setPreviewImage(null);
    onSelect(target.id);
  }

  const playbackOptions = <div className="playback-options">
        <PlaybackControls unit={jumpScale} speed={speed} loop={mode} onUnit={chooseUnit} onSpeed={setSpeed} onLoop={value => { setMode(value); setDirection(1); }}/>
        </div>;
  // Keep controls readable when height limits the image; all rows share the responsive content cap.
  const rowWidth = stageMeasured ? (runtimeLayout ? stageSize.width : frameSize.width) : undefined;
  const milestone = versionMilestone(milestones, frame.version);
  const rangeLabel = ranges.find(option => option.value === range)!.label.toLowerCase();
  const rangeFrames = catalog.filter(item => inRange(item, range, now));
  const atRangeStart = rangeFrames[0]?.id === selectedId;
  const atRangeEnd = rangeFrames.at(-1)?.id === selectedId;
  /** With No loop, pressing play at the last unit starts over from the first one. */
  function restartAtEnd() {
    if (jumpScale === 'frame') { if (index === frames.length - 1) onSelect(frames[0].id); return; }
    if (nextJump !== null) return;
    const first = firstJumpIndex(navigationFrames, jumpScale, hasMilestone);
    if (first >= 0) onSelect(navigationFrames[first].id);
  }
  function scrollTimeline(edge: 'start' | 'end') {
    const next = edge === 'start' ? rangeFrames[0] : rangeFrames.at(-1);
    if (!next) return;
    prototype.exit(); setPlaying(false); setPreviewId(null); setPreviewImage(null);
    onSelect(next.id, true);
  }

  return <div className={`theater-view${runtimeLayout ? ' is-runtime' : ''}`} data-runtime-exiting={runtimeExiting} data-frame-id={frame?.id} data-selected-frame-id={requested?.id} data-preview-frame-id={previewFrame?.id} data-range-edge={atRangeEnd ? 'end' : atRangeStart ? 'start' : ''} data-frame-ready={ready && stageMeasured} data-has-frame={!!displayed && stageMeasured}
    style={{ '--playback-entry-ms': `${t.theaterMotion.entryMs}ms`, '--playback-info-delay': `${t.theaterMotion.infoDelayMs}ms`, '--playback-controls-delay': `${t.theaterMotion.playbackDelayMs}ms`, '--runtime-return-ms': `${t.theaterMotion.runtimeReturnMs}ms`, '--theater-footer-gap': `${t.theater.playbackFooterGap}px`, '--theater-action-buttons-gap': `${t.theater.actionButtonsGap}px` } as CSSProperties}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
    {active && !runtimeMode && exportTarget && createPortal(<PlaybackExport catalog={catalog} range={range} now={now} unit={jumpScale} hasMilestone={hasMilestone}/>, exportTarget)}
    <div className={`theater-body${scrollStage ? ' is-scrollable' : ''}`} ref={bodyRef} style={{ '--theater-metadata-height': `${t.theater.metadataHeight}px`, '--theater-metadata-max': `${t.theater.metadataHeightMaxVh}vh`, '--theater-metadata-gap': `${t.theater.metadataGap}px` } as CSSProperties}>
      <div className="theater-stage" style={{ top: runtimeLayout ? undefined : stageTop, width: runtimeLayout ? frameSize.width : rowWidth ?? '100%', '--theater-action-gap': `${t.theater.actionGap}px`, '--theater-frame-bed': t.theater.frameBed } as CSSProperties}>
      {runtimeLayout && runtimeMode && <nav className="prototype-version-controls" aria-label={runtimeMode === 'prototype' ? 'Prototype versions' : 'Live server'} data-orbit-blocked inert={runtimeExiting} onClick={event => event.stopPropagation()}>
        {runtimeMode === 'prototype' && <>
        <button type="button" aria-label="Previous prototype version" disabled={!prototypeNeighbors.previous} onClick={() => switchPrototype(prototypeNeighbors.previous)}><i className="ph-fill ph-play is-previous" aria-hidden="true"/></button>
        <PrototypeVersionLabel version={prototypeVersion}/>
        <button type="button" aria-label="Next prototype version" disabled={!prototypeNeighbors.next} onClick={() => switchPrototype(prototypeNeighbors.next)}><i className="ph-fill ph-play" aria-hidden="true"/></button>
        </>}
        {/* Real full screen for the running prototype or live server; Esc / Tab exit (see EmbeddedPrototype). */}
        <button type="button" className="runtime-fullscreen" aria-label={`Open ${runtimeMode === 'live' ? 'live server' : 'prototype'} in full screen`} onClick={() => void runtimeRef.current?.requestFullscreen?.()}><i className="ph ph-corners-out" aria-hidden="true"/></button>
      </nav>}
      <div className="theater-frame-actions" inert={!!runtimeMode} aria-hidden={!!runtimeMode} data-orbit-blocked ref={actionsRef}>
        {(frame.kind !== 'push' || milestone) && <FrameAnnotations key={navigationKey} selected={!previewFrame || frame.id === selectedId} color={annotationBookmarkColor(frame.branch, branches)} milestone={milestone} milestoneColor={galleryBranchPaint(frame.branch ?? 'main', branches)} frame={frame} active={active && ready && !playing} onOpen={() => { setPlaying(false); setDisplayed(frame); setPreviewId(null); setPreviewImage(null); onSelect(frame.id); }}/>}
        <div className="theater-action-buttons">

        <button className="theater-text-action frame-chat-action" onClick={event => { event.stopPropagation(); attachFrame(frameContext()); }}><Icon name="plus"/>Add frame to chat</button>
        {(frame.kind === 'push' || liveTarget) && <button ref={entryButton} className="theater-text-action frame-chat-action is-enter" disabled={!active || (!liveTarget && (prototype.loading || prototype.available === null))} onClick={enterPrototype}>
          {liveTarget ? <PanelIcon name="globe"/> : <Icon name="play"/>}{liveTarget ? 'Live server' : 'Enter prototype'}
        </button>}
        </div>
      </div>
        <div className={`theater-screen${displayed?.kind === 'push' ? ' is-push' : ''}${runtimeLayout ? ' is-runtime-screen' : ''}`} inert={runtimeExiting} ref={screenRef} style={{ height: frameSize.height, width: frameSize.width, maxWidth: '100%' }}
          onDragStart={event => { if (runtimeMode) { event.preventDefault(); return; } setPlaying(false); writeFrameDrag(event.dataTransfer, frameContext()); }}>
          {runtimeMode && <EmbeddedPrototype ref={runtimeRef} key={runtimeMode === 'prototype' ? frame.id : runtimeMode} mode={runtimeMode} url={prototype.url} loading={prototype.loading} error={prototype.error ?? (prototype.available === false ? 'No saved codebase for this push.' : null)} version={frame.version} onRetry={() => void prototype.enter()}/>}
          {(!runtimeMode || runtimeExiting) && (displayed ? <img draggable src={`${import.meta.env.BASE_URL}${displayed.url}`} alt={`${formatVersion(displayed.version)}: ${displayed.summary}`} aria-hidden={showingPreview}/>
            : <div className="gallery-empty">{failedImage ? 'This saved image could not be loaded.' : 'Loading frame…'}</div>)}
          {!runtimeMode && showingPreview && <img draggable className="theater-preview-image" src={`${import.meta.env.BASE_URL}${frame.url}`} alt={`Preview ${formatVersion(frame.version)}: ${frame.summary}`}/>}
        </div>
      <div className="theater-metadata" inert={!!runtimeMode} aria-hidden={!!runtimeMode} ref={metaRef} style={{ '--theater-reference-width': `${t.theater.referenceChipWidth}px`, '--line-added': t.theater.addedColor, '--line-removed': t.theater.removedColor, '--theater-row-gap': `${t.theater.metadataRowGap}px`, '--theater-summary-gap': `${t.theater.metadataRowGap * (t.theater.summaryGapScale - 1)}px` } as CSSProperties}>
        {failedImage && displayed && <span role="status" data-orbit-blocked>The next image could not be loaded. The previous frame is still shown.</span>}
        <div className="theater-version" data-orbit-blocked>
          <span className="theater-version-group">
            <span className="theater-version-tag">{formatVersion(frame.version)}</span><span>{theaterCaptionLead(frame).replace(/: $/, '')}</span>
          </span>
          <time dateTime={new Date(frame.timestamp).toISOString()}>{formatTime(frame.timestamp)}</time>
        </div>
        <TheaterCaption text={theaterCaption(frame)}/>
        <div className="theater-branch-row">
          {frame.branch && <span className="theater-branch"><Icon name="branch" size={12}/>{frame.branch}</span>}
          {(frame.added !== null || frame.removed !== null) && <span className="gallery-small theater-lines"><span className="is-added">+{frame.added ?? '0'}</span> <span className="is-removed">−{frame.removed ?? '0'}</span> lines</span>}
        </div>
        <ReferenceFiles files={frameReferences(frame, catalog, references)}/>
      </div>
      </div>
    </div>
    <div className="theater-playback" data-orbit-blocked style={{ width: runtimeLayout ? undefined : rowWidth, alignSelf: !runtimeLayout && rowWidth ? 'center' : undefined }}>
      {runtimeMode && <div className="runtime-exit-scrim" inert={runtimeExiting} style={{ '--runtime-exit-offset-y': `${runtimeMode === 'live' ? 0 : t.theater.prototypeExitOffsetY}px` } as CSSProperties}>
        <button ref={exitButton} className="theater-text-action" onClick={exitPrototype}><Icon name="close"/>Exit {runtimeMode === 'live' ? 'live server' : 'prototype'}</button>
      </div>}
      <div className="gallery-toolbar playback-controls" inert={!!runtimeMode} aria-hidden={!!runtimeMode} style={{ '--playback-enabled': t.theater.playbackEnabled, '--playback-disabled': t.theater.playbackDisabled } as CSSProperties}>
        <PlaybackTip label={`Jump to timeline start (${rangeLabel})`} edge="start"><button className="icon-button" aria-label="Jump to timeline start" disabled={!rangeFrames.length || atRangeStart} onClick={() => scrollTimeline('start')}><i className="ph-fill ph-caret-line-left" aria-hidden="true"/></button></PlaybackTip>
        <div className="playback-transport">
        <PlaybackJump direction={-1} scale={jumpScale} unavailable={previousJump === null} onJump={() => jump(previousJump)}/>
        <PlaybackTip label={playing ? 'Pause' : 'Play'}><button className="icon-button playback-toggle" onClick={() => { prototype.exit(); if (!playing && mode === 'once') restartAtEnd(); setPlaying(!playing); }} disabled={frames.length < 2} aria-label={playing ? 'Pause playback' : 'Play frames'}><Icon name={playing ? 'pause' : 'play'}/></button></PlaybackTip>
        <PlaybackJump direction={1} scale={jumpScale} unavailable={nextJump === null} onJump={() => jump(nextJump)}/>
        </div>
        <div className="playback-end-controls">
          {playbackOptions}
          <PlaybackTip label={`Jump to timeline end (${rangeLabel})`} edge="end"><button className="icon-button" aria-label="Jump to timeline end" disabled={!rangeFrames.length || atRangeEnd} onClick={() => scrollTimeline('end')}><i className="ph-fill ph-caret-line-right" aria-hidden="true"/></button></PlaybackTip>
        </div>
      </div>
      <div className="runtime-passive-timeline" inert={!!runtimeMode} aria-hidden={!!runtimeMode}><PlaybackTimeline unit={jumpScale} hasMilestone={hasMilestone} branches={branches} navigationKey={navigationKey} active={active} viewportRef={timelineRef} frames={frames} catalog={catalog} range={range} now={now} index={Math.max(0, index)} selectedId={selectedId} previewIndex={previewIndex} onPreview={next => { if (prototype.open || prototype.loading) return; setPreviewId(next === null ? null : frames[next].id); if (next === null) setPreviewImage(null); }} onSelect={selectFrame} onSelectPush={id => { prototype.exit(); setPlaying(false); setPreviewId(null); setPreviewImage(null); onSelect(id); }}/></div>
      {projectToast.shown && <div className="project-toast" role="status" data-leaving={projectToast.leaving || undefined}>{projectToast.shown}</div>}
    </div>
  </div>;
}
