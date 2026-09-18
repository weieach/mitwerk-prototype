import { geometry } from './layout.ts';

/** Shared system tokens. Connector width is one isometric grid-triangle side. */
const stationDiameter = 28;
const stationBorderWidth = 5;
const stationInnerDiameter = stationDiameter - stationBorderWidth * 2;
export const treeTheme = {
  routes: ['#7A9EF7', '#FFC629', '#00A66A', '#EA66B7', '#ED6A2C', '#9A85F0'],
  stationDiameter,
  stationRadius: stationDiameter / 2,
  stationInnerDiameter,
  routeWidth: geometry.gridTriangleSide,
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
  countHintWidth: 14,
  countHintHeight: 14,
  countHintGap: 6,
  countHintFadeMs: 160,
  versionLabelFontSize: 11,
  versionLabelFontWeight: 700,
  versionLabelColor: '#000000',
  /** How much label size ignores canvas zoom. 0 follows the board; 1 stays constant on screen. */
  versionLabelZoomCompensation: 0.85,
  /** At this zoom and below, labels shrink slightly after compensation. */
  versionLabelLowZoom: 0.4,
  versionLabelLowZoomScale: 0.88,
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

/** Extra scale so version numbers stay closer to their screen size as the board zooms. */
export function versionLabelZoomScale(zoom: number) {
  const compensated = zoom ** -treeTheme.versionLabelZoomCompensation;
  return zoom <= treeTheme.versionLabelLowZoom
    ? compensated * treeTheme.versionLabelLowZoomScale
    : compensated;
}

/** Label sits to the left of the station, vertically centered on it. */
export function stationLabelOffset() {
  return {
    x: -(treeTheme.stationRadius + treeTheme.versionLabelGap),
    y: 0,
  };
}
