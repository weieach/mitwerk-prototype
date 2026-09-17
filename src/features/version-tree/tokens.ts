/** Shared system tokens. Connector width follows the station's inner circle. */
const stationDiameter = 28;
const stationBorderWidth = 5;
const stationInnerDiameter = stationDiameter - stationBorderWidth * 2;
export const treeTheme = {
  routes: ['#246b52', '#c16a42', '#576e9a', '#9a6381', '#ac8b38', '#40898b'],
  stationDiameter,
  stationRadius: stationDiameter / 2,
  stationInnerDiameter,
  routeWidth: stationInnerDiameter,
  routeClearance: 3,
  routeStripeWidth: 2,
  routeStripeOpacity: 0.25,
  routeStripeColor: '#ffffff',
  /** Grayed look for the horizontal connector across a selected level. */
  levelConnectorColor: '#b9bdba',
  levelConnectorOpacity: 0.4,
  stationBorderWidth,
  stationClearance: 3,
  stationSelectedBorderWidth: 3,
  branchCountDiameter: 32,
  branchCountFontSize: 13,
  stationFill: '#000000',
  stationOpenFill: '#ffffff',
  /** Checked-out branch: spine, stations, and labels share this token. */
  activeBranchColor: '#000000',
  endpointTriangleWidth: 10,
  endpointTriangleHeight: 9,
  endpointTriangleGap: 10,
  versionLabelFontSize: 11,
  versionLabelGap: 8,
  minZoom: 0.25,
  maxZoom: 1.5,
  zoomStep: 0.1,
};

export function branchColor(branchId: string, branchIds: string[]) {
  return routeSwatch(Math.max(0, branchIds.indexOf(branchId)));
}

function routeSwatch(index: number) {
  if (index < treeTheme.routes.length) return treeTheme.routes[index];
  return `hsl(${(index * 47) % 360} 38% 36%)`;
}

function unusedRouteColor(preferred: string, used: ReadonlySet<string>, start = 0) {
  if (!used.has(preferred)) return preferred;
  for (let i = 0; i < treeTheme.routes.length + used.size + 1; i++) {
    const color = routeSwatch(start + i);
    if (!used.has(color)) return color;
  }
  return preferred;
}

/** Unique colors among branches that share a row; a branch keeps its preferred swatch when free. */
export function levelColorLookup(nodes: { branchId: string; row: number }[]) {
  const idsOnRow = new Map<number, string[]>();
  const seen = [...new Set(nodes.map(node => node.branchId))];
  for (const node of nodes) {
    const ids = idsOnRow.get(node.row) ?? [];
    if (!ids.includes(node.branchId)) ids.push(node.branchId);
    idsOnRow.set(node.row, ids);
  }
  const assigned = new Map<string, string>();
  for (const [row, ids] of idsOnRow) {
    const used = new Set<string>();
    for (const id of ids) {
      const color = unusedRouteColor(branchColor(id, seen), used, seen.indexOf(id));
      used.add(color);
      assigned.set(`${row}:${id}`, color);
    }
  }
  return (branchId: string, row: number) => assigned.get(`${row}:${branchId}`) ?? branchColor(branchId, seen);
}

/** Stations and connectors on the checked-out branch share one color. */
export function activeRouteColor(color: string, onActiveBranch: boolean) {
  return onActiveBranch ? treeTheme.activeBranchColor : color;
}

/** Label sits to the left of the station, vertically centered on it. */
export function stationLabelOffset() {
  return {
    x: -(treeTheme.stationRadius + treeTheme.versionLabelGap),
    y: 0,
  };
}
