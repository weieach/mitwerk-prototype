import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGitCaptureHistory } from '../src/features/version-tree/capture-history.ts';
import { layoutGitHistory, mergedStemDots } from '../src/features/version-tree/git-layout.ts';
import { geometry } from '../src/features/version-tree/layout.ts';
import { mergedBranchIds } from '../src/features/version-tree/presentation.ts';
import { palerAccent } from '../src/features/version-tree/tokens.ts';
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
