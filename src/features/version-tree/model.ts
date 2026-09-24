export type VersionPrompt = { id: string; text: string };

export type VersionFile = {
  name: string;
  kind: 'code' | 'reference' | 'skill';
  url?: string;
  added: number;
  removed: number;
};

const pictureExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif']);

/** Planning pictures and other image references share this check. */
export function isPictureFile(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  return Boolean(ext && pictureExtensions.has(ext));
}

export type VersionNode = {
  git?: { sha: string; parents: string[]; refs: string[]; merges: string[] };

  capture?: { version: number; pushed: boolean; branches: string[]; added: string | null; removed: string | null };
  id: string;
  label: string;
  title: string;
  saveType: 'auto' | 'manual';
  createdAt: string;
  prompts: VersionPrompt[];
  files: VersionFile[];
  summary: string;
  branchId: string;
  parentId: string | null;
  relation: 'root' | 'commit' | 'branch';
};

/** `activeBranchId` is the checked-out branch, like `git branch`; it is independent of `selectedId`. */
export type GraphState = {
  nodes: VersionNode[];
  selectedId: string | null;
  activeBranchId: string;
  /** Later versions grayed by revert; they stay in the graph until restored. */
  revertedIds: string[];
};

/** Card action that replaces Add commit, derived from endpoint and revert state. */
export type VersionCommitAction = 'commit' | 'revert' | 'restore';

/** Last commit on a node's own branch, including tips that still have branch children. */
export function isBranchEndpoint(nodes: VersionNode[], nodeId: string) {
  const node = nodes.find(item => item.id === nodeId);
  return Boolean(node && branchTip(nodes, node.branchId)?.id === nodeId);
}

export function versionCommitAction(isEndpoint: boolean, reverted: boolean): VersionCommitAction {
  if (reverted) return 'restore';
  if (isEndpoint) return 'commit';
  return 'revert';
}

export function versionCommitActionLabel(action: VersionCommitAction) {
  if (action === 'restore') return 'Restore change';
  if (action === 'revert') return 'Revert change';
  return 'Add commit';
}

/** Restore is the primary card action; Add branch / Revert stay secondary. */
export function isPrimaryCommitAction(action: VersionCommitAction) {
  return action === 'restore';
}

export function isReverted(revertedIds: string[], id: string) {
  return revertedIds.includes(id);
}

/** Incoming connector to a reverted station. */
export function isRevertedRoute(revertedIds: string[], targetId?: string) {
  return Boolean(targetId && isReverted(revertedIds, targetId));
}

export const graphStorageKey = 'mitwerk.version-tree.graph';

type GraphStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type GraphAction =
  | { type: 'select'; id: string | null }
  | { type: 'set-active-branch'; branchId: string }
  | { type: 'add-branch'; sourceId: string }
  | { type: 'add-commit'; sourceId: string }
  | { type: 'delete-current'; sourceId: string }
  | { type: 'delete-future'; sourceId: string }
  | { type: 'revert'; sourceId: string }
  | { type: 'restore'; sourceId: string }
  | { type: 'reset' };

function hasAncestor(nodes: VersionNode[], node: VersionNode, ancestorId: string) {
  const byId = new Map(nodes.map(item => [item.id, item]));
  const seen = new Set<string>();
  let current: VersionNode | undefined = node;
  while (current && !seen.has(current.id)) {
    if (current.id === ancestorId) return true;
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return false;
}

/** Versions after this station, not including the station itself. */
export function futureNodeIds(nodes: VersionNode[], sourceId: string) {
  if (!nodes.some(node => node.id === sourceId)) return [];
  return nodes.filter(node => node.id !== sourceId && hasAncestor(nodes, node, sourceId)).map(node => node.id);
}

export function canDeleteCurrent(nodes: VersionNode[], sourceId: string) {
  return nodes.length > 1 && nodes.some(node => node.id === sourceId);
}

export function canDeleteFuture(nodes: VersionNode[], sourceId: string) {
  return futureNodeIds(nodes, sourceId).length > 0;
}

function adoptParent(child: VersionNode, parent: VersionNode | undefined): VersionNode {
  if (!parent) {
    return { ...child, parentId: null, relation: child.relation === 'branch' ? 'branch' : 'root' };
  }
  return { ...child, parentId: parent.id };
}

function pruneRevertedIds(revertedIds: string[], nodes: VersionNode[]) {
  const ids = new Set(nodes.map(node => node.id));
  return revertedIds.filter(id => ids.has(id));
}

/** Restore this change and any reverted ancestors so the path to it is live. */
export function restoreNodeIds(nodes: VersionNode[], revertedIds: string[], sourceId: string) {
  if (!revertedIds.includes(sourceId)) return [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const restored = new Set<string>([sourceId]);
  let current = byId.get(sourceId);
  while (current?.parentId) {
    current = byId.get(current.parentId);
    if (!current) break;
    if (revertedIds.includes(current.id)) restored.add(current.id);
    else break;
  }
  return [...restored];
}

function afterRemoval(state: GraphState, nodes: VersionNode[], preferredId?: string | null): GraphState {
  const activeBranchId = nodes.some(node => node.branchId === state.activeBranchId)
    ? state.activeBranchId
    : longestBranchId(nodes);
  const selectedId = [preferredId, state.selectedId].find(id => id && nodes.some(node => node.id === id))
    ?? branchTip(nodes, activeBranchId)?.id ?? nodes[0].id;
  return { nodes, selectedId, activeBranchId, revertedIds: pruneRevertedIds(state.revertedIds, nodes) };
}

/** Off-current-branch cards stay abbreviated until that node is selected. */
export function isCompactVersionCard(onCurrentBranch: boolean, selected: boolean) {
  return !onCurrentBranch && !selected;
}

/** Station the progress screenshot should frame: selection, else the active tip. */
export function screenshotFocusId(state: GraphState) {
  if (state.selectedId && state.nodes.some(node => node.id === state.selectedId)) return state.selectedId;
  return branchTip(state.nodes, state.activeBranchId)?.id ?? state.nodes[0]?.id ?? null;
}

/** Hover, focus, and open-menu screenshot states only when that component changed. */
export function screenshotInteractFromPrompt(prompt: string) {
  const text = prompt.toLowerCase();
  const count = /\b(circled number|count hint|branch count)\b/.test(text)
    || (/\b(caret|triangle)\b/.test(text) && /\b(circled|count)\b/.test(text));
  const menu = /\b(action menu|overflow control|floating panel|card menu)\b/.test(text);
  return { count, menu };
}

export function screenshotInteractQuery(prompt: string) {
  const { count, menu } = screenshotInteractFromPrompt(prompt);
  return [count ? 'count' : '', menu ? 'menu' : ''].filter(Boolean).join(',');
}

export function screenshotQueryFlags(search: string) {
  const params = search.startsWith('http')
    ? new URL(search).searchParams
    : new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const capture = params.get('screenshot') === '1';
  const flags = new Set((params.get('interact') ?? '').split(',').map(flag => flag.trim()).filter(Boolean));
  const zoom = Number(params.get('treeZoom'));
  const lift = Number(params.get('treeLift'));
  return {
    capture,
    countHover: capture && flags.has('count'),
    menuOpen: capture && flags.has('menu'),
    treeZoom: capture && Number.isFinite(zoom) && zoom > 0 ? zoom : null,
    treeFrame: capture && params.get('treeFrame') === 'bottom' ? 'bottom' as const : null,
    treeLift: capture && Number.isFinite(lift) && lift > 0 ? lift : 0,
  };
}

/** Last commit on a branch: its first station followed along direct commit children. */
export function branchTip(nodes: VersionNode[], branchId: string): VersionNode | undefined {
  if (nodes.some(node => node.git)) return nodes.filter(node => !node.git && node.capture && node.branchId === branchId).at(-1) ?? nodes.find(node => node.git?.refs.includes(branchId)) ?? nodes.filter(node => node.branchId === branchId).at(-1);
  const byId = new Map(nodes.map(node => [node.id, node]));
  const start = nodes.find(node => node.branchId === branchId
    && (!node.parentId || byId.get(node.parentId)?.branchId !== branchId))
    ?? nodes.find(node => node.branchId === branchId);
  if (!start) return undefined;
  const continuation = new Map(nodes.filter(node => node.relation === 'commit').map(node => [node.parentId, node]));
  let tip = start;
  const visited = new Set<string>();
  while (continuation.has(tip.id) && !visited.has(tip.id)) {
    visited.add(tip.id);
    tip = continuation.get(tip.id)!;
  }
  return tip;
}

/**
 * The checked-out spine: exactly one station per level from the root to the branch's
 * last commit. Same-level alternatives the branch was forked from are skipped, so each
 * fork contributes a single station. Empty when the branch is unknown.
 */
export function branchPathIds(nodes: VersionNode[], branchId: string): Set<string> {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const path = new Set<string>();
  const visited = new Set<string>();
  let node = branchTip(nodes, branchId);
  while (node && !visited.has(node.id)) {
    visited.add(node.id);
    path.add(node.id);
    // Branch edges stay on their level; climb past them to the previous level's station.
    let parent = node.parentId ? byId.get(node.parentId) : undefined;
    while (parent && node.relation === 'branch' && !visited.has(parent.id)) {
      visited.add(parent.id);
      node = parent;
      parent = node.parentId ? byId.get(node.parentId) : undefined;
    }
    node = parent;
  }
  return path;
}

/** Longest root-to-tip path; ties prefer an existing `main`, then first-seen order. */
export function longestBranchId(nodes: VersionNode[]) {
  const ids = [...new Set(nodes.map(node => node.branchId))];
  let best = ids[0] ?? 'main';
  let bestLength = branchPathIds(nodes, best).size;
  for (const id of ids.slice(1)) {
    const length = branchPathIds(nodes, id).size;
    if (length > bestLength || (length === bestLength && id === 'main')) {
      best = id;
      bestLength = length;
    }
  }
  return best;
}

/** Prototype content shared by the starting example and completed empty versions. */
export const filledVersionTemplate = {
  title: 'Implemented landing page layout',
  saveType: 'auto' as const,
  summary: 'Sample version: explored branch connections and node details using the two planning references.',
  prompts: [
    'Arrange versions on an isometric grid with connected branches.',
    'Show reference files and change details beside each version.',
  ],
  files: [
    { name: 'versiontree-plan-1.png', kind: 'reference', added: 0, removed: 0 },
    { name: 'DESIGN.md', kind: 'reference', added: 0, removed: 0 },
    { name: 'VersionTreePanel.tsx', kind: 'code', added: 84, removed: 12 },
  ] satisfies VersionFile[],
};

/** A version with no authored title, summary, files, or prompts. */
export function isEmptyVersion(node: Pick<VersionNode, 'title' | 'summary' | 'files' | 'prompts'>) {
  return !node.title && !node.summary && !node.files.length && !node.prompts.length;
}

export function fillPrototypeVersion(node: VersionNode): VersionNode {
  // Preserve existing authored or already populated content.
  if (!isEmptyVersion(node)) return node;
  return {
    ...node,
    title: filledVersionTemplate.title,
    saveType: filledVersionTemplate.saveType,
    summary: filledVersionTemplate.summary,
    files: filledVersionTemplate.files.map(file => ({ ...file })),
    prompts: filledVersionTemplate.prompts.map((text, index) => ({ id: `${node.id}-prompt-${index + 1}`, text })),
  };
}

export function createInitialGraphState(): GraphState {
  return {
    selectedId: 'v1',
    activeBranchId: 'main',
    revertedIds: [],
    nodes: [fillPrototypeVersion({
      id: 'v1', label: 'V1', title: '', saveType: 'manual', createdAt: '',
      branchId: 'main', parentId: null, relation: 'root',
      summary: '', prompts: [], files: [],
    })],
  };
}

export const initialGraph = createInitialGraphState();

function browserStorage(): GraphStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isVersionPrompt(value: unknown): value is VersionPrompt {
  return isRecord(value) && typeof value.id === 'string' && typeof value.text === 'string';
}

function isVersionFile(value: unknown): value is VersionFile {
  return isRecord(value)
    && typeof value.name === 'string'
    && (value.kind === 'code' || value.kind === 'reference' || value.kind === 'skill')
    && typeof value.added === 'number'
    && typeof value.removed === 'number';
}

function isVersionNode(value: unknown): value is VersionNode {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && typeof value.title === 'string'
    && (value.saveType === 'auto' || value.saveType === 'manual')
    && typeof value.createdAt === 'string'
    && Array.isArray(value.prompts) && value.prompts.every(isVersionPrompt)
    && Array.isArray(value.files) && value.files.every(isVersionFile)
    && typeof value.summary === 'string'
    && typeof value.branchId === 'string'
    && (value.parentId === null || typeof value.parentId === 'string')
    && (value.relation === 'root' || value.relation === 'commit' || value.relation === 'branch');
}

function hasAncestryCycle(nodes: VersionNode[]) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const visiting = new Set<string>();
  const seen = new Set<string>();
  function walk(id: string): boolean {
    if (seen.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    const parentId = byId.get(id)?.parentId;
    if (parentId && walk(parentId)) return true;
    visiting.delete(id);
    seen.add(id);
    return false;
  }
  return nodes.some(node => walk(node.id));
}

export function parseStoredGraphState(value: unknown): GraphState | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || value.nodes.length === 0) return null;
  if (!value.nodes.every(isVersionNode)) return null;
  const nodes = value.nodes;
  const ids = new Set(nodes.map(node => node.id));
  if (ids.size !== nodes.length) return null;
  const roots = nodes.filter(node => node.parentId === null);
  if (roots.length !== 1 || roots[0].relation !== 'root') return null;
  if (nodes.some(node => node.parentId !== null && !ids.has(node.parentId))) return null;
  if (hasAncestryCycle(nodes)) return null;
  const selectedId = value.selectedId === null || (typeof value.selectedId === 'string' && ids.has(value.selectedId))
    ? value.selectedId
    : roots[0].id;
  const branchIds = new Set(nodes.map(node => node.branchId));
  const activeBranchId = typeof value.activeBranchId === 'string' && branchIds.has(value.activeBranchId)
    ? value.activeBranchId
    : longestBranchId(nodes);
  const revertedIds = Array.isArray(value.revertedIds)
    ? value.revertedIds.filter((id): id is string => typeof id === 'string' && ids.has(id))
    : [];
  return { nodes, selectedId, activeBranchId, revertedIds };
}

export function loadGraphState(storage: GraphStorage | null = browserStorage()): GraphState {
  if (!storage) return createInitialGraphState();
  try {
    const raw = storage.getItem(graphStorageKey);
    if (!raw) return createInitialGraphState();
    return parseStoredGraphState(JSON.parse(raw)) ?? createInitialGraphState();
  } catch {
    return createInitialGraphState();
  }
}

export function saveGraphState(state: GraphState, storage: GraphStorage | null = browserStorage()) {
  if (!storage) return;
  try {
    storage.setItem(graphStorageKey, JSON.stringify(state));
  } catch {
    // Ignore quota and private-mode failures; the in-memory graph stays usable.
  }
}

/** Keep the browser snapshot and the disk snapshot used by progress screenshots in sync. */
export function persistGraphState(state: GraphState, storage: GraphStorage | null = browserStorage()) {
  saveGraphState(state, storage);
  if (typeof fetch === 'undefined') return;
  void fetch('/__mitwerk/graph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
    keepalive: true,
  }).catch(() => {
    // Dev-only endpoint; ignore when the server is not the Vite app.
  });
}

function createEmptyVersion(state: GraphState, source: VersionNode, relation: 'branch' | 'commit'): VersionNode {
  // Keep an internal creation ordinal; layout derives the displayed level labels.
  const ordinal = state.nodes.reduce((max, node) => {
    const match = /^V ?(\d+)$/.exec(node.label);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  let idOrdinal = state.nodes.length + 1;
  const ids = new Set(state.nodes.map(node => node.id));
  while (ids.has(`version-${idOrdinal}`)) idOrdinal += 1;
  const id = `version-${idOrdinal}`;
  return {
    id, label: `V${ordinal}`, title: '', saveType: 'manual', createdAt: '',
    prompts: [], files: [], summary: '',
    branchId: relation === 'branch' ? `branch-${id}` : source.branchId,
    parentId: source.id, relation,
  };
}

export function graphReducer(state: GraphState, action: GraphAction): GraphState {
  if (action.type === 'reset') return createInitialGraphState();
  if (action.type === 'select') {
    if (action.id === null) return state.selectedId === null ? state : { ...state, selectedId: null };
    return state.nodes.some(node => node.id === action.id)
      ? { ...state, selectedId: action.id }
      : state;
  }
  if (action.type === 'set-active-branch') {
    // Checking out a branch also selects its last commit, mirroring `git checkout`.
    const tip = branchTip(state.nodes, action.branchId);
    if (!tip) return state;
    if (state.activeBranchId === action.branchId && state.selectedId === tip.id) return state;
    return { ...state, activeBranchId: action.branchId, selectedId: tip.id };
  }
  if (action.type === 'delete-current') {
    const source = state.nodes.find(node => node.id === action.sourceId);
    if (!source || state.nodes.length <= 1) return state;
    const parent = source.parentId ? state.nodes.find(node => node.id === source.parentId) : undefined;
    const nodes = state.nodes.filter(node => node.id !== source.id)
      .map(node => node.parentId === source.id ? adoptParent(node, parent) : node);
    return afterRemoval(state, nodes, parent?.id);
  }
  if (action.type === 'delete-future') {
    const doomed = new Set(futureNodeIds(state.nodes, action.sourceId));
    if (doomed.size === 0) return state;
    return afterRemoval(state, state.nodes.filter(node => !doomed.has(node.id)));
  }
  if (action.type === 'revert') {
    const extra = futureNodeIds(state.nodes, action.sourceId);
    if (extra.length === 0) return state;
    const revertedIds = [...new Set([...state.revertedIds, ...extra])];
    if (revertedIds.length === state.revertedIds.length && extra.every(id => state.revertedIds.includes(id))
      && state.selectedId === action.sourceId) return state;
    return { ...state, revertedIds, selectedId: action.sourceId };
  }
  if (action.type === 'restore') {
    const restored = new Set(restoreNodeIds(state.nodes, state.revertedIds, action.sourceId));
    if (restored.size === 0) return state;
    const revertedIds = state.revertedIds.filter(id => !restored.has(id));
    return { ...state, revertedIds, selectedId: action.sourceId };
  }
  const source = state.nodes.find(node => node.id === action.sourceId);
  if (!source) return state;
  const relation = action.type === 'add-branch' ? 'branch' : 'commit';
  const nextNode = createEmptyVersion(state, source, relation);
  // Inserting into an existing line shifts its continuation down one row. A line
  // has one direct commit child; alternatives are represented by branch edges.
  const nodes = state.nodes.map(node => {
    if (node.id === source.id) return fillPrototypeVersion(node);
    if (relation === 'commit' && node.parentId === source.id && node.relation === 'commit') {
      return { ...node, parentId: nextNode.id };
    }
    return node;
  });
  return { ...state, nodes: [...nodes, nextNode], selectedId: nextNode.id };
}
