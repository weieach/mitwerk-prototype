import test from 'node:test';
import assert from 'node:assert/strict';
import { ideaBranchColor, isFinishedIdeaVersion, navigableMilestones, saveMilestone, ideaStreamDefaults, milestoneNavigationIndex, parseMilestones, projectIdeaStream, seedMilestones } from '../src/features/version-tree/idea-stream.ts';
import { layoutGitHistory, layoutIdeaTimeline } from '../src/features/version-tree/git-layout.ts';
import type { VersionNode } from '../src/features/version-tree/model.ts';
import { captureMilestoneKey, currentIdeaWipId, withinNodeHoverRadius } from '../src/features/version-tree/idea-stream.ts';

test('chat milestones resolve onto the matching committed version and override old aliases', () => {
  const commit = { ...node('sha'), capture:{version:29,pushed:true,branches:['main'],added:null,removed:null} };
  const saved = {sha:'Older note', [captureMilestoneKey(29)]:'Decision from chat'};
  const resolved = seedMilestones([commit], saved);
  assert.equal(resolved.sha, 'Decision from chat');
  assert.deepEqual(navigableMilestones([commit], resolved).map(n => n.id), ['sha']);
  assert.equal(seedMilestones([commit], {...saved, [captureMilestoneKey(29)]:''}).sha, '');
});

test('only the latest unpushed capture receives persistent draft controls', () => {
  const oldWip = { ...node('old'), title:'Begin 3D view (WIP)', capture:{version:12,pushed:true,branches:['main'],added:null,removed:null} };
  const finished = node('new', ['old']);
  const draft = { ...node('draft', ['new']), git:undefined, capture:{version:13,pushed:false,branches:['main'],added:null,removed:null} };
  assert.equal(currentIdeaWipId([oldWip, finished]), null);
  assert.equal(currentIdeaWipId([oldWip, finished, draft]), 'draft');
  assert.equal(currentIdeaWipId([draft, finished]), null);
  assert.equal(currentIdeaWipId([]), null);
});

test('node hover retention uses a circular five-vw screen-space radius', () => {
  assert.equal(withinNodeHoverRadius(130,140,100,100,1000,.05), true);
  assert.equal(withinNodeHoverRadius(131,140,100,100,1000,.05), false);
  assert.equal(withinNodeHoverRadius(160,180,100,100,2000,.05), true);
  assert.equal(withinNodeHoverRadius(151,100,100,100,1000,.05), false);
});

function node(id: string, parents: string[] = [], branchId = 'main'): VersionNode {
  return { id, label: `V${id}`, title: `Commit ${id}`, summary: '', saveType: 'manual', createdAt: '2026-10-17T12:00:00Z',
    branchId, parentId: parents[0] ?? null, relation: parents.length ? 'commit' : 'root', prompts: [], files: [],
    git: { sha: id, parents, refs: [], merges: [], filesChanged: 0, added: 0, removed: 0 } };
}

test('folds a two-version run, remaps connections and restores original nodes on expansion', () => {
  const source = [node('1'), node('2', ['1']), node('3', ['2']), node('4', ['3'])];
  const original = JSON.stringify(source);
  const milestones = { '1': 'Beginning', '4': 'Decision' };
  const folded = projectIdeaStream(source, milestones);
  assert.deepEqual(folded.nodes.map(n => n.id), ['1', '3', '4']);
  assert.deepEqual(folded.folded.get('3')?.nodeIds, ['2', '3']);
  assert.deepEqual(folded.nodes[1].git?.parents, ['1']);
  assert.equal(folded.representative.get('2'), '3');
  assert.equal(JSON.stringify(source), original);
  const expanded = projectIdeaStream(source, milestones, new Set(['3']));
  assert.deepEqual(expanded.nodes.map(n => n.id), source.map(n => n.id));
  assert.equal(expanded.folded.size, 0);
});

test('new milestones split runs, single versions stay visible, and edited/deleted seeds survive reload', () => {
  const source = [node('1'), node('2', ['1']), node('3', ['2']), node('4', ['3'])];
  const saved = seedMilestones(source, { '1': 'Edited decision', '4': '' });
  const reloaded = seedMilestones(source, parseMilestones(JSON.stringify(saved)));
  assert.equal(reloaded['1'], 'Edited decision');
  assert.equal(reloaded['4'], '');
  assert.equal(projectIdeaStream(source, { '1': 'Start', '3': 'New milestone' }).folded.size, 0);
  assert.deepEqual(parseMilestones('broken json'), {});
});

test('folding preserves fork junctions, both merge parents and branch ownership', () => {
  const source = [node('1'), node('2', ['1']), node('3', ['2']), node('4', ['3']),
    node('5', ['4'], 'feature'), node('6', ['5'], 'feature'), node('7', ['4']), node('8', ['7', '6'])];
  const projection = projectIdeaStream(source, { '1': 'Start' });
  assert.ok(projection.nodes.some(n => n.id === '4'), 'fork remains explicit');
  assert.ok(projection.nodes.some(n => n.id === '8'), 'merge remains explicit');
  assert.deepEqual(projection.nodes.find(n => n.id === '8')?.git?.parents, ['4', '6']);
  assert.equal(projection.nodes.find(n => n.id === '6')?.branchId, 'feature');
  const layout = layoutGitHistory(projection.nodes);
  assert.equal(layout.edges.filter(e => e.targetId === '8' && !e.dashed).length, 2);
});

test('folding includes neighbors before and after a milestone while retaining external merge and chronology links', () => {
  const source = [node('1'), node('2', ['1']), node('3', ['2']), node('4', ['3']), node('5', ['4']), node('6', ['5', 'remote']), node('7', ['6'])];
  source[1].chronologyParentId = '1';
  source[2].incomingBranches = [{ sha: 'upstream', name: 'remote/branch' }];
  source[4].chronologyParentId = '4';
  const original = JSON.stringify(source);
  const projection = projectIdeaStream(source, { '1': 'Start', '4': 'Decision' });
  assert.deepEqual(projection.nodes.map(n => n.id), ['1', '3', '4', '7']);
  assert.deepEqual(projection.folded.get('3')?.nodeIds, ['2', '3']);
  assert.deepEqual(projection.folded.get('7')?.nodeIds, ['5', '6', '7']);
  assert.deepEqual(projection.nodes.at(-1)?.git?.parents, ['4', 'remote']);
  assert.equal(projection.nodes.at(-1)?.chronologyParentId, '4');
  assert.deepEqual(projection.nodes[1].incomingBranches, source[2].incomingBranches);
  assert.equal(JSON.stringify(source), original);
  assert.deepEqual(projectIdeaStream(source, { '1': 'Start', '4': 'Decision' }, new Set(['3', '7'])).nodes.map(n => n.id), source.map(n => n.id));
});

test('milestone navigation follows chronological decisions and tolerates edits, removals and empty streams', () => {
  const source = [node('1'), node('2', ['1']), node('3', ['2']), node('4', ['3'])];
  const milestones = { '1': 'Start', '3': 'Decision' };
  assert.equal(milestoneNavigationIndex(source, milestones, null), 1);
  assert.equal(milestoneNavigationIndex(source, milestones, '1'), 0);
  assert.equal(milestoneNavigationIndex(source, milestones, '2'), 0);
  assert.equal(milestoneNavigationIndex(source, milestones, '3'), 1);
  assert.equal(milestoneNavigationIndex(source, milestones, '4'), 1);
  assert.equal(milestoneNavigationIndex(source, { ...milestones, '3': '' }, '4'), 0);
  assert.equal(milestoneNavigationIndex(source, {}, '4'), -1);
});

test('branch labels occur once, survive folding, and do not repeat on returns or imports', async () => {
 const {firstBranchLabels}=await import('../src/features/version-tree/idea-stream.ts');
 const source=[node('1'),node('2',['1'],'feature'),node('3',['2'],'feature'),node('4',['3']),node('5',['4'],'feature')];
 source[3].incomingBranches=[{sha:'a',name:'remote'}];
 source[4].incomingBranches=[{sha:'b',name:'remote'},{sha:'c',name:'feature'}];
 const projection=projectIdeaStream(source,{'1':'Start'});
 const labels=firstBranchLabels(source,projection.representative);
 assert.equal(labels.get('main'),'1');
 assert.equal(labels.get('feature'),'3');
 assert.equal(labels.get('remote'),'origin:merge:4:a');
 assert.equal(labels.size,3);
 const expanded=projectIdeaStream(source,{'1':'Start'},new Set(['3']));
 assert.equal(firstBranchLabels(source,expanded.representative).get('feature'),'2');
});

test('sequential merged branches reuse a lane while nested branches stay separate', async () => {
 const {compactBranchLanes}=await import('../src/features/version-tree/git-layout.ts');
 const nodes=[node('1'),node('2',['1'],'first'),node('3',['2'],'nested'),node('4',['3'],'first'),node('5',['4']),node('6',['5'],'later'),node('7',['6'],'later'),node('8',['7']),node('9',['8'],'latest')];
 const original=JSON.stringify(nodes);
 const lanes=compactBranchLanes(nodes);
 assert.equal(lanes.get('first'),lanes.get('later'));
 assert.equal(lanes.get('first'),lanes.get('latest'));
 assert.ok(lanes.get('nested')!>lanes.get('first')!);
 const layout=layoutGitHistory(nodes,undefined,{compactLanes:true});
 assert.equal(layout.nodes.find(n=>n.id==='2')?.x,layout.nodes.find(n=>n.id==='6')?.x);
 assert.equal(JSON.stringify(nodes),original);
});

test('hiding imported origins removes only synthetic routes, retaining original merge data', () => {
 const source=[node('1'),node('2',['1']),node('3',['1'],'integration'),node('4',['2','3'])];
 source[2].chronologyParentId='2';source[2].incomingBranches=[{sha:'remote',name:'remote/feature'}];
 const original=JSON.stringify(source);
 const layout=layoutGitHistory(source,undefined,{compactLanes:true,showIncomingOrigins:false});
 assert.equal(layout.mergeOrigins?.length,0);
 assert.ok(!layout.edges.some(edge=>edge.sourceId.startsWith('origin:merge:')));
 assert.ok(layout.edges.some(edge=>edge.id==='chronology:2:3'));
 assert.deepEqual(layout.nodes.find(n=>n.id==='4')?.git?.parents,['2','3']);
 assert.equal(JSON.stringify(source),original);
 assert.equal(layoutGitHistory(source).mergeOrigins?.length,1);
});

test('folds do not cross intervening branches or discard multiple external chronology anchors', () => {
  const source = [node('1'), node('2', ['1']), node('3', ['2'], 'feature'), node('4', ['2', '3']), node('5', ['4']), node('6', ['5'])];
  source[4].chronologyParentId = '1';
  source[5].chronologyParentId = '2';
  const projection = projectIdeaStream(source, { '1': 'Start' });
  assert.deepEqual(projection.folded.get('5')?.nodeIds, ['4', '5']);
  assert.deepEqual(projection.nodes.find(n => n.id === '5')?.git?.parents, ['2', '3']);
  assert.equal(projection.nodes.find(n => n.id === '5')?.chronologyParentId, '1');
  assert.equal(projection.nodes.find(n => n.id === '6')?.chronologyParentId, '2');
  const positions = new Map(projection.nodes.map((n, index) => [n.id, index]));
  for (const node of projection.nodes) for (const parent of node.git?.parents ?? []) assert.ok(positions.get(parent)! < positions.get(node.id)!);
});

test('vertical idea timeline keeps chronology and branch colors without changing Git ancestry', () => {
  const source = [node('1'), node('2', ['1'], 'feature'), node('3', ['1']), node('4', ['3', '2'])];
  const original = JSON.stringify(source);
  const layout = layoutIdeaTimeline(source, n => n.id === '2' ? 300 : 100);
  assert.deepEqual(layout.nodes.map(n => n.id), ['1', '2', '3', '4']);
  assert.equal(new Set(layout.nodes.map(n => n.x)).size, 1);
  assert.deepEqual(layout.nodes.map(n => n.y - layout.nodes[0].y), [0, 100, 400, 500]);
  assert.equal(layout.edges.length, 6);
  assert.deepEqual(layout.edges.slice(0, 2).map(e => e.branchId), ['main', 'feature']);
  assert.deepEqual(layout.mergeOrigins, []);
  assert.deepEqual(layout.nodes.at(-1)?.git?.parents, ['3', '2']);
  assert.equal(JSON.stringify(source), original);
  assert.ok(new Set(layoutGitHistory(source).nodes.map(n => n.x)).size > 1, 'divergent routing remains available');
  assert.ok(Number.isFinite(layoutIdeaTimeline([], () => 100).height));
});

test('recent versions stay unfolded and the latest non-WIP commit opens by default', () => {
  const source = [node('1'), node('2', ['1']), node('3', ['2']), node('4', ['3']), node('5', ['4']), node('6', ['5'])];
  source[4].title = 'WIP: experiment';
  source[5].git = undefined;
  source[5].capture = {version:6, pushed:false, branches:['main']};
  const defaults = ideaStreamDefaults(source);
  assert.deepEqual(defaults, {latestIds:['4','5','6'],commandId:'4'});
  const projected = projectIdeaStream(source, {}, new Set(), new Set(defaults.latestIds));
  assert.deepEqual(projected.nodes.map(n => n.id), ['3','4','5','6']);
  assert.deepEqual(projected.folded.get('3')?.nodeIds, ['1','2','3']);
  assert.deepEqual(ideaStreamDefaults([]), {latestIds:[],commandId:null});
});


test('draft milestones survive commit identity changes and enter navigation only when finished', () => {
  const wip = { ...node('capture-version-42'), git: undefined, title: 'Work in progress',
    capture: { version: 42, pushed: false, branches: ['feature'] } };
  const draft = saveMilestone({}, wip, 'A saved design decision');
  assert.equal(isFinishedIdeaVersion(wip), false);
  assert.deepEqual(navigableMilestones([wip], draft), []);
  assert.equal(milestoneNavigationIndex([wip], draft, wip.id), -1);
  const committed = { ...wip, ...node('new-git-sha'), capture: { ...wip.capture, pushed: true } };
  const resolved = seedMilestones([committed], parseMilestones(JSON.stringify(draft)));
  assert.equal(resolved[committed.id], 'A saved design decision');
  assert.deepEqual(navigableMilestones([committed], resolved).map(n => n.id), [committed.id]);
  assert.equal(milestoneNavigationIndex([committed], resolved, committed.id), 0);
  const deleted = saveMilestone(resolved, committed, '');
  assert.equal(seedMilestones([committed], deleted)[committed.id], '');
  assert.deepEqual(navigableMilestones([committed], deleted), []);
  const nextWip = { ...wip, id: 'capture-version-43', capture: { ...wip.capture, version: 43 } };
  assert.equal(seedMilestones([nextWip], draft)[nextWip.id], undefined);
});

test('legacy commit milestones migrate to stable capture identity without losing edits or deletions', () => {
  const commit = { ...node('sha'), capture: {version: 42, pushed: true, branches: ['main']} };
  const migrated = seedMilestones([commit], {sha: 'Existing note'});
  assert.equal(migrated['capture-version-42'], 'Existing note');
  assert.equal(seedMilestones([commit], {sha: 'Stale note', 'capture-version-42': ''}).sha, '');
  assert.equal(isFinishedIdeaVersion({...commit, title: 'WIP: experiment'}), false);
  assert.equal(isFinishedIdeaVersion({...commit, title: 'Work-in-progress experiment'}), false);
});

test('main uses theme contrast regardless of palette; other branches retain their assigned color', () => {
  assert.equal(ideaBranchColor('main', '#7A9EF7'), 'var(--contrast)');
  assert.equal(ideaBranchColor('feature', '#FFC629'), '#FFC629');
});
