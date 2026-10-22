import { captureScreen, type CaptureScreen } from '../../shared/capture-screens.ts';
import { activeRouteColor, branchColor } from '../version-tree/tokens.ts';
import { galleryTokens as t } from './tokens.ts';

export type Capture = {
  screen?: CaptureScreen;
  fullPrompt?: string;
  /** Pushes: the full Git commit message (the filename summary is length-limited). */
  commitMessage?: string;
  tokenUsage?: { input: number; output: number; total: number; simulated: boolean };
  id: string; filename: string; url: string; width: number; height: number;
  /** Small WebP for album planes and previews; catalogs published before it fall back to `url`. */
  thumbUrl?: string;
  kind: 'prompt' | 'push' | 'capture'; number: number | null; branch: string | null;
  timestamp: number; summary: string; added: string | null; removed: string | null;
};
export type GalleryFrame = Capture & { version: number; position: number };
export type GalleryVersion = { number: number; index: number; frames: GalleryFrame[] };
export type RangeKey = 'today' | '3' | '7' | '14' | '30' | 'all';

/** Planning references carry a prompt prefix but do not require a capture timestamp. */
export function visualPromptNumber(filename: string): number | null {
  const match = /^\[prompt #(\d+)\]\s+[^/\\]+\.png$/i.exec(filename);
  return match && Number.isSafeInteger(+match[1]) && +match[1] > 0 ? +match[1] : null;
}

export const ranges: { value: RangeKey; label: string }[] = [
  { value: 'today', label: 'Today' }, { value: '3', label: 'Last 3 days' },
  { value: '7', label: 'Last 7 days' }, { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' }, { value: 'all', label: 'All time' },
];

/** Metadata comes from capture names, never a per-image fixture or lookup table. */
export function parseCaptureName(filename: string) {
  const timestamp = /-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})(?:-v\d+)?\.png$/i.exec(filename)
    ?? /Screenshot (\d{4})-(\d{2})-(\d{2}) at (\d{2})\.(\d{2})\.(\d{2})\.png$/i.exec(filename);
  if (!timestamp) return null;
  const [, year, month, day, hour, minute, second] = timestamp;
  const date = new Date(+year, +month - 1, +day, +hour, +minute, +second);
  if (date.getFullYear() !== +year || date.getMonth() !== +month - 1 || date.getDate() !== +day
    || +hour > 23 || +minute > 59 || +second > 59) return null;
  const tag = /^\[(prompt|push)(?: #(\d+))?\]\s*/i.exec(filename);
  const body = filename.slice(tag?.[0].length ?? 0, timestamp.index).trim();
  const changes = /\+([\d.]+[km]?)\s*-\s*([\d.]+[km]?)/i.exec(body);
  const isFiles = (piece: string) => /^\d+ files?$/.test(piece);
  const isDelta = (piece: string) => /^\+[\d.]+[km]?\s*-\s*[\d.]+[km]?$/i.test(piece);
  const isBranch = (piece: string) => /^[A-Za-z][A-Za-z0-9._/-]*$/.test(piece);
  const pieces = body.split(' · ');
  const rest = pieces.filter(piece => !isFiles(piece) && !isDelta(piece));
  const branch = rest.length > 1 && isBranch(rest[0]) ? rest[0] : null;
  const summary = rest.filter(piece => piece !== branch).join(' · ').replace(/\[screen landing\]\s*/g, '');
  const screen: CaptureScreen = body.includes('[screen landing]') ? 'landing' : 'homescreen';
  return { kind: (tag?.[1].toLowerCase() ?? 'capture') as Capture['kind'], number: tag?.[2] ? +tag[2] : null,
    screen, branch, timestamp: date.getTime(), summary: summary || 'Saved project frame',
    added: changes?.[1] ?? null, removed: changes?.[2] ?? null };
}

/** A version with at most one prompt keeps its push capture as a frame. Busier versions leave the push on the gutter node. */
export function versionKeepsPush(frames: { kind?: string }[]) {
  return frames.filter(frame => frame.kind === 'prompt').length <= 1;
}

/** A push closes a version. Captures after the latest push belong to the next version. */
export function buildVersions(captures: Capture[]): GalleryVersion[] {
  const ordered = [...captures].sort((a, b) => a.timestamp - b.timestamp || a.filename.localeCompare(b.filename));
  const pushes = ordered.filter(frame => frame.kind === 'push' && frame.number !== null);
  const pending = Math.max(0, ...pushes.map(frame => frame.number!)) + 1;
  const groups = new Map<number, Capture[]>();
  let pushIndex = 0;
  for (const frame of ordered) {
    while (pushIndex < pushes.length && pushes[pushIndex].timestamp < frame.timestamp) pushIndex++;
    const version = frame.kind === 'push' && frame.number !== null ? frame.number
      : pushes[pushIndex]?.number ?? pending;
    if (!groups.has(version)) groups.set(version, []);
    groups.get(version)!.push(frame);
  }
  return [...groups].sort(([a], [b]) => a - b).map(([number, frames], index) => {
    return { number, index, frames: frames.map((frame, i) => {
      const lastPrompt = frames.filter(candidate => candidate.kind === 'prompt' && captureScreen(candidate) === captureScreen(frame)).at(-1);
      return { ...frame,
      // Keep push identity and metadata; only its displayed image comes from the final prompt.
      ...(frame.kind === 'push' && lastPrompt ? { url: lastPrompt.url, width: lastPrompt.width, height: lastPrompt.height } : {}),
      version: number, position: index + (i + 0.5) / frames.length,
    }; }) };
  });
}

/** Filter after assigning versions, so buckets keep the same Git identities. */
export function versionsForScreen(versions: GalleryVersion[], screen: string): GalleryVersion[] {
  return versions.map(version => ({ ...version, frames:version.frames.filter(frame => captureScreen(frame) === screen) }))
    .filter(version => version.frames.length > 0)
    .map((version, index) => ({ ...version, index, frames:version.frames.map((frame, i) => ({ ...frame, position:index + (i + .5) / version.frames.length })) }));
}

export function rangeStart(range: RangeKey, now = Date.now()) {
  if (range === 'all') return -Infinity;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (range === 'today' ? 0 : Number(range) - 1));
  return start.getTime();
}
export function inRange(frame: Capture, range: RangeKey, now = Date.now()) {
  return frame.timestamp >= rangeStart(range, now) && frame.timestamp <= now;
}

/** Enter Version blocks with the whole project history visible. */
export const defaultVersionRange: RangeKey = 'all';

export function ratioLabel(visible: number, total: number, singular: string, plural: string) {
  const unit = total === 1 ? singular : plural;
  return visible === total ? `${total} ${unit}` : `${visible}/${total} ${unit}`;
}

/** Off-main branches reuse the version-stream route palette. The checked-out branch stays black. */
export function galleryBranchPaint(branch: string, branches: string[], active = 'main') {
  const ids = [active, ...branches.filter(id => id !== active)];
  return activeRouteColor(branchColor(branch, ids), branch === active);
}

/** Share of catalog prompts inside the selected range. Captures are the prompt records. */
export function promptShare(visible: number, total: number) {
  return total > 0 ? visible / total : 0;
}

export function rangeCounts(versions: GalleryVersion[], range: RangeKey, now: number) {
  const shown = (version: GalleryVersion) => versionKeepsPush(version.frames) ? version.frames : version.frames.filter(frame => frame.kind !== 'push');
  const frames = versions.flatMap(shown);
  const visibleFrames = frames.filter(frame => inRange(frame, range, now));
  return {
    frames: visibleFrames.length,
    frameTotal: frames.length,
    versions: versions.filter(version => shown(version).some(frame => inRange(frame, range, now))).length,
    versionTotal: versions.length,
  };
}
/** One tick per day, plus the newest prompt unless `latestPrompt` is off (the work state simulator, where it changes every step). */
export function dateTicks(frames: GalleryFrame[], { latestPrompt: markLatest = true } = {}) {
  const days = new Map<string, GalleryFrame>();
  for (const frame of frames) {
    const day = new Date(frame.timestamp).toLocaleDateString('en-CA');
    if (!days.has(day) || frame.timestamp < days.get(day)!.timestamp) days.set(day, frame);
  }
  const ticks = [...days.values()];
  const latestPrompt = frames.filter(frame => frame.kind === 'prompt').reduce<GalleryFrame | undefined>((latest, frame) => !latest || frame.timestamp >= latest.timestamp ? frame : latest, undefined);
  if (markLatest && latestPrompt && !ticks.some(frame => frame.id === latestPrompt.id)) ticks.push(latestPrompt);
  return ticks.sort((a, b) => a.timestamp - b.timestamp).map(frame => ({ id: frame.id, timestamp: frame.timestamp, position: frame.position }));
}

/** Sample versions, not captures, so busy versions cannot dominate the album. */
/**
 * Sampled versions whose frames carry images. `spread` spaces samples from first to last; `start` keeps
 * every stride-th version from the first plus the newest, so a growing album (the work state
 * simulator) keeps its earlier samples and only adds new ones.
 */
export function representativeFrames(versions: GalleryVersion[], range: RangeKey, now: number, anchor: 'spread' | 'start' = 'spread') {
  const eligible = versions.map(version => version.frames.filter(frame => inRange(frame, range, now))).filter(frames => frames.length);
  const stride = t.representativeVersionStride;
  const picks = anchor === 'start'
    ? eligible.flatMap((frames, i) => i % stride === 0 || i === eligible.length - 1 ? [frames] : [])
    : (() => { const count = Math.ceil(eligible.length / stride); return Array.from({ length: count }, (_, i) => eligible[count === 1 ? eligible.length - 1 : Math.floor(i * (eligible.length - 1) / (count - 1))]); })();
  return picks.map(frames => {
    const gallery = versionKeepsPush(frames) ? frames : frames.filter(frame => frame.kind !== 'push');
    return gallery.filter(frame => frame.kind === 'push').at(-1) ?? gallery.at(-1)!;
  });
}

/** Edge travel is intentional only inside the viewport, with a gentle speed ramp. */
export function edgePanStrength(x: number, y: number, width: number, height: number) {
  if (x < 0 || y < 0 || x > width || y > height) return 0;
  const band = Math.min(t.edgePan.bandPx, width / 4, height / 4);
  if (band <= 0) return 0;
  const proximity = Math.max(0, 1 - Math.min(x, y, width - x, height - y) / band);
  return proximity * proximity;
}

export function edgePanArmed(heldMs: number) {
  return heldMs >= t.edgePan.delayMs;
}
export type LoopMode = 'once' | 'loop' | 'ping-pong';
export function playbackStep(index: number, count: number, direction: number, mode: LoopMode) {
  if (count < 2) return { index: 0, direction: 1, playing: false };
  const next = index + direction;
  if (next >= 0 && next < count) return { index: next, direction, playing: true };
  if (mode === 'once') return { index, direction, playing: false };
  if (mode === 'loop') return { index: direction > 0 ? 0 : count - 1, direction, playing: true };
  return { index: index - direction, direction: -direction, playing: true };
}

export const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Compact local date used by featured date-axis labels and saved-frame names. */
// Constructing a formatter is costly; menus and labels format hundreds of frames per render.
const frameDateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
export function formatFrameDate(timestamp: number) {
  const parts = frameDateFormat.formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value ?? '';
  return `${part('month')} ${part('day')}, ${part('hour')}:${part('minute')}`;
}

export function formatVersion(number: number) { return `v${number}`; }

/** Compact local timestamp shared by the saved-frame menu. */
export function formatFrameLabel(frame: Pick<GalleryFrame, 'version' | 'timestamp' | 'number'>) {
  return `${frame.number === null ? "" : `#${frame.number} - `}${formatVersion(frame.version)} - ${formatFrameDate(frame.timestamp)}`;
}

/** Hover captions contain only the quoted summary; metadata stays on the axis rulers. */
export function hoverCaptionLines(frame: Pick<GalleryFrame, 'summary'>) {
  return [`"${frame.summary.trim()}"`];
}

/** Fixed-screen preview: normalize whitespace and include the ellipsis in the cap. */
export function galleryPromptLabel(text: string) {
  const characters = Array.from(text.trim().replace(/\s+/g, ' '));
  const limit = t.promptLabel.maxCharacters;
  return characters.length > limit ? characters.slice(0, limit - 3).join('') + '...' : characters.join('');
}

/** Word-wrap to a measured width, hard-breaking a token that cannot fit. */
export function wrapTextToWidth(text: string, maxWidth: number, measure: (value: string) => number) {
  if (maxWidth <= 0) return text ? [text] : [];
  const lines: string[] = [];
  const pushChunk = (value: string) => {
    let chunk = '';
    for (const ch of value) {
      const trial = chunk + ch;
      if (!chunk || measure(trial) <= maxWidth) chunk = trial;
      else { lines.push(chunk); chunk = ch; }
    }
    return chunk;
  };
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next) <= maxWidth) current = next;
    else {
      if (current) lines.push(current);
      current = measure(word) <= maxWidth ? word : pushChunk(word);
    }
  }
  if (current) lines.push(current);
  return lines;
}

export type FrameRequest = ({version: number} | {frameId: string} | {live: boolean}) & { milestone?: boolean; onMilestoneClose?: () => void };
export function resolveFrameRequest(versions: GalleryVersion[], request: FrameRequest) {
  if ('live' in request) return versions.flatMap(version => version.frames).sort((a,b) => b.timestamp - a.timestamp)[0];
  return versions.flatMap(version => version.frames).find(frame => 'frameId' in request
    ? frame.id === request.frameId : frame.kind === 'push' && frame.version === request.version);
}
