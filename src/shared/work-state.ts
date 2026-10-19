import type { GitBranch, GitHistory } from '../features/version-tree/git-history.ts';

/**
 * Work state simulator: one shared progress value replays the workspace from empty (0) to its
 * current state (1). Every panel derives its data from the same chronological capture cutoff.
 */
export const workStateTokens = {
  /** Slider resolution; the readout rounds to whole percent. */
  steps: 1000,
  keyboardStep: .01,
  keyboardRepeatMs: 50,
  doubleZeroMs: 300,
  /** Intermediate chat variations between the empty and the current conversation. */
  chatSlides: 4,
  /** Exchanges (a prompt and its replies) shown per chat variation. */
  chatExchanges: 2,
  growMs: 520,
  /** Share of `growMs` a new axis label waits, so its ruler tick leads the slide-in. */
  labelDelay: .35,
  slideMs: 360,
  panelOpenMs: 420,
  panelCloseMs: 300,
  easing: 'cubic-bezier(.22,1,.36,1)',
  /** Percent used by progress captures that open the simulator without a stated value. */
  captureProgress: 0.6,
  /** While dragging, panels take the slider value after it rests this long, and at least this often. */
  settleMs: 70,
  maxWaitMs: 200,
  /** Version blocks wait up to this long for the next frames' images before redrawing. */
  imageWaitMs: 140,
  /** On first open, warm the gallery images for this many evenly spaced work states. */
  preloadSamples: 10,
  preloadLimit: 90,
  preloadMinMs: 700,
  preloadTimeoutMs: 5000,
} as const;

/** `progress` follows the slider; `applied` is what the panels render after the settle delay. */
export type WorkState = { open: boolean; hidden?: boolean; progress: number; applied: number; loading: boolean };

const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));

const current: WorkState = { open: false, progress: 1, applied: 1, loading: false };
const storageKey = 'mitwerk-work-state';

/** A state left below 100% survives closing the sheet and reloads within this browser session. */
function savedProgress() {
  try { const saved = Number(sessionStorage.getItem(storageKey)); return saved >= 0 && saved < 1 && sessionStorage.getItem(storageKey) !== null ? saved : 1; }
  catch { return 1; }
}
/** Sets the work state the next page load opens with (0 = a new, empty project; 1 = the full sample). */
export function setStartingWorkState(progress: number) { saveProgress(clamp(progress)); }
function saveProgress(progress: number) {
  try { if (progress >= 1) sessionStorage.removeItem(storageKey); else sessionStorage.setItem(storageKey, String(progress)); } catch { /* Session-only convenience. */ }
}

/** Captures can request `workState=<0..1>`; they render settled, without the warm-up step. */
function initialState(): WorkState {
  if (typeof location === 'undefined') return current;
  const params = new URLSearchParams(location.search);
  if (params.get('screenshot') === '1') {
    const requested = params.get('workState');
    if (requested === null) return current;
    const progress = requested === '' || requested === 'open' ? workStateTokens.captureProgress : clamp(Number(requested));
    return { open: true, progress, applied: progress, loading: false };
  }
  const progress = savedProgress();
  return { ...current, progress, applied: progress };
}

let state = initialState();
let warmed = false;
const listeners = new Set<() => void>();
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSince: number | null = null;
function emit(next: WorkState) {
  if (next.hidden === state.hidden && next.open === state.open && next.progress === state.progress && next.applied === state.applied && next.loading === state.loading) return;
  state = next;
  listeners.forEach(listener => listener());
}
function apply() {
  clearTimeout(settleTimer); pendingSince = null;
  emit({ ...state, applied: state.progress });
  saveProgress(state.applied);
}

// Panels read the applied state; the live slider value would re-render them on every pointer move.
let applied: WorkState = { ...state, progress: state.applied };
function appliedSnapshot() {
  if (applied.hidden !== state.hidden || applied.open !== state.open || applied.applied !== state.applied || applied.loading !== state.loading) applied = { ...state, progress: state.applied };
  return applied;
}

export const workStateStore = {
  get: () => state,
  /** Changes only when the panels' state changes (open, applied, loading), never per slider move. */
  getApplied: appliedSnapshot,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  /** Opening resumes the saved state; the first open of a session warms gallery images first. */
  open: () => emit({ ...state, open: true, hidden: false, loading: !warmed }),
  /** Hide only the sheet; the simulator and its keyboard session stay active. */
  hide: () => { if (state.open) emit({ ...state, hidden: true }); },
  show: () => { if (state.open) emit({ ...state, hidden: false }); },
  /** Closing hides the sheet and keeps the simulated state; it does not reset to 100%. */
  close: () => { apply(); emit({ ...state, open: false, hidden: false, loading: false }); },
  toggle: () => state.open && !state.hidden ? workStateStore.close() : workStateStore.open(),
  ready: () => { warmed = true; emit({ ...state, loading: false }); },
  /** Debounced with a maximum wait, so dragging redraws the panels in steady steps. */
  setProgress(progress: number) {
    emit({ ...state, progress: clamp(progress) });
    const now = Date.now();
    pendingSince ??= now;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(apply, Math.max(0, Math.min(workStateTokens.settleMs, workStateTokens.maxWaitMs - (now - pendingSince))));
  },
  /** Releasing the slider applies its value immediately. */
  commit: apply,
};

/** Progress the panels render. A state saved below 100% stays applied while the sheet is closed. */
export function effectiveProgress(work: WorkState) {
  return work.applied;
}

/** Panels simulate (Fit all, All time, anchored growth) while the sheet is open or a past state is kept. */
export function isSimulating(work: Pick<WorkState, 'open' | 'applied'>) {
  return work.open || work.applied < 1;
}

/**
 * Whether a dated record (to-do, annotation, task) existed at the simulated cutoff.
 * Undated records predate the history, so only the empty state hides them.
 */
export function existedAt(timestamp: string | number | undefined, cutoff: number) {
  if (cutoff === Infinity) return true;
  const time = typeof timestamp === 'number' ? timestamp : timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(time) ? time <= cutoff : cutoff > -Infinity;
}

/** Whole captures shown at a progress value. Data only changes when this count changes. */
export function simulatedCount(total: number, progress: number) {
  return progress >= 1 ? total : Math.max(0, Math.min(total, Math.round(clamp(progress) * total)));
}

type Timed = { timestamp: number; filename?: string };
function chronological<T extends Timed>(items: readonly T[]) {
  return [...items].sort((a, b) => a.timestamp - b.timestamp || (a.filename ?? '').localeCompare(b.filename ?? ''));
}

/**
 * The first `count` captures in time order, plus the Git cutoff: work done before the next
 * excluded capture. `now` is the simulated clock, so date ranges stay relative to that moment.
 */
export function simulateCaptures<T extends Timed>(captures: readonly T[], count: number) {
  if (count >= captures.length) return { captures: [...captures], cutoff: Infinity, now: null as number | null, complete: true };
  const ordered = chronological(captures);
  const kept = ordered.slice(0, Math.max(0, count));
  return { captures: kept, cutoff: count <= 0 ? -Infinity : ordered[count].timestamp - 1, now: kept.at(-1)?.timestamp ?? null, complete: false };
}

/** Git history as of the cutoff. Branch tips move back to their newest commit before it. */
export function simulateGitHistory(git: GitHistory, cutoff: number): GitHistory {
  if (cutoff === Infinity) return git;
  const commits = git.commits.filter(commit => commit.timestamp <= cutoff);
  const included = new Set(commits.map(commit => commit.sha));
  const parents = new Map(git.commits.map(commit => [commit.sha, commit.parents]));
  const rewind = (sha: string) => {
    const pending = [sha], seen = new Set<string>();
    while (pending.length) {
      const id = pending.shift()!;
      if (included.has(id)) return id;
      if (seen.has(id)) continue;
      seen.add(id);
      pending.push(...(parents.get(id) ?? []));
    }
    return null;
  };
  const retarget = (refs: GitBranch[]) => refs.flatMap(ref => { const tip = rewind(ref.tip); return tip ? [{ ...ref, tip }] : []; });
  return { ...git, commits, branches: retarget(git.branches), remoteBranches: git.remoteBranches && retarget(git.remoteBranches),
    merges: git.merges.filter(merge => included.has(merge.sha)), head: rewind(git.head) ?? '' };
}

/**
 * The chat is a slideshow, not an accumulation: each intermediate step shows a short window of
 * exchanges from that point in the work. 0 is the empty chat and 1 is the current conversation.
 */
export function chatSlide<T extends { role: string }>(messages: readonly T[], progress: number, slides: number = workStateTokens.chatSlides, perSlide: number = workStateTokens.chatExchanges) {
  if (progress >= 1) return { key: 'current', messages: [...messages] };
  if (progress <= 0 || !messages.length) return { key: 'empty', messages: [] as T[] };
  const exchanges: T[][] = [];
  for (const message of messages) {
    if (message.role === 'user' || !exchanges.length) exchanges.push([message]); else exchanges.at(-1)!.push(message);
  }
  const index = Math.min(slides - 1, Math.floor(clamp(progress) * slides));
  const end = Math.max(1, Math.ceil(exchanges.length * (index + 1) / (slides + 1)));
  return { key: `slide-${index}`, index, messages: exchanges.slice(Math.max(0, end - perSlide), end).flat() };
}
