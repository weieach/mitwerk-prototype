export type VersionPrompt = { id: string; text: string };

export type VersionFile = {
  name: string;
  kind: 'code' | 'reference' | 'skill';
  added: number;
  removed: number;
};

export type VersionNode = {
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

export type GraphState = { nodes: VersionNode[]; selectedId: string | null };

export const graphStorageKey = 'mitwerk.version-tree.graph';

type GraphStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type GraphAction =
  | { type: 'select'; id: string | null }
  | { type: 'add-branch'; sourceId: string }
  | { type: 'add-commit'; sourceId: string }
  | { type: 'reset' };

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
    { name: 'versiontree-plan-2.png', kind: 'reference', added: 0, removed: 0 },
    { name: 'VersionTreePanel.tsx', kind: 'code', added: 84, removed: 12 },
  ] satisfies VersionFile[],
};

export function fillPrototypeVersion(node: VersionNode): VersionNode {
  // Preserve existing authored or already populated content.
  if (node.title || node.summary || node.files.length || node.prompts.length) return node;
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
  return { nodes, selectedId };
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

function createEmptyVersion(state: GraphState, source: VersionNode, relation: 'branch' | 'commit'): VersionNode {
  // Keep an internal creation ordinal; layout derives the displayed level labels.
  const ordinal = state.nodes.reduce((max, node) => {
    const match = /^V(\d+)$/.exec(node.label);
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
  return { nodes: [...nodes, nextNode], selectedId: nextNode.id };
}
