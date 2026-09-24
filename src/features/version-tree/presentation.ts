import { branchPathIds, branchTip, isEmptyVersion, longestBranchId, type VersionNode } from './model.ts';
import { versionLabelParts, type GraphLayout } from './layout.ts';

/** Selection follows the whole branch, not only the currently focused station. */
export function getBranchState(nodes: VersionNode[], selectedId: string | null) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const nodesWithChildren = new Set(nodes.flatMap(node => node.git?.parents ?? (node.parentId ? [node.parentId] : [])));
  const selected = selectedId ? byId.get(selectedId) : undefined;
  if (selectedId && !selected) throw new Error('Selected version must exist.');
  if (!selected) {
    return { selectedBranchId: '', activeNodeIds: new Set<string>(), nodesWithChildren, tipId: null as string | null };
  }
  const continuation = new Map(nodes.filter(node => node.relation === 'commit').map(node => [node.parentId, node]));
  let tip = selected;
  const visited = new Set<string>();
  while (continuation.has(tip.id) && !visited.has(tip.id)) {
    visited.add(tip.id);
    tip = continuation.get(tip.id)!;
  }
  const activeNodeIds = new Set<string>();
  let node: VersionNode | undefined = tip;
  while (node && !activeNodeIds.has(node.id)) {
    activeNodeIds.add(node.id);
    node = node.parentId ? byId.get(node.parentId) : undefined;
  }
  return {
    selectedBranchId: selected.branchId,
    activeNodeIds,
    nodesWithChildren,
    tipId: nodes.length > 1 ? tip.id : null,
  };
}

/** Last commit on each branch, in first-seen branch order. */
export function getBranchEndpoints(nodes: VersionNode[]) {
  return getBranchIds(nodes).flatMap(branchId => {
    const tip = branchTip(nodes, branchId);
    return tip ? [tip] : [];
  });
}

/** A station diverges when its branch differs from a parent, including the first commit of a side lane. */
export function isBranchDivergence(node: VersionNode, nodes: VersionNode[]) {
  const byId = new Map(nodes.map(item => [item.id, item]));
  const parents = (node.git?.parents ?? (node.parentId ? [node.parentId] : [])).map(id => byId.get(id)).filter((item): item is VersionNode => !!item);
  return parents.some(parent => parent.branchId !== node.branchId);
}
export function getBranchIds(nodes: VersionNode[]) {
  return [...new Set(nodes.map(node => node.branchId))];
}

/** A branch is merged when later work on another branch joins it, or a merge event names it as the source. Leaving a branch does not merge the parent. */
export function mergedBranchIds(nodes: VersionNode[]) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const firstOfBranch = new Map<string, string>();
  for (const node of nodes) if (!firstOfBranch.has(node.branchId)) firstOfBranch.set(node.branchId, node.id);
  const merged = new Set<string>();
  for (const node of nodes) {
    const parents = node.git?.parents ?? (node.parentId ? [node.parentId] : []);
    const branchStart = firstOfBranch.get(node.branchId) === node.id && parents.length <= 1;
    for (const id of parents) {
      const parent = byId.get(id);
      if (parent && parent.branchId !== node.branchId && !branchStart) merged.add(parent.branchId);
    }
    for (const merge of node.git?.merges ?? []) {
      const source = merge.split(' → ')[0];
      if (source) merged.add(source);
    }
  }
  return merged;
}

/** The longest branch is `main`; every other branch is numbered in creation order. */
export function branchName(branchId: string, nodes: VersionNode[]) {
  if (nodes.some(node => node.git)) return branchId;
  if (nodes.some(node => node.branchId === branchId && node.capture)) return 'Capture order';
  const mainId = longestBranchId(nodes);
  if (branchId === mainId) return 'main';
  const others = getBranchIds(nodes).filter(id => id !== mainId);
  return `branch-${others.indexOf(branchId) + 1}`;
}

export type DisplayRoute = {
  id: string;
  path: string;
  branchId: string;
  sourceId?: string;
  targetId?: string;
  active: boolean;
  spine: boolean;
  kind: 'horizontal-branch' | 'branch' | 'commit';
  dashed?: boolean;
};

/**
 * Selection keeps the default wiring and colors. It only (1) lifts the selected branch's
 * own lines above the overlap and (2) adds one horizontal connector across each
 * sibling level on the selected path.
 */
export function presentTree(
  layout: GraphLayout,
  selectedId: string | null,
  collapsedLevels: ReadonlySet<string> = new Set(),
  activeBranchId = '',
) {
  const selection = getBranchState(layout.nodes, selectedId);
  const spineIds = activeBranchId ? branchPathIds(layout.nodes, activeBranchId) : new Set<string>();
  const byId = new Map(layout.nodes.map(node => [node.id, node]));
  const groups = layout.forks ?? [];
  const hiddenById = new Map(groups.filter(group => collapsedLevels.has(group.id))
    .flatMap(group => group.nodeIds.filter(id => !spineIds.has(id)).map(id => [id, group] as const)));
  const groupByNode = new Map(groups.flatMap(group => group.nodeIds.map(id => [id, group] as const)));
  // At each fork, the selected path's last alternative owns the line that rises above the overlap.
  // Same-level ancestors (the alternative a sibling was branched from) stay beneath.
  const ownsSelectedLine = (id: string) => selection.activeNodeIds.has(id)
    && !groupByNode.get(id)!.nodeIds.some(sibling => sibling !== id
      && selection.activeNodeIds.has(sibling) && byId.get(sibling)!.parentId === id);
  const routes: DisplayRoute[] = [];
  for (const edge of layout.edges) {
    const arm = edge.id.startsWith('arm:');
    if (arm && hiddenById.has(edge.targetId)) continue;
    const source = byId.get(edge.sourceId);
    const target = byId.get(edge.targetId);
    const forkTarget = groups.find(group => group.id === edge.targetId);
    const fromOrigin = edge.sourceId.startsWith('origin:');
    if (!arm && !source && !fromOrigin) continue;
    const collapsedSource = !arm && source ? hiddenById.get(source.id) : undefined;
    const active = arm ? ownsSelectedLine(edge.targetId)
      : Boolean(source && target && selection.activeNodeIds.has(source.id) && selection.activeNodeIds.has(target.id));
    const spine = arm
      ? spineIds.has(edge.targetId)
      : Boolean(
        (source && spineIds.has(source.id) && (
          (target && spineIds.has(target.id))
          || forkTarget?.nodeIds.some(id => spineIds.has(id))
        ))
        || (fromOrigin && forkTarget?.nodeIds.some(id => spineIds.has(id)))
      );
    let path = edge.path;
    if (collapsedSource) {
      path = edge.collapsedSourcePath!;
    }
    routes.push({ ...edge, path, active, spine, kind: arm ? 'branch' : 'commit' });
  }
  for (const fork of groups) {
    if (!fork.horizontal || collapsedLevels.has(fork.id)) continue;
    const xs = fork.nodeIds.map(id => byId.get(id)!.x);
    const y = byId.get(fork.nodeIds[0])!.y;
    routes.push({ id: `siblings:${fork.id}`, kind: 'horizontal-branch', active: true, spine: false,
      branchId: selection.selectedBranchId,
      path: `M ${Math.min(...xs)} ${y} L ${Math.max(...xs)} ${y}` });
  }
  // Level connector, then later versions, then Vx.1, then the checked-out branch on top.
  // Re-merge graphs paint solid routes above dashed ones. The selected branch stays above both.
  const layer = (route: DisplayRoute) => route.spine ? 4 : route.kind === 'horizontal-branch' ? 0 : route.kind === 'commit' ? 1 : 2;
  const priorityBranch = selection.selectedBranchId || activeBranchId;
  const hasDashed = routes.some(route => route.dashed);
  const versionOrder = (route: DisplayRoute) => {
    const node = route.targetId ? byId.get(route.targetId) : undefined;
    if (!node) return 0;
    const [level, alt] = versionLabelParts(node.label);
    return (isEmptyVersion(node) ? -10000 : 0) - level * 100 - alt;
  };
  routes.sort((a, b) => {
    if (hasDashed) {
      const priority = (route: DisplayRoute) => route.branchId === priorityBranch;
      if (priority(a) !== priority(b)) return priority(a) ? 1 : -1;
      if (Boolean(a.dashed) !== Boolean(b.dashed)) return a.dashed ? -1 : 1;
    }
    return layer(a) - layer(b) || versionOrder(a) - versionOrder(b);
  });
  const hiddenNodeIds = new Set(hiddenById.keys());
  const endpoints = getBranchEndpoints(layout.nodes)
    .flatMap(node => hiddenNodeIds.has(node.id) ? [] : [byId.get(node.id)!])
    .sort((a, b) => a.x - b.x || a.y - b.y);
  return { ...selection, routes, groups, hiddenNodeIds, endpoints,
    horizontalRows: new Set(groups.filter(group => group.horizontal).map(group => group.row)),
    cardBelowRows: new Set(groups.map(group => group.row)),
    tip: selection.tipId && !hiddenById.has(selection.tipId) ? byId.get(selection.tipId)! : null };
}
