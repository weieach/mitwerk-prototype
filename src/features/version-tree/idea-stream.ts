import type { VersionNode } from './model.ts';

export type Milestones = Record<string, string>;
export const milestoneStorageKey = 'mitwerk.idea-stream.milestones.v1';
/** Initial content only. Resolve labels to stable IDs; layout never depends on these labels. */
export const initialMilestones: Record<string, string> = {
  V1: 'Record progress as a version stream instead of Figma annotations',
  V4: 'Mirror real Git branching in the stream',
  V10: 'Save a copy of the codebase on every push',
  'V11.1': 'Turn flat gallery frames into interactive WebGL blocks',
  V13: 'Add the theater view with 2D/3D transitions',
  V18: 'Let users open a pushed version as a live prototype',
  V25: 'Build a chat workspace around the version tools',
};

export function parseMilestones(raw: string | null): Milestones {
  try {
    const value: unknown = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch { return {}; }
}

export function seedMilestones(nodes: VersionNode[], saved: Milestones): Milestones {
  const next = { ...saved };
  for (const node of nodes) {
    // An empty saved value is an intentional deletion, not an invitation to reseed.
    if (initialMilestones[node.label] && !Object.hasOwn(next, node.id)) next[node.id] = initialMilestones[node.label];
  }
  return next;
}

export type IdeaRun = { id: string; nodeIds: string[]; firstLabel: string; lastLabel: string };
const parentsOf = (node: VersionNode) => node.git?.parents ?? (node.parentId ? [node.parentId] : []);

/** Fold adjacent same-branch history, retaining external graph connections on the representative. */
export function projectIdeaStream(source: VersionNode[], milestones: Milestones, expanded: ReadonlySet<string> = new Set()) {
  const byId = new Map(source.map(node => [node.id, node]));
  const runs: IdeaRun[] = [];
  let group: VersionNode[] = [];
  function flush() {
    if (group.length >= 2) runs.push({ id: group.at(-1)!.id, nodeIds: group.map(node => node.id), firstLabel: group[0].label, lastLabel: group.at(-1)!.label });
    group = [];
  }
  for (const node of source) {
    if (milestones[node.id]?.trim()) { flush(); continue; }
    const previous = group.at(-1);
    const members = new Set([...group.map(item => item.id), node.id]);
    const chronology = new Set([...group, node].flatMap(item => item.chronologyParentId && !members.has(item.chronologyParentId) ? [item.chronologyParentId] : []));
    // Never cross an intervening branch/milestone or combine unrelated siblings. Keep
    // multiple external chronology anchors explicit because the model has one slot.
    if (previous && (previous.branchId !== node.branchId
      || (!parentsOf(node).includes(previous.id) && node.chronologyParentId !== previous.id)
      || chronology.size > 1)) flush();
    group.push(node);
  }
  flush();
  const folded = new Map(runs.filter(run => !expanded.has(run.id)).map(run => [run.id, run]));
  const representative = new Map(source.map(node => [node.id, node.id]));
  for (const run of folded.values()) for (const id of run.nodeIds) representative.set(id, run.id);
  const mapId = (id: string) => representative.get(id) ?? id;
  const nodes = source.filter(node => mapId(node.id) === node.id).map(node => {
    const run = folded.get(node.id);
    const members = run ? run.nodeIds.map(id => byId.get(id)!) : [node];
    const memberIds = new Set(members.map(item => item.id));
    const externalParents = [...new Set(members.flatMap(parentsOf).filter(id => !memberIds.has(id)).map(mapId))];
    const chronologyParentId = members.map(item => item.chronologyParentId).find(id => id && !memberIds.has(id));
    const incoming = members.flatMap(item => item.incomingBranches ?? []);
    return { ...node, parentId: externalParents[0] ?? null,
      relation: members[0].relation,
      chronologyParentId: chronologyParentId ? mapId(chronologyParentId) : undefined,
      incomingBranches: incoming.length ? [...new Map(incoming.map(item => [item.sha, item])).values()] : undefined,
      git: node.git ? { ...node.git, parents: externalParents,
        refs: [...new Set(members.flatMap(item => item.git?.refs ?? []))] } : undefined };
  });
  return { nodes, runs, folded, representative };
}

/** One label per branch, at its first recorded station or imported origin. */
export function firstBranchLabels(source: VersionNode[], representative: ReadonlyMap<string, string>) {
  const owners = new Map<string, string>();
  for (const node of source) {
    for (const origin of node.incomingBranches ?? []) {
      if (!owners.has(origin.name)) owners.set(origin.name, `origin:merge:${representative.get(node.id) ?? node.id}:${origin.sha}`);
    }
    if (!owners.has(node.branchId)) owners.set(node.branchId, representative.get(node.id) ?? node.id);
  }
  return owners;
}

/** Use the most recent milestone at or before the selection; default to the latest. */
export function milestoneNavigationIndex(source: VersionNode[], milestones: Milestones, selectedId: string | null) {
  const stations = source.filter(node => milestones[node.id]?.trim());
  if (!stations.length) return -1;
  const selectedIndex = source.findIndex(node => node.id === selectedId);
  if (selectedIndex < 0) return stations.length - 1;
  const preceding = stations.filter(node => source.indexOf(node) <= selectedIndex);
  return Math.max(0, preceding.length - 1);
}
