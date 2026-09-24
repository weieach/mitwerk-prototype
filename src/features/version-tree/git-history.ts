export type GitCommit = { sha: string; parents: string[]; subject: string; timestamp: number; branch: string | null };
export type GitBranch = { name: string; tip: string; base: string | null };
export type GitMerge = { branch: string; source: string; sha: string; fastForward: boolean };
export type GitHistory = { commits: GitCommit[]; branches: GitBranch[]; merges: GitMerge[]; currentBranch: string; head: string; error?: string };

export function normalizedCaptureSubject(text: string) {
  return text.replace(/[[\]]/g, '').replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').replace(/[. ]+$/g, '').trim();
}
