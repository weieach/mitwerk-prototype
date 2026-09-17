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
  endpointTriangleWidth: 10,
  endpointTriangleHeight: 9,
  endpointTriangleGap: 10,
  minZoom: 0.25,
  maxZoom: 1.5,
  zoomStep: 0.1,
};

export function branchColor(branchId: string, branchIds: string[]) {
  return treeTheme.routes[Math.max(0, branchIds.indexOf(branchId)) % treeTheme.routes.length];
}
