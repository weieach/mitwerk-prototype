import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGitCaptureHistory } from '../src/features/version-tree/capture-history.ts';
import { commitBranchGap, layoutGitHistory, mergedStemDots } from '../src/features/version-tree/git-layout.ts';
import { geometry } from '../src/features/version-tree/layout.ts';
import { mergedBranchIds } from '../src/features/version-tree/presentation.ts';
import { palerAccent } from '../src/features/version-tree/tokens.ts';
import { parseGitLog } from '../src/features/version-tree/git-history.ts';
import type { GitHistory } from '../src/features/version-tree/git-history.ts';
import type { Capture } from '../src/features/iteration-gallery/model.ts';
const commits = [
  { sha: 'a', parents: [], subject: 'start', timestamp: 1, branch: 'main' },
  { sha: 'b', parents: ['a'], subject: 'feature work', timestamp: 2, branch: 'feature' },
  { sha: 'c', parents: ['a'], subject: 'main work', timestamp: 3, branch: 'main' },
  { sha: 'd', parents: ['c', 'b'], subject: 'merge feature', timestamp: 4, branch: 'main' },
];
const git: GitHistory = { commits, branches: [{ name: 'main', tip: 'd', base: null }, { name: 'feature', tip: 'b', base: 'a' }], merges: [], currentBranch: 'main', head: 'd' };
const captures: Capture[] = [{ id: 'start-shot', filename: 'start-shot', url: 'start-shot', width: 100, height: 100, kind: 'push', number: 1, timestamp: 1, summary: 'start', branch: null, added: null, removed: null }];

test('branch pitch stays short for a brief message and grows so a long expanded title clears the next card', () => {
  const short = commitBranchGap('Fix screen capture on push');
  const long = commitBranchGap('Add per-push repo capture hook and update capture filenames; fix add-commit button on endpoints');
  assert.ok(short < geometry.rowGap);
  assert.ok(long > short);
  assert.ok(Math.abs(short / (geometry.gridRise * 2) - Math.round(short / (geometry.gridRise * 2))) < 1e-6);
});

test('shortstat lines become file and line totals', () => {
  const parsed = parseGitLog('abc1234\t\t1\tstart\n\n 2 files changed, 10 insertions(+), 3 deletions(-)\n');
  assert.equal(parsed[0].filesChanged, 2);
  assert.equal(parsed[0].added, 10);
  assert.equal(parsed[0].removed, 3);
});

test('real parent hashes produce forks and both merge-parent edges, including uncaptured commits', () => {
  const graph = buildGitCaptureHistory(captures, git);
  assert.equal(graph.nodes.length, 4);
  assert.deepEqual(graph.nodes.find(node => node.id === 'd')?.git?.parents, ['c', 'b']);
  const layout = layoutGitHistory(graph.nodes);
  assert.equal(layout.edges.filter(edge => edge.sourceId === 'a').length, 2);
  assert.equal(layout.edges.filter(edge => edge.targetId === 'd' && !edge.dashed).length, 2);
  assert.equal(layout.edges.find(edge => edge.id === 'merged-span:c:d')?.dashed, true);
  assert.equal(layout.edges.find(edge => edge.id === 'merged-span:c:d')?.branchId, 'main');
  const dots = mergedStemDots(0, geometry.gridRise * 20);
  assert.ok(dots.length >= 2);
  assert.equal(dots[1] - dots[0], geometry.gridRise * 2 * 3);
  assert.notEqual(layout.nodes.find(node => node.id === 'b')?.x, layout.nodes.find(node => node.id === 'c')?.x);
  assert.equal(layout.nodes.find(node => node.id === 'b')!.x - layout.nodes.find(node => node.id === 'a')!.x, geometry.columnGap);
  assert.equal(layout.nodes[0].label, 'V1');
  assert.equal(layout.nodes[1].label, 'V1.1');
  assert.deepEqual([...mergedBranchIds(graph.nodes)], ['feature']);
  assert.equal(layout.edges.find(edge => edge.sourceId === 'b' && edge.targetId === 'd')?.branchId, 'feature');
  assert.equal(layout.edges.find(edge => edge.sourceId === 'a' && edge.targetId === 'b')?.branchId, 'feature');
  assert.equal(palerAccent('#00A66A'), '#73cead');
  assert.notEqual(palerAccent('#FFC629'), '#FFC629');
});
test('fast-forward branch activity records the merge without inventing a merge commit', () => {
  const history: GitHistory = { ...git, commits: commits.slice(0, 2), branches: [{ name: 'main', tip: 'b', base: null }, { name: 'feature', tip: 'b', base: 'a' }], head: 'b', merges: [{ branch: 'main', source: 'feature', sha: 'b', fastForward: true }] };
  const graph = buildGitCaptureHistory(captures, history);
  assert.equal(graph.nodes.length, 2);
  assert.deepEqual(graph.nodes[1].git?.refs, ['main', 'feature']);
  assert.deepEqual(graph.nodes[1].git?.merges, ['feature → main (fast-forward)']);
  assert.equal(layoutGitHistory(graph.nodes).edges.length, 1);
});

test('parallel merge milestones advance labels without changing Git ancestry or push lookup keys', () => {
  const history: GitHistory = { commits: [
    { sha: 'base', parents: [], subject: 'base', timestamp: 1, branch: 'main' },
    { sha: 'external', parents: ['base'], subject: 'collaborator work', timestamp: 2, branch: 'collaborator' },
    { sha: 'fix', parents: ['base'], subject: 'layout fix', timestamp: 3, branch: 'main' },
    { sha: 'import', parents: ['base', 'external'], subject: 'import workspace', timestamp: 4, branch: 'integration' },
    { sha: 'merge', parents: ['fix', 'import'], subject: 'final merge', timestamp: 5, branch: 'main' },
  ], branches: [{ name: 'main', tip: 'merge', base: null }], merges: [], currentBranch: 'main', head: 'merge' };
  const shots: Capture[] = [[23, 'base', 1], [24, 'layout fix', 3], [25, 'final merge', 5]].map(([number, summary, timestamp]) => ({
    ...captures[0], id: String(number), filename: String(number), number: Number(number), summary: String(summary), timestamp: Number(timestamp),
  }));
  shots.push({ ...captures[0], kind: 'prompt', number: 200, id: 'wip', filename: 'wip', summary: 'pending', timestamp: 6 });
  const graph = buildGitCaptureHistory(shots, history);
  const lookup = (id: string) => graph.nodes.find(node => node.id === id)!;
  assert.equal(lookup('fix').label, 'V24');
  assert.equal(lookup('import').label, 'V25');
  assert.equal(lookup('merge').label, 'V26');
  assert.equal(graph.nodes.at(-1)?.label, 'V27');
  assert.equal(lookup('merge').capture?.version, 25);
  assert.deepEqual(lookup('import').git?.parents, ['base', 'external']);
  assert.equal(lookup('import').chronologyParentId, 'fix');
  const layout = layoutGitHistory(graph.nodes);
  assert.ok(layout.edges.some(edge => edge.id === 'chronology:fix:import' && edge.dashed));
  assert.equal(layout.edges.filter(edge => edge.targetId === 'import' && !edge.dashed).length, 2);
  assert.ok(layout.nodes.find(node => node.id === 'import')!.y > layout.nodes.find(node => node.id === 'fix')!.y);
});

test('uncaptured remote merge work becomes an unnumbered origin beside the preceding milestone', () => {
  const history: GitHistory = { commits: [
    { sha: 'base', parents: [], subject: 'base', timestamp: 1, branch: 'main' },
    { sha: 'external-a', parents: ['base'], subject: 'remote work', timestamp: 2, branch: null },
    { sha: 'external-b', parents: ['external-a'], subject: 'remote refinement', timestamp: 3, branch: null },
    { sha: 'fix', parents: ['base'], subject: 'layout fix', timestamp: 4, branch: 'main' },
    { sha: 'import', parents: ['base', 'external-b'], subject: 'import workspace', timestamp: 5, branch: 'integration' },
    { sha: 'merge', parents: ['fix', 'import'], subject: 'final merge', timestamp: 6, branch: 'main' },
  ], branches: [{ name: 'main', tip: 'merge', base: null }, { name: 'integration', tip: 'import', base: 'base' }],
    remoteBranches: [{ name: 'origin/collaborator/workspace', tip: 'external-b', base: null }],
    merges: [], currentBranch: 'main', head: 'merge' };
  const shots: Capture[] = [[23, 'base', 1], [24, 'layout fix', 4], [25, 'final merge', 6]].map(([number, summary, timestamp]) => ({
    ...captures[0], id: String(number), filename: String(number), number: Number(number), summary: String(summary), timestamp: Number(timestamp),
  }));
  const graph = buildGitCaptureHistory(shots, history);
  assert.equal(graph.nodes.some(node => node.id.startsWith('external')), false);
  const imported = graph.nodes.find(node => node.id === 'import')!;
  assert.equal(imported.label, 'V25');
  assert.deepEqual(imported.git?.rawParents, ['base', 'external-b']);
  const layout = layoutGitHistory(graph.nodes);
  const origin = layout.mergeOrigins![0];
  const fix = layout.nodes.find(node => node.id === 'fix')!;
  const merge = layout.nodes.find(node => node.id === 'import')!;
  assert.equal(origin.branchId, 'origin/collaborator/workspace');
  assert.equal(origin.y, fix.y);
  assert.ok(origin.x > fix.x);
  assert.equal('label' in origin, false);
  assert.equal(merge.x, fix.x);
  assert.equal(layout.edges.some(edge => edge.sourceId === 'base' && edge.targetId === 'import'), false);
  const route = layout.edges.find(edge => edge.sourceId === origin.id)!;
  const points = [...route.path.matchAll(/[ML] ([\d.-]+) ([\d.-]+)/g)].map(match => [Number(match[1]), Number(match[2])]);
  for (let i = 1; i < points.length; i++) assert.ok(points[i][0] === points[i - 1][0] || points[i][1] === points[i - 1][1]);
  assert.equal(layout.nodes.find(node => node.id === 'merge')?.label, 'V26');
});
