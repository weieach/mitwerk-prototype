import assert from 'node:assert/strict';
import test from 'node:test';
import { branchPathIds, createInitialGraphState, graphReducer, isEmptyVersion, longestBranchId, parseStoredGraphState } from '../src/features/version-tree/model.ts';
import { compareVersionLabels, frameScreenshotTargets, frameVersionLevel, layoutGraph as logicalLayout, layoutBranchView, geometry } from '../src/features/version-tree/layout.ts';
import { branchName, getBranchState, presentTree } from '../src/features/version-tree/presentation.ts';
import { levelColorLookup, stationLabelOffset, treeTheme } from '../src/features/version-tree/tokens.ts';
import { createTestGraphState } from './graph-fixture.ts';

const layoutGraph = (nodes, selectedId = null) => layoutBranchView(logicalLayout(nodes), selectedId);
const present = state => presentTree(layoutGraph(state.nodes, state.selectedId), state.selectedId);

const pathPoints = path => {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g).map(Number);
  return Array.from({ length: numbers.length / 2 }, (_, index) => numbers.slice(index * 2, index * 2 + 2));
};

test('fork routes run as full lines from the preceding station, share the stem, then peel off one by one', () => {
  for (const count of [2, 3, 4, 7, 12]) {
    let state = graphReducer(createInitialGraphState(), { type: 'add-commit', sourceId: 'v1' });
    const sourceId = state.selectedId;
    for (let i = 1; i < count; i++) state = graphReducer(state, { type: 'add-branch', sourceId });
    const layout = layoutGraph(state.nodes);
    const fork = layout.forks[0];
    const parent = layout.nodes.find(node => node.id === fork.parentId);
    assert.equal(parent.x, fork.x, 'Preceding version sits directly over the fork');
    assert.equal(fork.y - parent.y, geometry.gridRise * geometry.forkSharedStemRows, 'Count sits at the shared minimum distance');
    const directions = new Set();
    const departures = [];
    for (const edge of layout.edges.filter(edge => edge.id.startsWith('arm:'))) {
      const points = pathPoints(edge.path);
      const node = layout.nodes.find(node => node.id === edge.targetId);
      assert.equal(edge.branchId, node.branchId, 'Each arm carries its own branch');
      assert.deepEqual(points[0], [parent.x, parent.y], 'Full line starts at the preceding station');
      assert.deepEqual(points.at(-1), [node.x, node.y]);
      const departure = [...points].reverse().find(([x]) => x === fork.x);
      assert.ok(departure[1] >= fork.y + geometry.gridRise * geometry.forkDivergeStartRows - 0.00001,
        'Arm stays on the stem through the count and one grid below it before diverging');
      departures.push({
        offset: departure[1] - fork.y,
        label: node.label,
        empty: isEmptyVersion(node),
      });
      for (const [x, y] of points) {
        assert.ok(y <= node.y, 'Connector never passes below its endpoint');
        const col = x / geometry.gridUnit;
        const row = y / geometry.gridRise;
        assert.ok(Math.abs(col - Math.round(col)) < 0.00001);
        assert.ok(Math.abs(row - Math.round(row)) < 0.00001);
        assert.equal((Math.round(col) + Math.round(row)) % 2, 0);
      }
      for (let i = 1; i < points.length; i++) {
        const dx = Math.abs(points[i][0] - points[i - 1][0]);
        const dy = points[i][1] - points[i - 1][1];
        assert.ok(dy >= -0.00001, 'Route never doubles back upward');
        if (dx < 0.00001 && dy < 0.00001) continue;
        if (dx < 0.00001) directions.add('vertical');
        else if (dy < 0.00001) directions.add('horizontal');
        else {
          directions.add('diagonal');
          assert.ok(Math.abs(dy / dx - 1 / Math.sqrt(3)) < 0.00001);
        }
      }
    }
    assert.ok(directions.has('vertical') && directions.has('diagonal'));
    if (count > 2) assert.ok(directions.has('horizontal'));
    const ys = departures.map(arm => arm.offset);
    assert.equal(new Set(ys).size, ys.length, 'No two connectors originate on the same horizontal');
    departures.sort((a, b) => Number(a.empty) - Number(b.empty) || compareVersionLabels(a.label, b.label));
    departures.forEach((arm, index) => assert.ok(
      Math.abs(arm.offset - geometry.gridRise * (geometry.forkDivergeStartRows + index * geometry.forkDivergeRows)) < 0.00001,
      'Arms leave top to bottom in version-number order, empty current versions last'));
  }
});

test('an empty current version is left out of the numbered peel order', () => {
  let state = graphReducer(createInitialGraphState(), { type: 'add-commit', sourceId: 'v1' });
  const sourceId = state.selectedId;
  state = graphReducer(state, { type: 'add-branch', sourceId });
  state = graphReducer(state, { type: 'add-branch', sourceId });
  const draft = layoutGraph(state.nodes);
  const earlierEmpty = draft.nodes.find(node => node.label.endsWith('.2'));
  const laterEmpty = draft.nodes.find(node => node.label.endsWith('.3'));
  assert.ok(earlierEmpty && laterEmpty && isEmptyVersion(earlierEmpty));
  state = {
    ...state,
    nodes: state.nodes.map(node => node.id === laterEmpty.id
      ? { ...node, title: 'Named alternative', summary: 'Filled' }
      : node),
  };
  const layout = layoutGraph(state.nodes);
  const fork = layout.forks[0];
  const offset = (id: string) => {
    const points = pathPoints(layout.edges.find(edge => edge.id === `arm:${id}`).path);
    return [...points].reverse().find(([x]) => x === fork.x)[1] - fork.y;
  };
  const first = layout.nodes.find(node => node.label.endsWith('.1'));
  assert.ok(offset(laterEmpty.id) > offset(first.id));
  assert.ok(offset(earlierEmpty.id) > offset(laterEmpty.id),
    'Empty current version peels after later numbered versions');
});

test('selection preserves the exact default wiring and count position beneath its overlay', () => {
  let state = graphReducer(createInitialGraphState(), { type: 'add-commit', sourceId: 'v1' });
  const sourceId = state.selectedId;
  for (let i = 0; i < 4; i++) state = graphReducer(state, { type: 'add-branch', sourceId });
  const defaultLayout = layoutGraph(state.nodes);
  const selectedLayout = layoutGraph(state.nodes, state.selectedId);
  assert.deepEqual(selectedLayout.nodes, defaultLayout.nodes);
  assert.deepEqual(selectedLayout.edges, defaultLayout.edges);
  const neutral = presentTree(defaultLayout, null);
  const selected = presentTree(selectedLayout, state.selectedId);
  assert.equal(selected.groups[0].x, neutral.groups[0].x);
  assert.equal(selected.groups[0].y, neutral.groups[0].y);
  for (const route of neutral.routes.filter(route => route.kind === 'branch')) {
    const retained = selected.routes.find(candidate => candidate.id === route.id);
    assert.equal(retained.path, route.path);
    const own = route.id === `arm:${state.selectedId}`;
    assert.equal(retained.active, own, own ? 'Selected alternative\'s own line rises to the top layer'
      : 'Other default arms stay in the default layer');
    assert.equal(retained.branchId, route.branchId, 'Selection never recolors default wiring');
  }
  assert.ok(selected.routes.every(route => route.kind === 'horizontal-branch' || route.id.startsWith('trunk:') || route.id.startsWith('arm:')));
  assert.ok(!selected.routes.some(route => route.id.startsWith('selected-stem:')), 'No selected stem overlay');
  assert.ok(selected.routes.some(route => route.kind === 'horizontal-branch' && route.active));
  const first = selectedLayout.nodes.find(node => node.label.endsWith('.1'));
  assert.equal(selected.routes.at(-1).id, `arm:${first.id}`, 'Vx.1 sits on top of later versions');
});

test('adding branches frames the count inside the viewport, even at minimum zoom', () => {
  let state = createInitialGraphState();
  for (let i = 0; i < 12; i++) {
    state = graphReducer(state, { type: 'add-branch', sourceId: state.selectedId });
    if (i === 0) continue;
    const layout = layoutGraph(state.nodes);
    const level = layout.levels[0];
    for (const width of [280, 640, 1200]) {
      const frame = frameVersionLevel(layout, level, width, 1, treeTheme.minZoom, treeTheme.branchCountDiameter);
      const left = (level.x - treeTheme.branchCountDiameter / 2) * frame.zoom - frame.left;
      const right = left + treeTheme.branchCountDiameter * frame.zoom;
      assert.ok(left >= 0 && right <= width, 'Count is fully visible without Fit all');
      if (frame.zoom > treeTheme.minZoom) {
        const last = layout.nodes.at(-1);
        assert.ok((last.x + geometry.cardOffsetX + geometry.cardWidth) * frame.zoom - frame.left <= width);
      }
    }
  }
});

test('progress screenshots frame a count hint and a card together', () => {
  const frame = frameScreenshotTargets([
    { x: 80, y: 40, width: 40, height: 32 },
    { x: 200, y: 180, width: 264, height: 360 },
  ], 720, 640, treeTheme.minZoom);
  assert.ok(frame.zoom <= 1);
  assert.ok(frame.left >= 0 && frame.top >= 0);
});

test('upper-level forks stay compact when later levels fan out', () => {
  let state = graphReducer(createInitialGraphState(), { type: 'add-commit', sourceId: 'v1' });
  const sourceId = state.selectedId;
  state = graphReducer(state, { type: 'add-branch', sourceId });
  state = graphReducer(state, { type: 'add-branch', sourceId });
  const before = layoutGraph(state.nodes);
  const parentRow = before.nodes.find(node => node.id === sourceId).row;
  const original = Object.fromEntries(before.nodes.filter(node => node.row === parentRow).map(node => [node.id, node.x]));
  const upperSpan = Math.max(...Object.values(original)) - Math.min(...Object.values(original));
  state = graphReducer(state, { type: 'add-commit', sourceId });
  const lowerSource = state.selectedId;
  for (let i = 0; i < 6; i++) state = graphReducer(state, { type: 'add-branch', sourceId: lowerSource });
  const after = layoutGraph(state.nodes);
  for (const node of after.nodes.filter(node => node.row === parentRow)) {
    assert.equal(node.x - after.nodes[0].x, original[node.id] - before.nodes[0].x,
      'Ancestor spacing does not change when descendants fan out');
  }
  const lower = after.nodes.filter(node => node.row === parentRow + 1);
  assert.ok(Math.max(...lower.map(node => node.x)) - Math.min(...lower.map(node => node.x)) > upperSpan,
    'Later levels may span wider than their parent fork');
  assert.equal(after.forks.find(fork => fork.parentId === 'v1').x, after.nodes.find(node => node.id === 'v1').x);
  assert.equal(before.forks[0].x, before.nodes.find(node => node.id === 'v1').x);
});

test('level labels include original alternatives and the count begins at two', () => {
  let state = graphReducer(createInitialGraphState(), { type: 'add-commit', sourceId: 'v1' });
  const sourceId = state.selectedId;
  state = graphReducer(state, { type: 'add-branch', sourceId });
  let layout = layoutGraph(state.nodes);
  assert.deepEqual(layout.nodes.map(node => node.label), ['V1', 'V2.1', 'V2.2']);
  assert.equal(present(state).groups[0].nodeIds.length, 2);
  state = graphReducer(state, { type: 'add-branch', sourceId });
  layout = layoutGraph(state.nodes);
  assert.deepEqual(layout.nodes.map(node => node.label), ['V1', 'V2.1', 'V2.2', 'V2.3']);
  const group = present(state).groups[0];
  assert.equal(group.nodeIds.length, 3);
  assert.equal(group.x, layout.nodes[0].x);
  assert.ok(group.y > layout.nodes[0].y && group.y < layout.nodes[1].y);
});

test('collapse preserves selection, descendants and data, and expansion restores routes', () => {
  let state = graphReducer(createInitialGraphState(), { type: 'add-commit', sourceId: 'v1' });
  const sourceId = state.selectedId;
  state = graphReducer(state, { type: 'add-branch', sourceId });
  state = graphReducer(state, { type: 'add-branch', sourceId });
  state = graphReducer(state, { type: 'add-commit', sourceId: state.selectedId });
  const before = JSON.stringify(state);
  const layout = layoutGraph(state.nodes);
  const expanded = presentTree(layout, state.selectedId, new Set(), state.activeBranchId);
  const collapsed = presentTree(layout, state.selectedId, new Set([expanded.groups[0].id]), state.activeBranchId);
  assert.equal(collapsed.hiddenNodeIds.has(sourceId), false, 'Current-branch station stays visible');
  assert.equal(collapsed.hiddenNodeIds.size, expanded.groups[0].nodeIds.filter(id => id !== sourceId).length);
  assert.equal(collapsed.hiddenNodeIds.has(state.selectedId), false);
  assert.equal(collapsed.tip.id, state.selectedId);
  assert.equal(collapsed.selectedBranchId, expanded.selectedBranchId);
  assert.ok(collapsed.routes.length > 0);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(presentTree(layout, state.selectedId, new Set(), state.activeBranchId), expanded);
});

test('root-level branches can collapse without a predecessor', () => {
  let state = createInitialGraphState();
  state = graphReducer(state, { type: 'add-branch', sourceId: 'v1' });
  state = graphReducer(state, { type: 'add-branch', sourceId: 'v1' });
  const layout = layoutGraph(state.nodes);
  const result = presentTree(layout, state.selectedId, new Set(['v1']), state.activeBranchId);
  assert.equal(result.hiddenNodeIds.has('v1'), false);
  assert.equal(result.hiddenNodeIds.size, 2);
  assert.equal(result.tip, null);
  assert.equal(result.groups[0].nodeIds.length, 3);
  assert.ok(layout.origins.some(origin => origin.forkId === 'v1'));
  assert.ok(result.routes.some(route => route.id === 'trunk:v1'));
});

test('a root-level fork keeps an origin station above the count with no card', () => {
  let state = graphReducer(createInitialGraphState(), { type: 'add-branch', sourceId: 'v1' });
  const layout = layoutGraph(state.nodes);
  const fork = layout.forks[0];
  const origin = layout.origins[0];
  assert.equal(fork.parentId, null);
  assert.equal(origin.x, fork.x);
  assert.equal(fork.y - origin.y, geometry.gridRise * geometry.originStemRows);
  assert.equal(layout.nodes.some(node => node.x === origin.x && node.y === origin.y), false);
});

test('branches that share a level receive distinct colors', () => {
  let state = createInitialGraphState();
  state = graphReducer(state, { type: 'add-branch', sourceId: 'v1' });
  state = graphReducer(state, { type: 'add-branch', sourceId: 'v1' });
  const layout = layoutGraph(state.nodes);
  const colorOf = levelColorLookup(layout.nodes);
  const row = layout.nodes[0].row;
  const colors = [...new Set(layout.nodes.filter(node => node.row === row).map(node => colorOf(node.branchId, node.row)))];
  assert.equal(colors.length, new Set(layout.nodes.filter(node => node.row === row).map(node => node.branchId)).size);
});

test('one empty station is open with no connectors and no endpoint marker', () => {
  const result = present(createInitialGraphState());
  assert.equal(result.routes.length, 0);
  assert.equal(result.tip, null);
  assert.equal(result.nodesWithChildren.size, 0);
});

test('selection identifies the whole branch and places the marker at its tip', () => {
  const graph = createTestGraphState();
  const first = present({ ...graph, selectedId: 'v1' });
  const middle = present({ ...graph, selectedId: 'v2' });
  assert.equal(first.selectedBranchId, 'main');
  assert.equal(first.tip.id, 'v3');
  assert.deepEqual(first.activeNodeIds, middle.activeNodeIds);
  assert.ok(first.routes.some(route => route.id === 'v2:v3' && route.active));
  assert.deepEqual([...first.nodesWithChildren].sort(), ['v1', 'v2']);
  assert.ok(!first.nodesWithChildren.has('v3'), 'Selected terminal status is independent of selection');
});

test('every branch contributes one endpoint, ordered left to right, omitting collapsed stations', () => {
  const graph = createTestGraphState();
  const expanded = present(graph);
  assert.deepEqual(expanded.endpoints.map(node => node.branchId), ['main', 'alternative']);
  assert.equal(expanded.endpoints.find(node => node.branchId === 'main').id, 'v3');
  assert.equal(expanded.endpoints.find(node => node.branchId === 'alternative').id, 'v2-1');
  assert.ok(expanded.endpoints.every((node, index) => index === 0 || node.x >= expanded.endpoints[index - 1].x));
  const layout = layoutGraph(graph.nodes);
  const fork = presentTree(layout, graph.selectedId).groups[0];
  const collapsed = presentTree(layout, graph.selectedId, new Set([fork.id]), graph.activeBranchId);
  assert.equal(collapsed.endpoints.some(node => node.id === 'v2-1'), false);
  assert.ok(collapsed.endpoints.some(node => node.id === 'v3'));
});

test('selected sibling branches become one horizontal connector; unselected ones fork', () => {
  let graph = createTestGraphState();
  graph = graphReducer(graph, { type: 'add-branch', sourceId: 'v2' });
  const selected = present(graph);
  const row = layoutGraph(graph.nodes).nodes.find(node => node.id === 'v2').row;
  const horizontal = selected.routes.filter(route => route.kind === 'horizontal-branch');
  assert.equal(horizontal.length, 1);
  assert.equal((horizontal[0].path.match(/ L /g) || []).length, 1);
  assert.equal(selected.routes.filter(route => route.kind === 'branch').length, 3, 'Default fork remains underneath the selected route');
  assert.ok(selected.horizontalRows.has(row));
  const inactive = present({ ...graph, selectedId: 'v1' });
  assert.equal(inactive.horizontalRows.size, 0);
  assert.equal(inactive.routes.filter(route => route.kind === 'branch').length, 3);
});

test('nested same-level branches merge into one line and keep leaf state correct', () => {
  let graph = createTestGraphState();
  graph = graphReducer(graph, { type: 'add-branch', sourceId: 'v2-1' });
  const leaf = graph.selectedId;
  const result = present(graph);
  assert.equal(result.routes.filter(route => route.kind === 'horizontal-branch').length, 1);
  assert.ok(result.nodesWithChildren.has('v2-1'));
  assert.ok(!result.nodesWithChildren.has(leaf));
  assert.equal(result.tip.id, leaf);
});

test('a branch continuation remains highlighted after selecting its earlier version', () => {
  let graph = createTestGraphState();
  graph = graphReducer(graph, { type: 'add-commit', sourceId: 'v2-1' });
  const tipId = graph.selectedId;
  graph = graphReducer(graph, { type: 'select', id: 'v2-1' });
  const result = present(graph);
  assert.equal(result.tip.id, tipId);
  assert.ok(result.activeNodeIds.has(tipId));
  assert.ok(result.routes.some(route => route.active && route.targetId === tipId));
  assert.equal(getBranchState(graph.nodes, tipId).selectedBranchId, 'alternative');
});

test('overlap paints later versions first, Vx.1 next, then the current branch', () => {
  let state = graphReducer(createInitialGraphState(), { type: 'add-commit', sourceId: 'v1' });
  const sourceId = state.selectedId;
  for (let i = 0; i < 3; i++) state = graphReducer(state, { type: 'add-branch', sourceId });
  const spine = branchPathIds(state.nodes, 'main');
  const layout = layoutBranchView(logicalLayout(state.nodes), state.selectedId, spine);
  const presented = presentTree(layout, state.selectedId, new Set(), 'main');
  const arms = presented.routes.filter(route => route.kind === 'branch');
  assert.ok(arms.at(-1).spine, 'Current branch is on top');
  const numbered = arms.filter(route => !route.spine);
  const labelOf = (route) => layout.nodes.find(node => node.id === route.targetId);
  const expected = [...numbered].sort((a, b) => {
    const left = labelOf(a);
    const right = labelOf(b);
    return Number(isEmptyVersion(right)) - Number(isEmptyVersion(left))
      || compareVersionLabels(right.label, left.label);
  });
  assert.deepEqual(numbered.map(route => route.id), expected.map(route => route.id));
  assert.equal(labelOf(numbered.at(-1)).label, [...numbered].map(labelOf)
    .filter(node => !isEmptyVersion(node)).sort((a, b) => compareVersionLabels(a.label, b.label))[0]?.label
    ?? labelOf(numbered.at(-1)).label, 'Earliest numbered version sits just below the current branch');
});

test('clearing selection drops branch highlight and sibling flattening', () => {
  let graph = createTestGraphState();
  graph = graphReducer(graph, { type: 'add-branch', sourceId: 'v2' });
  const selected = present(graph);
  const cleared = present({ ...graph, selectedId: null });
  assert.ok(selected.activeNodeIds.size > 0);
  assert.equal(cleared.activeNodeIds.size, 0);
  assert.equal(cleared.selectedBranchId, '');
  assert.equal(cleared.tip, null);
  assert.ok(cleared.routes.every(route => !route.active));
  assert.equal(cleared.horizontalRows.size, 0);
  assert.ok(cleared.routes.some(route => route.kind === 'branch'));
});

test('the checked-out branch stays on a straight vertical spine through a fork', () => {
  let state = graphReducer(createInitialGraphState(), { type: 'add-commit', sourceId: 'v1' });
  const sourceId = state.selectedId;
  state = graphReducer(state, { type: 'add-branch', sourceId });
  const spine = branchPathIds(state.nodes, 'main');
  const layout = layoutBranchView(logicalLayout(state.nodes), state.selectedId, spine);
  const fork = layout.forks[0];
  const trunk = layout.nodes.find(node => spine.has(node.id) && fork.nodeIds.includes(node.id));
  const side = layout.nodes.find(node => !spine.has(node.id) && fork.nodeIds.includes(node.id));
  assert.ok(trunk && side);
  assert.equal(trunk.x, fork.x);
  assert.notEqual(side.x, fork.x);
  const arm = layout.edges.find(edge => edge.id === `arm:${trunk.id}`);
  const points = pathPoints(arm.path);
  assert.ok(points.every(([x]) => Math.abs(x - fork.x) < 0.00001), 'Active-branch arm never leaves the vertical column');
  const presented = presentTree(layout, state.selectedId, new Set(), 'main');
  assert.ok(presented.routes.some(route => route.spine && route.id === arm.id));
});

test('connector width matches one grid triangle and cards clear both routing levels', () => {
  assert.equal(treeTheme.routeWidth, geometry.gridTriangleSide);
  assert.equal(treeTheme.routeWidth, geometry.gridRise * 2);
  assert.equal(treeTheme.stationInnerDiameter, treeTheme.stationDiameter - treeTheme.stationBorderWidth * 2);
  const strokeRadius = treeTheme.routeWidth / 2 + treeTheme.routeClearance;
  assert.ok(geometry.horizontalCardOffsetY > strokeRadius);
  assert.ok(geometry.gridRise * geometry.branchRouteRows - strokeRadius > geometry.horizontalCardOffsetY + geometry.cardHeight);
  assert.ok(geometry.rowGap + geometry.cardOffsetY > geometry.gridRise * geometry.branchRouteRows + strokeRadius);
  assert.ok(treeTheme.endpointTriangleGap > 0);
  assert.equal(treeTheme.activeBranchColor, '#000000');
  assert.equal(stationLabelOffset().x, -(treeTheme.stationRadius + treeTheme.versionLabelGap));
  assert.equal(stationLabelOffset().y, 0);
  assert.equal(geometry.forkDivergeStartRows, 2);
});

test('the longest branch is named main and is the default checkout', () => {
  let state = createInitialGraphState();
  state = graphReducer(state, { type: 'add-branch', sourceId: 'v1' });
  const side = state.nodes.at(-1).branchId;
  state = graphReducer(state, { type: 'add-commit', sourceId: state.selectedId! });
  state = graphReducer(state, { type: 'add-commit', sourceId: state.selectedId! });
  assert.equal(longestBranchId(state.nodes), side);
  assert.equal(branchName(side, state.nodes), 'main');
  assert.equal(branchName('main', state.nodes), 'branch-1');
  assert.equal(parseStoredGraphState({ nodes: state.nodes, selectedId: state.selectedId })?.activeBranchId, side);
});
