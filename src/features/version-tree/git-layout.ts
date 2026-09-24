import { geometry, layoutGraph } from './layout.ts';
import { treeTheme } from './tokens.ts';
import type { GraphEdge } from './layout.ts';
import type { VersionNode } from './model.ts';
import { mergedBranchIds } from './presentation.ts';

/** Git lanes preserve branch ownership and every recorded parent, including merge parents. */
export function layoutGitHistory(source: VersionNode[]) {
  const base = layoutGraph(source);
  const rows = new Map<string, number>();
  const nodes = base.nodes.map(node => {
    const parents = node.git?.parents ?? (node.parentId ? [node.parentId] : []);
    const row = parents.length ? Math.max(...parents.map(id => rows.get(id) ?? -1)) + 1 : 0;
    rows.set(node.id, row);
    return { ...node, label: source.find(item => item.id === node.id)!.label, row, y: geometry.originY + row * geometry.rowGap };
  });
  const byId = new Map(nodes.map(node => [node.id, node]));
  const merged = mergedBranchIds(nodes);
  const firstOfBranch = new Map<string, string>();
  for (const node of nodes) if (!firstOfBranch.has(node.branchId)) firstOfBranch.set(node.branchId, node.id);
  const edges: GraphEdge[] = nodes.flatMap(target => (target.git?.parents ?? (target.parentId ? [target.parentId] : [])).flatMap(id => {
    const from = byId.get(id);
    if (!from) return [];
    const dx = target.x - from.x, dy = target.y - from.y;
    const rise = Math.min(dy / 3, Math.abs(dx) / Math.sqrt(3));
    const run = Math.sign(dx) * rise * Math.sqrt(3);
    const path = dx === 0 ? `M ${from.x} ${from.y} L ${target.x} ${target.y}`
      : `M ${from.x} ${from.y} L ${from.x} ${from.y + dy / 3} L ${from.x + run} ${from.y + dy / 3 + rise} L ${target.x} ${from.y + dy / 3 + rise} L ${target.x} ${target.y}`;
    const parents = target.git?.parents ?? (target.parentId ? [target.parentId] : []);
    const branchStart = firstOfBranch.get(target.branchId) === target.id && parents.length <= 1;
    const branchId = from.branchId !== target.branchId && merged.has(from.branchId) && !branchStart ? from.branchId : target.branchId;
    return [{ id: `${id}:${target.id}`, sourceId: id, targetId: target.id, branchId, path, dashed: dx === 0 && merged.has(branchId) }];
  }));
  for (const branchId of merged) {
    const stations = nodes.filter(node => node.branchId === branchId).sort((a, b) => a.row - b.row || a.x - b.x);
    for (let index = 0; index < stations.length - 1; index++) {
      const from = stations[index], target = stations[index + 1];
      if (from.x !== target.x || edges.some(edge => edge.sourceId === from.id && edge.targetId === target.id)) continue;
      edges.push({ id: `merged-stem:${from.id}:${target.id}`, sourceId: from.id, targetId: target.id, branchId, dashed: true, path: `M ${from.x} ${from.y} L ${target.x} ${target.y}` });
    }
    for (const target of nodes) {
      const parents = target.git?.parents ?? (target.parentId ? [target.parentId] : []);
      if (target.branchId === branchId || !parents.some(id => byId.get(id)?.branchId === branchId)) continue;
      const anchor = nodes.filter(node => node.branchId === target.branchId && node.x === target.x && node.row < target.row).sort((a, b) => b.row - a.row)[0];
      if (!anchor || edges.some(edge => edge.id === `merged-span:${anchor.id}:${target.id}`)) continue;
      edges.push({ id: `merged-span:${anchor.id}:${target.id}`, sourceId: anchor.id, targetId: target.id, branchId: target.branchId, dashed: true, path: `M ${anchor.x} ${anchor.y} L ${target.x} ${target.y}` });
    }
  }
  return { ...base, nodes, edges, levels: [], forks: [], height: geometry.originY + Math.max(0, ...rows.values()) * geometry.rowGap + geometry.cardHeight + geometry.padding };
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
