import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGitLog } from '../src/features/version-tree/git-history.ts';
import type { GitHistory } from '../src/features/version-tree/git-history.ts';

/** Local Git parents/refs are authoritative; reflogs preserve fast-forward branch activity. */
export function readGitHistory(root: string): GitHistory {
  const run = (args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024 }).trim();
  try {
    const branches = run(['for-each-ref', '--format=%(refname:short)%09%(objectname)', 'refs/heads']).split('\n').filter(Boolean).map(row => {
      const [name, tip] = row.split('\t'); return { name, tip, base: null as string | null };
    });
    const remoteBranches = run(['for-each-ref', '--format=%(refname:short)%09%(objectname)%09%(symref)', 'refs/remotes']).split('\n').filter(Boolean).flatMap(row => {
      const [name, tip, symbolic] = row.split('\t');
      return symbolic ? [] : [{ name, tip, base: null }];
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
    const commits = parseGitLog(run(['log', '--branches', '--remotes', 'HEAD', '--date-order', '--reverse', '--format=%H%x09%P%x09%ct%x09%s', '--shortstat'])).map(commit => ({ ...commit, branch: owners.get(commit.sha) ?? null }));
    return { commits, branches, remoteBranches, merges, currentBranch: run(['branch', '--show-current']), head: run(['rev-parse', 'HEAD']) };
  } catch { return { commits: [], branches: [], merges: [], currentBranch: '', head: '', error: 'Git history is unavailable.' }; }
}

/** Drops a trailing block of Git trailers (Co-Authored-By, Signed-off-by, …) from a commit message. */
export function commitMessageText(message: string) {
  const paragraphs = message.trim().split(/\n\s*\n/);
  const last = paragraphs.at(-1) ?? '';
  if (paragraphs.length > 1 && last.split('\n').every(line => /^[A-Za-z][\w-]*: .+/.test(line.trim()))) paragraphs.pop();
  return paragraphs.join('\n\n').trim();
}

const subjectKey = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Full commit messages for pushes, keyed by push number. The recorded SHA (`data/push-shas.json`) is used only
 * when its subject matches the capture's (possibly truncated) summary; otherwise the commit is found by subject,
 * nearest before the capture time. Unmatched pushes keep their filename summary.
 */
export function readPushMessages(root: string, pushes: { number: number; summary: string; timestamp: number }[]): Map<number, string> {
  const messages = new Map<number, string>();
  let shas: Record<string, string> = {};
  try { shas = JSON.parse(readFileSync(join(root, 'data', 'push-shas.json'), 'utf8')); } catch { /* Match by subject only. */ }
  let log = '';
  try {
    log = execFileSync('git', ['log', '--all', '--format=%H%x1f%ct%x1f%B%x1e'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch { return messages; }
  const commits = log.split('\x1e').flatMap(record => {
    const [sha, time, body] = record.trim().split('\x1f');
    if (!sha || body === undefined) return [];
    const text = commitMessageText(body);
    // Git's subject is the whole first paragraph, which may wrap across lines.
    return [{ sha, time: Number(time) * 1000, text, key: subjectKey(text.split(/\n\s*\n/)[0]) }];
  });
  const bySha = new Map(commits.map(commit => [commit.sha, commit]));
  for (const push of pushes) {
    const key = subjectKey(push.summary);
    const recorded = bySha.get(shas[push.number] ?? '');
    const matches = (commit: { key: string }) => key.length > 0 && commit.key.startsWith(key);
    const found = recorded && (!key || matches(recorded)) ? recorded
      : commits.filter(commit => matches(commit) && commit.time <= push.timestamp + 60_000).sort((a, b) => b.time - a.time)[0];
    if (found?.text) messages.set(push.number, found.text);
  }
  return messages;
}
