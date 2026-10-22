import { galleryTokens as t } from './tokens.ts';

/** Shared motion curve, including deterministic progress for mid-transition captures. */
export function transitionProgress(elapsed: number, duration: number, freezeAt?: number) {
  const linear = duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / duration));
  const progress = freezeAt === undefined ? linear : Math.min(linear, freezeAt);
  return { progress, eased: progress * progress * (3 - 2 * progress), complete: freezeAt === undefined && progress === 1 };
}

export type TheaterTarget = { left: number; top: number; width: number; height: number };

/** Match the actual contained image, including letterboxing in viewport presets. */
export function containedFrameTarget(rect: TheaterTarget, width: number, height: number): TheaterTarget {
  const scale = Math.min(rect.width / width, rect.height / height);
  const imageWidth = width * scale, imageHeight = height * scale;
  return { left: rect.left + (rect.width - imageWidth) / 2, top: rect.top + (rect.height - imageHeight) / 2, width: imageWidth, height: imageHeight };
}

export type TheaterOrbit = { move: (dx: number, dy: number) => void; end: () => void };
export type GalleryCamera = {
  /** Commands use the live camera; zero resets to 100%. Zoom readouts never write back. */
  zoom: (direction: -1 | 0 | 1) => void;
  focus: (id: string, complete: () => void) => void;
  center: () => void; reset: () => void; top: () => void;
  /** Replays the newest frame arriving, as the gallery would when new work is captured. */
  arrive: () => void;
  orbit: (id: string, target: TheaterTarget, ready: () => void, complete: () => void) => TheaterOrbit | null;
};

/** Pointer displacement controls two independent angles, never an animation clock. */
export function dragAngles(dx: number, dy: number, width: number, height: number, radians: number, pitchLimit: number) {
  return { yaw: -dx / Math.max(1, width) * radians, pitch: Math.max(-pitchLimit, Math.min(pitchLimit, -dy / Math.max(1, height) * radians)) };
}

export function containsPoint(rect: TheaterTarget, x: number, y: number, margin = { left: 0, right: 0, top: 0, bottom: 0 }) {
  return x >= rect.left - margin.left && x <= rect.left + rect.width + margin.right
    && y >= rect.top - margin.top && y <= rect.top + rect.height + margin.bottom;
}

/** A control row reserves its own box and margins across the panel, not neighboring layout gaps. */
export function reservedControlContains(row: TheaterTarget, control: TheaterTarget, x: number, y: number, margin = { left: 0, right: 0, top: 0, bottom: 0 }) {
  return containsPoint({ left: row.left, width: row.width, top: control.top, height: control.height }, x, y, margin);
}

/** CSS-style cubic-bezier timing: solve the curve's x for progress by bisection, then read its y. */
export function cubicBezier([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  const axis = (a: number, b: number, s: number) => 3 * a * (1 - s) ** 2 * s + 3 * b * (1 - s) * s ** 2 + s ** 3;
  return (progress: number) => {
    if (progress <= 0 || progress >= 1) return Math.min(1, Math.max(0, progress));
    let low = 0, high = 1, s = progress;
    for (let step = 0; step < 24; step++) {
      s = (low + high) / 2;
      if (axis(x1, x2, s) < progress) low = s; else high = s;
    }
    return axis(y1, y2, s);
  };
}

const turnEase = cubicBezier(t.theaterMotion.turnCurve);

/** One clock: the frame turn. Playback UI enters during its last part instead of after it. */
export function theaterEntranceDuration() {
  return t.theaterMotion.rotateMs;
}

export function theaterRotationProgress(entranceProgress: number) {
  const progress = Math.min(1, Math.max(0, entranceProgress));
  return { progress, eased: turnEase(progress) };
}

/** The frontal frame border finishes during the last slice of the rotation. */
export function frameBorderEntrance(entranceProgress: number) {
  const { rotateMs, frameBorderMs } = t.theaterMotion;
  const { eased } = transitionProgress(entranceProgress * rotateMs - (rotateMs - frameBorderMs), frameBorderMs);
  return { opacity: eased };
}

/** Opacity of everything around the selected frame, by how far the turn has gone (0 album, 1 frontal). Fully faded
 * by surroundFadeEnd, before edge-on block edges and rulers can stack into a visible line. */
export function surroundOpacity(turned: number) {
  return 1 - transitionProgress(turned, t.theaterMotion.surroundFadeEnd).eased;
}

/** Playback controls, details, header and footer start entering once the turn passes uiStart. */
export function theaterUiEntered(entranceProgress: number) {
  return entranceProgress >= t.theaterMotion.uiStart;
}

/** Midway through the UI entrance, after the frame has mostly settled. */
export function uiCaptureProgress() {
  return t.theaterMotion.uiStart + (1 - t.theaterMotion.uiStart) / 2;
}

export function rotationCaptureProgress() {
  return t.theaterMotion.captureProgress;
}
