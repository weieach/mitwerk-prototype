import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { githubRepository } from '../server/github-repository.mjs';

test('resolves a Vercel source-only checkout without an origin remote', async () => {
  const root = mkdtempSync(join(tmpdir(), 'verso-repository-'));
  try {
    assert.equal(await githubRepository(root, {
      VERCEL_GIT_PROVIDER: 'github', VERCEL_GIT_REPO_OWNER: 'weieach', VERCEL_GIT_REPO_SLUG: 'mitwerk-prototype',
    }), 'weieach/mitwerk-prototype');
    await assert.rejects(githubRepository(root, {}), /Cannot identify the GitHub repository/);
    await assert.rejects(githubRepository(root, {
      VERCEL_GIT_PROVIDER: 'gitlab', VERCEL_GIT_REPO_OWNER: 'owner', VERCEL_GIT_REPO_SLUG: 'repo',
    }), /Cannot identify/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('local GitHub origins still work and unrelated hosts are rejected', async () => {
  const root = mkdtempSync(join(tmpdir(), 'verso-repository-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  try {
    git('init');
    git('remote', 'add', 'origin', 'https://github.com/owner/repo.git');
    for (const url of ['https://github.com/owner/repo.git', 'git@github.com:owner/repo.git', 'ssh://git@github.com/owner/repo.git']) {
      git('remote', 'set-url', 'origin', url);
      assert.equal(await githubRepository(root, {}), 'owner/repo');
    }
    git('remote', 'set-url', 'origin', 'https://notgithub.com/owner/repo.git');
    await assert.rejects(githubRepository(root, {}), /Cannot identify/);
    await assert.rejects(githubRepository(root, {
      VERCEL_GIT_REPO_OWNER: 'owner/extra', VERCEL_GIT_REPO_SLUG: 'repo',
    }), /Cannot identify/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
