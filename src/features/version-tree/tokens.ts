import { geometry } from './layout.ts';

export const ideaTheme = {
  fitMinZoom: 0.05,
  nodeGap: 140,
  todoGap: 10,
  milestoneGap: 190,
  openGap: 390,
  foldedGap: 80,
  foldCountSize: 26,
  milestoneDiameter: 36,
  milestoneBorderWidth: 2,
  milestoneBorderColor: '#000',
  hoverRadiusViewport: .05,
  actionFadeMs: 180,
  milestoneFontSize: 17,
  milestonePaddingBlock: 12,
  milestonePaddingInline: 14,
};

/** Shared system tokens. Connector width is one isometric grid-triangle side. */
const stationDiameter = 28;
const stationBorderWidth = 5;
const stationInnerDiameter = stationDiameter - stationBorderWidth * 2;
export const treeTheme = {
  historyCaptureVersions: 3,
  mergeOriginLandingRows: 2,
  cardHoverBorderInset: 1,
  cardHoverTransitionMs: 180,
  debugBorderColor: '#00A66A',
  debugBorderWidth: 2,
  routes: ['#7A9EF7', '#FFC629', '#00A66A', '#EA66B7', '#ED6A2C', '#9A85F0'],
  stationDiameter,
  stationRadius: stationDiameter / 2,
  stationInnerDiameter,
  routeWidth: geometry.gridTriangleSide,
  routeClearance: 3,
  routeStripeWidth: 2,
  routeStripeOpacity: 0.25,
  routeStripeColor: '#ffffff',
  gridDotRadius: 0.9,
  gridDotOpacity: 0.6,
  /** Grayed look for the horizontal connector across a selected level. */
  levelConnectorColor: '#b9bdba',
  levelConnectorOpacity: 0.4,
  /** Reverted version titles only: gray plus strikethrough. */
  revertedTitleColor: 'var(--faint)',
  /** Incoming connectors to reverted stations. */
  revertedRouteColor: '#b9bdba',
  revertedRouteOpacity: 0.4,
  /** Merged branches keep a paler accent at full opacity. 0 is the accent; 1 is white. */
  mergedBranchPale: 0.45,
  mergedBranchOpacity: 1,
  /** Square marks on a re-merge stem. One grid is the diamond between intersections. */
  chronologyWidth: geometry.gridTriangleSide / 4,
  chronologyDash: geometry.gridRise,
  chronologyClearance: geometry.gridRise * 2,
  mergedStemDotSize: geometry.gridTriangleSide,
  mergedStemDotGrids: 3,
  stationBorderWidth,
  stationClearance: 3,
  stationSelectedBorderWidth: 3,
  branchCountDiameter: 32,
  branchCountFontSize: 13,
  stationFill: 'var(--contrast)',
  stationOpenFill: 'var(--paper)',
  /** Checked-out branch: spine, stations, and labels share this token. */
  activeBranchColor: 'var(--contrast)',
  endpointTriangleWidth: 10,
  endpointTriangleHeight: 9,
  endpointTriangleGap: 10,
  countHintWidth: 14,
  countHintHeight: 14,
  countHintGap: 6,
  countHintFadeMs: 160,
  versionLabelFontSize: 11,
  branchLabelFontSize: 10,
  versionLabelFontWeight: 700,
  versionLabelColor: 'var(--contrast)',
  /** How much label size ignores canvas zoom. 0 follows the board; 1 stays constant on screen. */
  versionLabelZoomCompensation: 0.85,
  /** At this zoom and below, labels shrink slightly after compensation. */
  versionLabelLowZoom: 0.4,
  versionLabelLowZoomScale: 0.88,
  versionLabelGap: 8,
  minZoom: 0.25,
  maxZoom: 1.5,
  zoomStep: 0.1,
  /** Default full-diagram progress capture. */
  screenshotZoom: 0.55,
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

/** Lighten an accent toward white without changing its opacity. */
export function palerAccent(color: string) {
  const mix = treeTheme.mergedBranchPale;
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const channel = (index: number) => parseInt(hex[1].slice(index, index + 2), 16);
    const blend = (value: number) => Math.round(value + (255 - value) * mix);
    return `#${[0, 2, 4].map(index => blend(channel(index)).toString(16).padStart(2, '0')).join('')}`;
  }
  const hsl = /^hsl\((\d+(?:\.\d+)?) ([\d.]+)% ([\d.]+)%\)$/.exec(color);
  if (!hsl) return color;
  const lightness = Number(hsl[3]) + (100 - Number(hsl[3])) * mix;
  return `hsl(${hsl[1]} ${hsl[2]}% ${lightness}%)`;
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
