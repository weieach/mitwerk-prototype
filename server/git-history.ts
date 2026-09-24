import { execFileSync } from 'node:child_process';
import { parseGitLog } from '../src/features/version-tree/git-history.ts';
import type { GitHistory } from '../src/features/version-tree/git-history.ts';

/** Local Git parents/refs are authoritative; reflogs preserve fast-forward branch activity. */
export function readGitHistory(root: string): GitHistory {
  const run = (args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
  try {
    const branches = run(['for-each-ref', '--format=%(refname:short)%09%(objectname)', 'refs/heads']).split('\n').filter(Boolean).map(row => {
      const [name, tip] = row.split('\t'); return { name, tip, base: null as string | null };
    });
    const owners = new Map<string, string>();
    const merges: GitHistory['merges'] = [];
    for (const branch of branches) {
      let log = '';
      try { log = run(['reflog', 'show', '--format=%H%x09%gs', branch.name]); } catch { /* Reflogs may be absent in clones. */ }
      for (const row of log.split('\n')) {
        const [sha, ...parts] = row.split('\t'), message = parts.join('\t');
        if (/^commit(?: \(.*\))?:/.test(message)) owners.set(sha, branch.name);
        if (message.startsWith('branch: Created from ')) branch.base = sha;
        const merge = /^merge (.+): (.+)$/.exec(message);
        if (merge) merges.push({ branch: branch.name, source: merge[1], sha, fastForward: merge[2] === 'Fast-forward' });
      }
    }
    const commits = parseGitLog(run(['log', '--all', '--topo-order', '--reverse', '--format=%H%x09%P%x09%ct%x09%s', '--shortstat'])).map(commit => ({ ...commit, branch: owners.get(commit.sha) ?? null }));
    return { commits, branches, merges, currentBranch: run(['branch', '--show-current']), head: run(['rev-parse', 'HEAD']) };
  } catch { return { commits: [], branches: [], merges: [], currentBranch: '', head: '', error: 'Git history is unavailable.' }; }
}
