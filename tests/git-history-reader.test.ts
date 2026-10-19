import test from 'node:test';
import assert from 'node:assert/strict';
import { readGitHistory } from '../server/git-history.ts';

const main = 'aaaaaaa', feature = 'bbbbbbb', merge = 'ccccccc';
const topology = `${main}\t\t1\tstart\n${feature}\t${main}\t2\tfeature\n${merge}\t${main} ${feature}\t3\tmerge`;
function runner(statistics: () => string) {
  return (args: string[]) => {
    if (args.includes('--shortstat')) return statistics();
    if (args[0] === 'log') return topology;
    if (args[0] === 'for-each-ref') return args.at(-1) === 'refs/heads' ? `main\t${merge}\nfeature\t${feature}` : '';
    if (args[0] === 'reflog') return args.at(-1) === 'main' ? `${main}\tcommit: start\n${merge}\tmerge feature: Merge made by strategy` : `${feature}\tcommit: feature`;
    if (args[0] === 'branch') return 'main';
    if (args[0] === 'rev-parse') return merge;
    throw Error(`Unexpected Git query: ${args}`);
  };
}

test('statistics timeouts preserve branches, merges and all commits; refresh does not repeat the failed diff', () => {
  let attempts = 0;
  const run = runner(() => { attempts++; throw Error('ETIMEDOUT'); });
  const history = readGitHistory('reader-timeout-fixture', run);
  assert.equal(history.error, undefined);
  assert.deepEqual(history.commits.map(c => c.sha), [main, feature, merge]);
  assert.deepEqual(history.commits.at(-1)?.parents, [main, feature]);
  assert.equal(history.commits[1].branch, 'feature');
  assert.equal(history.branches.length, 2);
  assert.equal(history.merges[0].source, 'feature');
  assert.equal(history.commits[0].added, undefined);
  assert.deepEqual(readGitHistory('reader-timeout-fixture', run), history);
  assert.equal(attempts, 1);
});

test('available statistics still enrich the topology', () => {
  const run = runner(() => `${topology}\n 2 files changed, 12 insertions(+), 3 deletions(-)`);
  const history = readGitHistory('reader-statistics-fixture', run);
  assert.equal(history.commits.at(-1)?.filesChanged, 2);
  assert.equal(history.commits.at(-1)?.added, 12);
  assert.equal(history.commits.at(-1)?.removed, 3);
});
