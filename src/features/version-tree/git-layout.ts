import { geometry, layoutGraph } from './layout.ts';
import { treeTheme } from './tokens.ts';
import type { GraphEdge, MergeOrigin } from './layout.ts';
import type { VersionNode } from './model.ts';
import { mergedBranchIds } from './presentation.ts';

/** Shorter than the shared row pitch. Extra rows keep an expanded commit message clear of the next card. */
export function commitBranchGap(title: string) {
  const line = 17 * 1.2;
  const lines = Math.max(1, Math.ceil(Math.max(title.length, 1) / 24));
  const needed = 168 + lines * line + 28;
  const pitch = geometry.gridRise * 2;
  const min = geometry.gridRise * 16;
  return Math.max(min, Math.ceil(needed / pitch) * pitch);
}

/** The latest side branch reuses the x of the earlier side branch that left the same parent, so it stays in that column instead of opening another one. */
function alignLatestBranch(nodes: { id: string; branchId: string; x: number; git?: { parents: string[] }; parentId: string | null }[]) {
  const order: string[] = [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  for (const node of nodes) if (!order.includes(node.branchId)) order.push(node.branchId);
  const latest = order.at(-1);
  if (!latest) return;
  const root = nodes.find(node => node.branchId === latest)!;
  const parents = root.git?.parents ?? (root.parentId ? [root.parentId] : []);
  const parentBranch = parents.map(id => byId.get(id)?.branchId).find(id => id && id !== latest);
  if (!parentBranch) return;
  const sibling = order.find(id => {
    if (id === latest || id === parentBranch) return false;
    const start = nodes.find(node => node.branchId === id)!;
    const startParents = start.git?.parents ?? (start.parentId ? [start.parentId] : []);
    return startParents.some(id => byId.get(id)?.branchId === parentBranch);
  });
  if (!sibling) return;
  const x = nodes.find(node => node.branchId === sibling)!.x;
  for (const node of nodes) if (node.branchId === latest) node.x = x;
}

/** Reuse the nearest free lane after a branch merges; concurrent and nested branches stay distinct. */
export function compactBranchLanes(nodes: VersionNode[]) {
  const first = new Map<string, number>(), last = new Map<string, number>();
  const byId = new Map(nodes.map(node => [node.id, node]));
  nodes.forEach((node, index) => { if (!first.has(node.branchId)) first.set(node.branchId, index); last.set(node.branchId, index); });
  const merged = mergedBranchIds(nodes);
  nodes.forEach((node, index) => {
    if (first.get(node.branchId) === index && (node.git?.parents.length ?? 1) <= 1) return;
    for (const id of node.git?.parents ?? (node.parentId ? [node.parentId] : [])) {
      const branch = byId.get(id)?.branchId;
      if (branch && branch !== node.branchId) last.set(branch, Math.max(last.get(branch)!, index));
    }
  });
  const lanes = new Map<string, number>();
  const occupiedUntil: number[] = [];
  for (const [branch, start] of first) {
    const root = nodes[start];
    const parent = byId.get(root.parentId ?? root.git?.parents[0] ?? '');
    let lane = parent ? (lanes.get(parent.branchId) ?? 0) + 1 : 0;
    while ((occupiedUntil[lane] ?? -1) >= start) lane++;
    lanes.set(branch, lane);
    occupiedUntil[lane] = merged.has(branch) ? last.get(branch)! : Infinity;
  }
  return lanes;
}

/** Git lanes preserve branch ownership and every recorded parent, including merge parents. */
export function layoutGitHistory(source: VersionNode[], spacing?: (node: VersionNode) => number, options: {compactLanes?: boolean; showIncomingOrigins?: boolean} = {}) {
  const base = layoutGraph(source);
  const rows = new Map<string, number>();
  const placed = new Map<string, number>();
  const bySourceId = new Map(source.map(node => [node.id, node]));
  const gap = (id: string) => { const node = bySourceId.get(id); return node && spacing ? spacing(node) : commitBranchGap(node?.title ?? ''); };
  const nodes = base.nodes.map(node => {
    const parents = [...(node.git?.parents ?? (node.parentId ? [node.parentId] : [])), ...(node.chronologyParentId ? [node.chronologyParentId] : [])];
    const row = parents.length ? Math.max(...parents.map(id => rows.get(id) ?? -1)) + 1 : 0;
    const y = parents.length
      ? Math.max(...parents.map(id => (placed.get(id) ?? geometry.originY) + (id === node.chronologyParentId ? Math.max(gap(id), geometry.cardHeight + treeTheme.chronologyClearance * 2) : gap(id))))
      : geometry.originY;
    rows.set(node.id, row);
    placed.set(node.id, y);
    return { ...node, label: source.find(item => item.id === node.id)!.label, row, y };
  });
  if (options.compactLanes) {
    const lanes = compactBranchLanes(source);
    for (const node of nodes) { node.column = lanes.get(node.branchId)!; node.x = geometry.originX + node.column * geometry.columnGap; }
  } else alignLatestBranch(nodes);
  const byId = new Map(nodes.map(node => [node.id, node]));
  // An imported merge follows its preceding displayed milestone in the same lane.
  for (const node of nodes) {
    const previous = node.chronologyParentId ? byId.get(node.chronologyParentId) : undefined;
    if (previous && node.incomingBranches?.length) node.x = previous.x;
  }
  const mergeOrigins: MergeOrigin[] = options.showIncomingOrigins === false ? [] : nodes.flatMap(target => (target.incomingBranches ?? []).map((source, index) => {
    const preceding = byId.get(target.chronologyParentId ?? target.parentId ?? '');
    return { id: `origin:merge:${target.id}:${source.sha}`, sha: source.sha, branchId: source.name, targetId: target.id,
      x: Math.max(target.x, ...nodes.filter(node => node.y === preceding?.y).map(node => node.x)) + geometry.columnGap * (index + 1),
      y: preceding?.y ?? target.y - commitBranchGap('') };
  }));
  const merged = mergedBranchIds(nodes);
  const firstOfBranch = new Map<string, string>();
  for (const node of nodes) if (!firstOfBranch.has(node.branchId)) firstOfBranch.set(node.branchId, node.id);
  const edges: GraphEdge[] = nodes.flatMap(target => (target.git?.parents ?? (target.parentId ? [target.parentId] : [])).flatMap(id => {
    const from = byId.get(id);
    if (!from) return [];
    // The chronological stem supersedes this long side approach only in the display.
    if (target.incomingBranches?.length && target.chronologyParentId && id === target.parentId) return [];
    const dx = target.x - from.x, dy = target.y - from.y;
    const rise = Math.min(dy / 3, Math.abs(dx) / Math.sqrt(3));
    const run = Math.sign(dx) * rise * Math.sqrt(3);
    const path = dx === 0 ? `M ${from.x} ${from.y} L ${target.x} ${target.y}`
      : `M ${from.x} ${from.y} L ${from.x} ${from.y + dy / 3} L ${from.x + run} ${from.y + dy / 3 + rise} L ${target.x} ${from.y + dy / 3 + rise} L ${target.x} ${target.y}`;
    const parents = target.git?.parents ?? (target.parentId ? [target.parentId] : []);
    const branchStart = firstOfBranch.get(target.branchId) === target.id && parents.length <= 1;
    const branchId = from.branchId !== target.branchId && merged.has(from.branchId) && !branchStart ? from.branchId : target.branchId;
    return [{ id: `${id}:${target.id}`, sourceId: id, targetId: target.id, branchId, path, dashed: false }];
  }));
  for (const origin of mergeOrigins) {
    const target = byId.get(origin.targetId)!;
    const junctionY = target.y - geometry.gridRise * treeTheme.mergeOriginLandingRows;
    edges.push({ id: `merge-origin:${origin.id}`, sourceId: origin.id, targetId: target.id, branchId: origin.branchId,
      path: `M ${origin.x} ${origin.y} L ${origin.x} ${junctionY} L ${target.x} ${junctionY} L ${target.x} ${target.y}` });
  }
  // Chronological milestones can be siblings in Git. Show their sequence separately.
  for (const target of nodes) {
    const from = target.chronologyParentId ? byId.get(target.chronologyParentId) : undefined;
    if (!from) continue;
    const middle = from.y + geometry.cardHeight + treeTheme.chronologyClearance;
    edges.push({ id: `chronology:${from.id}:${target.id}`, sourceId: from.id, targetId: target.id,
      branchId: target.branchId, dashed: true,
      path: `M ${from.x} ${from.y} L ${from.x} ${middle} L ${target.x} ${middle} L ${target.x} ${target.y}` });
  }
  for (const branchId of merged) {
    const stations = nodes.filter(node => node.branchId === branchId).sort((a, b) => a.row - b.row || a.x - b.x);
    for (let index = 0; index < stations.length - 1; index++) {
      const from = stations[index], target = stations[index + 1];
      if (from.x !== target.x || edges.some(edge => edge.sourceId === from.id && edge.targetId === target.id)) continue;
      edges.push({ id: `merged-stem:${from.id}:${target.id}`, sourceId: from.id, targetId: target.id, branchId, dashed: false, path: `M ${from.x} ${from.y} L ${target.x} ${target.y}` });
    }
    for (const target of nodes) {
      const parents = target.git?.parents ?? (target.parentId ? [target.parentId] : []);
      if (target.branchId === branchId || !parents.some(id => byId.get(id)?.branchId === branchId)) continue;
      const anchor = nodes.filter(node => node.branchId === target.branchId && node.x === target.x && node.row < target.row).sort((a, b) => b.row - a.row)[0];
      if (!anchor || edges.some(edge => edge.id === `merged-span:${anchor.id}:${target.id}`)) continue;
      edges.push({ id: `merged-span:${anchor.id}:${target.id}`, sourceId: anchor.id, targetId: target.id, branchId: target.branchId, dashed: true, path: `M ${anchor.x} ${anchor.y} L ${target.x} ${target.y}` });
    }
  }
  return { ...base, nodes, edges, mergeOrigins, levels: [], forks: [], width: Math.max(...nodes.map(node => node.x), ...mergeOrigins.map(origin => origin.x)) + geometry.cardOffsetX + geometry.cardWidth + geometry.padding, height: Math.max(...nodes.map(node => node.y)) + geometry.cardHeight + geometry.padding };
}

/** Square dots on grid intersections along a vertical re-merge stem, three grids apart. */
export function mergedStemDots(y0: number, y1: number) {
  const pitch = geometry.gridRise * 2;
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const first = geometry.gridRise;
  const start = Math.ceil((top - first) / pitch - 1e-6);
  const dots: number[] = [];
  for (let index = Math.max(0, start); ; index += treeTheme.mergedStemDotGrids) {
    const y = first + index * pitch;
    if (y > bottom + 1e-6) break;
    if (y >= top - 1e-6) dots.push(y);
  }
  return dots;
}
