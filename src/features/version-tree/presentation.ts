import { branchPathIds, branchTip, longestBranchId, type VersionNode } from './model.ts';
import type { GraphLayout } from './layout';

/** Selection follows the whole branch, not only the currently focused station. */
export function getBranchState(nodes: VersionNode[], selectedId: string | null) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const nodesWithChildren = new Set(nodes.flatMap(node => node.parentId ? [node.parentId] : []));
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

/** Branch IDs in creation order, which stays stable as the graph grows. */
export function getBranchIds(nodes: VersionNode[]) {
  return [...new Set(nodes.map(node => node.branchId))];
}

/** The longest branch is `main`; every other branch is numbered in creation order. */
export function branchName(branchId: string, nodes: VersionNode[]) {
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
  // Grayed level connector, default wiring, selected branch, then the checked-out spine on top.
  const layer = (route: DisplayRoute) => route.spine ? 4 : route.kind === 'horizontal-branch' ? 0 : !route.active ? 1 : route.kind === 'commit' ? 2 : 3;
  routes.sort((a, b) => layer(a) - layer(b));
  const hiddenNodeIds = new Set(hiddenById.keys());
  const endpoints = getBranchEndpoints(layout.nodes)
    .flatMap(node => hiddenNodeIds.has(node.id) ? [] : [byId.get(node.id)!])
    .sort((a, b) => a.x - b.x || a.y - b.y);
  return { ...selection, routes, groups, hiddenNodeIds, endpoints,
    horizontalRows: new Set(groups.filter(group => group.horizontal).map(group => group.row)),
    cardBelowRows: new Set(groups.map(group => group.row)),
    tip: selection.tipId && !hiddenById.has(selection.tipId) ? byId.get(selection.tipId)! : null };
}
