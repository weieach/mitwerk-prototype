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
  center: () => void; reset: () => void;
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
