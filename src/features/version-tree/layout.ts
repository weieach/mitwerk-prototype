import type { VersionNode } from './model';

const gridUnit = 24;
const gridRise = gridUnit / Math.sqrt(3);

/** Shared geometry for the board, station components, routing, and its grid. */
export const geometry = {
  gridUnit,
  gridRise,
  columnGap: gridUnit * 16,
  rowGap: gridRise * 28,
  originX: gridUnit * 3,
  originY: gridRise * 7,
  cardOffsetX: 34,
  cardOffsetY: -20,
  horizontalCardOffsetY: 32,
  cardWidth: 264,
  cardHeight: 244,
  padding: gridUnit * 3,
  branchRouteRows: 23,
  branchCountOffsetY: gridRise * 4,
  /** Minimum distance every alternative shares on the stem before the count and divergence. */
  forkSharedStemRows: 22,
  /** Origin station to count: three visible grids (two lattice rows each). */
  originStemRows: 6,
  forkTerminalRows: 4,
  /** Longest outward diagonal; farther alternatives continue horizontally. */
  forkDepartureUnits: 8,
  forkLandingUnits: 2,
  /** Stem distance between successive departures on one side of the count. */
  forkDivergeRows: 4,
  /** First peel sits one visible grid below the count (two lattice rows, so it stays on the lattice). */
  forkDivergeStartRows: 2,
} as const;

export type PositionedNode = VersionNode & { x: number; y: number; row: number; column: number };
export type GraphEdge = { id: string; sourceId: string; targetId: string; path: string; branchId: string; collapsedSourcePath?: string };
export type VersionLevel = { id: string; row: number; label: string; nodeIds: string[]; x: number; y: number };
export type Fork = VersionLevel & { parentId: string | null; horizontal: boolean; branchId: string };
export type OriginStation = { id: string; x: number; y: number; forkId: string };
export type GraphLayout = { nodes: PositionedNode[]; edges: GraphEdge[]; levels: VersionLevel[]; width: number; height: number; forks?: Fork[]; origins?: OriginStation[] };

const rise = (run: number) => run / Math.sqrt(3);

/**
 * Leave the stem at (x, y) and arrive above targetX. Near alternatives take one
 * isometric diagonal; farther ones cap the diagonal, run horizontally, then land
 * on a short diagonal so every arm keeps the same outward slope.
 */
function forkApproach(x: number, y: number, targetX: number) {
  const direction = Math.sign(targetX - x);
  const distance = Math.abs(targetX - x);
  const maxDeparture = geometry.gridUnit * geometry.forkDepartureUnits;
  if (distance <= maxDeparture) return [[x, y], [targetX, y + rise(distance)]];
  const landing = geometry.gridUnit * geometry.forkLandingUnits;
  const departure = Math.min(maxDeparture, distance - landing);
  const laneY = y + rise(departure);
  const points = [[x, y], [x + direction * departure, laneY],
    [targetX - direction * landing, laneY], [targetX, laneY + rise(landing)]];
  return points.filter(([px, py], index) => index === 0 || px !== points[index - 1][0] || py !== points[index - 1][1]);
}

/** Stem offset below the count where the arm with this departure index peels away. */
const departureOffset = (index: number) =>
  geometry.gridRise * (geometry.forkDivergeStartRows + index * geometry.forkDivergeRows);

const toPath = (points: number[][]) => points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');

function placeFamilySlots(
  members: PositionedNode[],
  center: number,
  originId: string,
  activeId: string | undefined,
  positions: Map<string, number>,
) {
  if (activeId && members.length > 1) {
    // The original alternative holds the center by default and the others fan out
    // around it in creation order. Checking out another alternative swaps it with the
    // centered station; every remaining alternative keeps its slot.
    const others = members.filter(node => node.id !== originId);
    const leftCount = Math.floor(others.length / 2);
    const slots = new Map<string, number>([[originId, 0]]);
    others.forEach((node, index) => slots.set(node.id, index < leftCount ? -(leftCount - index) : index - leftCount + 1));
    if (activeId !== originId) {
      slots.set(originId, slots.get(activeId)!);
      slots.set(activeId, 0);
    }
    for (const [id, slot] of slots) positions.set(id, center + slot * geometry.columnGap);
    return;
  }
  const width = members.length + (members.length > 1 && members.length % 2 === 1 ? 1 : 0);
  let slot = 0;
  const slots: number[] = [];
  for (const [index] of members.entries()) {
    if (members.length > 1 && members.length % 2 === 1 && index === Math.floor(members.length / 2)) slot += 1;
    slots.push(slot);
    slot += 1;
  }
  const localCenter = (width - 1) / 2;
  for (const [index, node] of members.entries()) {
    positions.set(node.id, center + (slots[index] - localCenter) * geometry.columnGap);
  }
}

/** Lay out actual fork junctions, treating same-level alternatives as siblings. */
export function layoutBranchView(
  base: GraphLayout,
  selectedId: string | null,
  activePath: ReadonlySet<string> = new Set(),
): GraphLayout {
  const byId = new Map(base.nodes.map(node => [node.id, node]));
  const familyId = (node: PositionedNode): string => node.relation === 'branch' && node.parentId
    ? familyId(byId.get(node.parentId)!) : node.id;
  const families = new Map<string, PositionedNode[]>();
  const nextFamily = new Map<string, string>();
  for (const node of base.nodes) {
    const id = familyId(node);
    families.set(id, [...(families.get(id) ?? []), node]);
    if (node.relation === 'commit' && node.parentId) nextFamily.set(node.parentId, id);
  }
  const lattice = geometry.gridUnit * 2;
  const snap = (x: number) => geometry.originX + Math.round((x - geometry.originX) / lattice) * lattice;
  const snapUp = (dx: number) => Math.ceil(dx / lattice - 1e-9) * lattice;
  // Pack each fork from its own siblings. Descendants fan around a parent and must
  // not widen earlier levels.
  const compactWidth = (id: string) => {
    const count = families.get(id)!.length;
    return count + (count > 1 && count % 2 === 1 ? 1 : 0);
  };
  const positions = new Map<string, number>();
  const centers = new Map<string, number>();
  function place(id: string, centerX: number) {
    const members = families.get(id)!;
    const center = snap(centerX);
    centers.set(id, center);
    const activeId = members.find(node => activePath.has(node.id))?.id;
    placeFamilySlots(members, center, id, activeId, positions);
    for (const node of members) {
      const x = snap(positions.get(node.id)!);
      positions.set(node.id, x);
      if (nextFamily.has(node.id)) place(nextFamily.get(node.id)!, x);
    }
  }
  function shiftTree(id: string, dx: number) {
    centers.set(id, centers.get(id)! + dx);
    for (const node of families.get(id)!) {
      positions.set(node.id, positions.get(node.id)! + dx);
      if (nextFamily.has(node.id)) shiftTree(nextFamily.get(node.id)!, dx);
    }
  }
  let cursor = 0;
  for (const [id] of families) {
    if (byId.get(id)!.parentId) continue;
    const width = compactWidth(id);
    place(id, geometry.originX + (cursor + (width - 1) / 2) * geometry.columnGap);
    cursor += width;
  }
  // Keep a fork's junction on its parent; only the members and later descendants
  // move, so earlier levels stay compact.
  const shiftMembers = (members: PositionedNode[], dx: number) => {
    for (const node of members) {
      positions.set(node.id, positions.get(node.id)! + dx);
      if (nextFamily.has(node.id)) shiftTree(nextFamily.get(node.id)!, dx);
    }
  };
  const maxRow = Math.max(0, ...base.nodes.map(node => node.row));
  for (let row = 0; row <= maxRow; row++) {
    const rowFamilies = [...families].filter(([, members]) => members[0].row === row)
      .sort((a, b) => centers.get(a[0])! - centers.get(b[0])!);
    // The family holding the active path never moves; neighbors spread away from it
    // on both sides so the checked-out branch keeps its vertical column.
    const pivot = Math.max(0, rowFamilies.findIndex(([, members]) => members.some(node => activePath.has(node.id))));
    let lastMax = -Infinity;
    for (const [, members] of rowFamilies.slice(pivot)) {
      const min = Math.min(...members.map(node => positions.get(node.id)!));
      if (min < lastMax + geometry.columnGap) shiftMembers(members, snapUp(lastMax + geometry.columnGap - min));
      lastMax = Math.max(...members.map(node => positions.get(node.id)!));
    }
    let lastMin = Infinity;
    for (const [, members] of rowFamilies.slice(0, pivot + 1).reverse()) {
      const max = Math.max(...members.map(node => positions.get(node.id)!));
      if (max > lastMin - geometry.columnGap) shiftMembers(members, -snapUp(max - (lastMin - geometry.columnGap)));
      lastMin = Math.min(...members.map(node => positions.get(node.id)!));
    }
  }
  const minX = Math.min(...positions.values(), ...centers.values());
  if (minX < geometry.originX) {
    const dx = snapUp(geometry.originX - minX);
    for (const [id] of families) {
      if (byId.get(id)!.parentId) continue;
      shiftTree(id, dx);
    }
  }
  const selectedAncestors = new Set<string>();
  let ancestor = selectedId ? byId.get(selectedId) : undefined;
  while (ancestor && !selectedAncestors.has(ancestor.id)) {
    selectedAncestors.add(ancestor.id);
    ancestor = ancestor.parentId ? byId.get(ancestor.parentId) : undefined;
  }
  const rowYs = new Map<number, number>();
  const junctionYs = new Map<number, number>();
  // Arms peel off the stem one by one per side: the farthest alternative leaves at
  // the count, each nearer one leaves a little lower and runs parallel beneath it.
  const departureIndex = (id: string, node: PositionedNode) => {
    const x = centers.get(id)!;
    const side = Math.sign(positions.get(node.id)! - x);
    return families.get(id)!.filter(member => Math.sign(positions.get(member.id)! - x) === side)
      .sort((a, b) => Math.abs(positions.get(b.id)! - x) - Math.abs(positions.get(a.id)! - x))
      .findIndex(member => member.id === node.id);
  };
  const armFromCount = (id: string, node: PositionedNode, countY: number) =>
    forkApproach(centers.get(id)!, countY + departureOffset(departureIndex(id, node)), positions.get(node.id)!);
  for (let row = 0; row <= maxRow; row++) {
    const forks = [...families].filter(([, members]) => members[0].row === row && members.length > 1);
    const maxArm = Math.max(0, ...forks.flatMap(([id, members]) => members.map(node => armFromCount(id, node, 0).at(-1)![1])));
    const rootOrigin = row === 0 && forks.some(([id]) => !byId.get(id)!.parentId);
    const junctionY = row === 0
      ? geometry.originY + (rootOrigin ? geometry.gridRise * geometry.originStemRows : 0)
      : rowYs.get(row - 1)! + geometry.gridRise * geometry.forkSharedStemRows;
    junctionYs.set(row, junctionY);
    rowYs.set(row, forks.length ? junctionY + maxArm + geometry.gridRise * geometry.forkTerminalRows
      : row === 0 ? geometry.originY : rowYs.get(row - 1)! + geometry.rowGap);
  }
  const nodes = base.nodes.map(node => ({ ...node, x: positions.get(node.id)!, y: rowYs.get(node.row)! }));
  const positioned = new Map(nodes.map(node => [node.id, node]));
  const forks: Fork[] = [...families].filter(([, members]) => members.length > 1).map(([id, members]) => {
    const horizontal = members.some(node => selectedAncestors.has(node.id));
    return { id, row: members[0].row, label: `V${members[0].row + 1}`, nodeIds: members.map(node => node.id),
      parentId: byId.get(id)!.parentId, branchId: byId.get(id)!.branchId, horizontal,
      x: centers.get(id)!, y: junctionYs.get(members[0].row)! };
  });
  const origins: OriginStation[] = forks.filter(fork => !fork.parentId)
    .map(fork => ({ id: `origin:${fork.id}`, x: fork.x, y: geometry.originY, forkId: fork.id }));
  const originByFork = new Map(origins.map(origin => [origin.forkId, origin]));
  const forkByNode = new Map(forks.flatMap(fork => fork.nodeIds.map(id => [id, fork] as const)));
  const edges: GraphEdge[] = [];
  for (const target of nodes) {
    if (forkByNode.has(target.id) || !target.parentId) continue;
    const source = positioned.get(target.parentId)!;
    edges.push({ id: `${source.id}:${target.id}`, sourceId: source.id, targetId: target.id,
      branchId: target.branchId, path: `M ${source.x} ${source.y} L ${target.x} ${target.y}` });
  }
  for (const fork of forks) {
    const parent: { id: string; x: number; y: number } | null = fork.parentId
      ? positioned.get(fork.parentId)!
      : originByFork.get(fork.id) ?? null;
    // Every alternative is drawn as one full line from the preceding station, so the
    // arms overlap along the shared stem until they diverge below the count.
    for (const id of fork.nodeIds) {
      const node = positioned.get(id)!;
      const stem = parent ? [[parent.x, parent.y]] : [];
      const points = activePath.has(id)
        ? [...stem, [fork.x, fork.y], [node.x, node.y]]
        : [...stem, ...armFromCount(fork.id, node, fork.y), [node.x, node.y]];
      edges.push({ id: `arm:${id}`, sourceId: fork.id, targetId: id, branchId: node.branchId, path: toPath(points) });
    }
    // The continuing branch's trunk is painted after the arms so it owns the shared stem's color.
    if (parent) {
      edges.push({ id: `trunk:${fork.id}`, sourceId: parent.id, targetId: fork.id, branchId: fork.branchId,
        path: `M ${parent.x} ${parent.y} L ${fork.x} ${fork.y}` });
    }
  }
  for (const edge of edges) {
    if (edge.id.startsWith('arm:')) continue;
    const sourceFork = forkByNode.get(edge.sourceId);
    if (!sourceFork) continue;
    const target = edge.id.startsWith('trunk:') ? forkByNode.get(edge.targetId)! : positioned.get(edge.targetId)!;
    const divergeY = sourceFork.y + geometry.gridRise * geometry.forkDivergeStartRows;
    edge.collapsedSourcePath = toPath([[sourceFork.x, sourceFork.y],
      ...forkApproach(sourceFork.x, divergeY, target.x), [target.x, target.y]]);
  }
  return { ...base, nodes, edges, forks, origins,
    levels: base.levels.map(level => ({ ...level, y: rowYs.get(level.row)! - geometry.branchCountOffsetY })),
    width: Math.max(...nodes.map(node => node.x)) + geometry.cardOffsetX + geometry.cardWidth + geometry.padding,
    height: Math.max(...nodes.map(node => node.y)) + geometry.horizontalCardOffsetY + geometry.cardHeight + geometry.padding };
}

/** Keep a level's collapse control visible when navigating to a new alternative. */
/** Fit a set of world-space boxes into the viewport for a progress screenshot. */
export function frameScreenshotTargets(
  targets: { x: number; y: number; width?: number; height?: number }[],
  viewportWidth: number,
  viewportHeight: number,
  minZoom: number,
) {
  const boxes = targets.map(target => {
    const width = target.width ?? 0;
    const height = target.height ?? 0;
    return {
      left: target.x - width / 2,
      right: target.x + width / 2,
      top: target.y - height / 2,
      bottom: target.y + height / 2,
    };
  });
  const pad = geometry.padding;
  const left = Math.min(...boxes.map(box => box.left)) - pad;
  const right = Math.max(...boxes.map(box => box.right)) + pad;
  const top = Math.min(...boxes.map(box => box.top)) - pad;
  const bottom = Math.max(...boxes.map(box => box.bottom)) + pad;
  const zoom = Math.max(minZoom, Math.min(1, viewportWidth / Math.max(1, right - left), viewportHeight / Math.max(1, bottom - top)));
  return {
    zoom,
    left: Math.max(0, ((left + right) / 2) * zoom - viewportWidth / 2),
    top: Math.max(0, ((top + bottom) / 2) * zoom - viewportHeight / 2),
  };
}

export function frameVersionLevel(layout: GraphLayout, level: VersionLevel, viewportWidth: number,
  currentZoom: number, minZoom: number, countDiameter: number) {
  const members = new Set(level.nodeIds);
  const nodes = layout.nodes.filter(node => members.has(node.id));
  const left = Math.max(0, Math.min(level.x - countDiameter / 2, ...nodes.map(node => node.x)) - geometry.padding);
  const right = Math.max(level.x + countDiameter / 2,
    ...nodes.map(node => node.x + geometry.cardOffsetX + geometry.cardWidth)) + geometry.padding;
  const zoom = Math.max(minZoom, Math.min(currentZoom, viewportWidth / (right - left)));
  return { zoom, left: left * zoom,
    top: Math.max(0, level.y - countDiameter / 2 - geometry.padding) * zoom };
}

const coordinate = (value: number) => Number(value.toFixed(4));

function routeEdge(source: PositionedNode, target: PositionedNode): string {
  const point = (x: number, y: number) => `${coordinate(x)} ${coordinate(y)}`;
  if (target.relation === 'commit') {
    return `M ${point(source.x, source.y)} L ${point(target.x, target.y)}`;
  }
  // Cards occupy the right side of stations. Depart down-left at 30°, travel
  // underneath the cards, then enter the destination along its vertical line.
  // Every bend falls on the same triangular lattice as the background.
  const routeY = source.y + gridRise * geometry.branchRouteRows;
  return [
    `M ${point(source.x, source.y)}`,
    `L ${point(source.x - gridUnit, source.y + gridRise)}`,
    `L ${point(source.x - gridUnit, routeY - gridRise * 2)}`,
    `L ${point(source.x + gridUnit, routeY)}`,
    `L ${point(target.x - gridUnit, routeY)}`,
    `L ${point(target.x, routeY - gridRise)}`,
    `L ${point(target.x, target.y)}`,
  ].join(' ');
}

/**
 * Derive all geometry from ancestry. Commit depth determines rows; every
 * branch owns a column. Array order is creation order, so adding a branch
 * preserves previous column assignments and existing versions never collide.
 */
export function layoutGraph(nodes: VersionNode[]): GraphLayout {
  const byId = new Map(nodes.map(node => [node.id, node]));
  if (byId.size !== nodes.length) throw new Error('Version IDs must be unique.');
  const rowById = new Map<string, number>();
  const resolvingRows = new Set<string>();
  const getRow = (node: VersionNode): number => {
    const cached = rowById.get(node.id);
    if (cached !== undefined) return cached;
    if (resolvingRows.has(node.id)) throw new Error('Version ancestry must not contain a cycle.');
    resolvingRows.add(node.id);
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (node.parentId && !parent) throw new Error(`Missing parent for version ${node.id}.`);
    const row = parent ? getRow(parent) + (node.relation === 'commit' ? 1 : 0) : 0;
    rowById.set(node.id, row);
    resolvingRows.delete(node.id);
    return row;
  };

  const branchRoots = new Map<string, VersionNode>();
  for (const node of nodes) {
    if (node.relation !== 'commit' || !branchRoots.has(node.branchId)) {
      branchRoots.set(node.branchId, node);
    }
  }
  const columnByBranch = new Map<string, number>();
  const resolvingColumns = new Set<string>();
  const getColumn = (branchId: string): number => {
    const cached = columnByBranch.get(branchId);
    if (cached !== undefined) return cached;
    if (resolvingColumns.has(branchId)) throw new Error('Branch ancestry must not contain a cycle.');
    resolvingColumns.add(branchId);
    const root = branchRoots.get(branchId);
    const parent = root?.parentId ? byId.get(root.parentId) : undefined;
    if (parent && parent.branchId !== branchId) getColumn(parent.branchId);
    const column = columnByBranch.size;
    columnByBranch.set(branchId, column);
    resolvingColumns.delete(branchId);
    return column;
  };

  const positioned = nodes.map(node => {
    const row = getRow(node);
    const column = getColumn(node.branchId);
    return {
      ...node, row, column,
      x: geometry.originX + column * geometry.columnGap,
      y: geometry.originY + row * geometry.rowGap,
    };
  });
  const positionedById = new Map(positioned.map(node => [node.id, node]));
  const rows = new Map<number, PositionedNode[]>();
  for (const node of positioned) rows.set(node.row, [...(rows.get(node.row) ?? []), node]);
  const levels = [...rows].map(([row, members]) => {
    members.sort((a, b) => a.column - b.column);
    const label = `V${row + 1}`;
    members.forEach((node, index) => { node.label = members.length > 1 ? `${label}.${index + 1}` : label; });
    const first = members[0];
    const previous = members.map(node => node.parentId ? positionedById.get(node.parentId) : undefined)
      .find(node => node && node.row < row);
    return { id: first.id, row, label, nodeIds: members.map(node => node.id),
      x: previous?.x ?? first.x, y: first.y - geometry.branchCountOffsetY };
  });
  const edges: GraphEdge[] = positioned.flatMap(target => {
    if (!target.parentId) return [];
    const source = positionedById.get(target.parentId)!;
    return [{
      id: `${source.id}:${target.id}`, sourceId: source.id, targetId: target.id,
      path: routeEdge(source, target), branchId: target.branchId,
    }];
  });
  const lastColumn = positioned.reduce((max, node) => Math.max(max, node.column), 0);
  const lastRow = positioned.reduce((max, node) => Math.max(max, node.row), 0);
  return {
    nodes: positioned,
    edges,
    levels,
    width: geometry.originX + lastColumn * geometry.columnGap
      + geometry.cardOffsetX + geometry.cardWidth + geometry.padding,
    height: geometry.originY + lastRow * geometry.rowGap
      + Math.max(geometry.cardHeight + geometry.horizontalCardOffsetY, gridRise * geometry.branchRouteRows) + geometry.padding,
  };
}
