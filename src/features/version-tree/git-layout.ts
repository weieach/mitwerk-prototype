import { geometry, layoutGraph } from './layout.ts';
import type { GraphEdge } from './layout.ts';
import type { VersionNode } from './model.ts';

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
  const edges: GraphEdge[] = nodes.flatMap(target => (target.git?.parents ?? (target.parentId ? [target.parentId] : [])).flatMap(id => {
    const from = byId.get(id);
    if (!from) return [];
    const dx = target.x - from.x, dy = target.y - from.y;
    const rise = Math.min(dy / 3, Math.abs(dx) / Math.sqrt(3));
    const run = Math.sign(dx) * rise * Math.sqrt(3);
    const path = dx === 0 ? `M ${from.x} ${from.y} L ${target.x} ${target.y}`
      : `M ${from.x} ${from.y} L ${from.x} ${from.y + dy / 3} L ${from.x + run} ${from.y + dy / 3 + rise} L ${target.x} ${from.y + dy / 3 + rise} L ${target.x} ${target.y}`;
    return [{ id: `${id}:${target.id}`, sourceId: id, targetId: target.id, branchId: target.branchId, path }];
  }));
  return { ...base, nodes, edges, levels: [], forks: [], height: geometry.originY + Math.max(0, ...rows.values()) * geometry.rowGap + geometry.cardHeight + geometry.padding };
}
