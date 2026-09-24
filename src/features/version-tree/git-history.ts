export type GitCommit = { sha: string; parents: string[]; subject: string; timestamp: number; branch: string | null; filesChanged?: number; added?: number; removed?: number };

/** Split a `--format` log with `--shortstat` into commits and their change totals. */
export function parseGitLog(text: string): GitCommit[] {
  return text.split(/\n(?=[0-9a-f]{7,40}\t)/).filter(Boolean).map(chunk => {
    const [header, ...rest] = chunk.split('\n');
    const [sha, parents, time, ...subject] = header.split('\t');
    const stat = rest.join('\n');
    const files = /(\d+) files? changed/.exec(stat);
    const added = /(\d+) insertions?/.exec(stat);
    const removed = /(\d+) deletions?/.exec(stat);
    return {
      sha, parents: parents ? parents.split(' ') : [], timestamp: +time * 1000, subject: subject.join('\t'), branch: null,
      filesChanged: files ? +files[1] : 0, added: added ? +added[1] : 0, removed: removed ? +removed[1] : 0,
    };
  });
}
export type GitBranch = { name: string; tip: string; base: string | null };
export type GitMerge = { branch: string; source: string; sha: string; fastForward: boolean };
export type GitHistory = { commits: GitCommit[]; branches: GitBranch[]; merges: GitMerge[]; currentBranch: string; head: string; error?: string };

export function normalizedCaptureSubject(text: string) {
  return text.replace(/[[\]]/g, '').replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').replace(/[. ]+$/g, '').trim();
}
