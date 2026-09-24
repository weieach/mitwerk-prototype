import { buildVersions } from '../iteration-gallery/model.ts';
import type { Capture } from '../iteration-gallery/model.ts';
import type { GraphState, VersionNode } from './model.ts';

/** Capture chronology only: filenames do not contain Git parent hashes. */
export function buildCaptureHistory(captures: Capture[]): GraphState {
  const versions = buildVersions([...new Map(captures.map(frame => [frame.id, frame])).values()]);
  const nodes: VersionNode[] = versions.map((version, index) => {
    const push = version.frames.filter(frame => frame.kind === 'push').at(-1);
    const latest = push ?? version.frames.at(-1)!;
    return {
      id: `capture-version-${version.number}`, label: `V${version.number}`,
      title: latest.summary, saveType: push ? 'manual' : 'auto', createdAt: new Date(latest.timestamp).toISOString(),
      branchId: 'capture-history', parentId: index ? `capture-version-${versions[index - 1].number}` : null,
      relation: index ? 'commit' : 'root',
      summary: push ? `Push #${push.number} · ${latest.summary}` : `Work in progress · ${latest.summary}`,
      prompts: version.frames.filter(frame => frame.kind === 'prompt').map(frame => ({ id: frame.id, text: frame.summary })),
      files: version.frames.map(frame => ({ name: frame.filename, kind: 'reference', added: 0, removed: 0, url: frame.url })),
      capture: { version: version.number, pushed: !!push, branches: [...new Set(version.frames.map(frame => frame.branch ?? 'main'))], added: latest.added, removed: latest.removed },
    };
  });
  return { nodes, selectedId: nodes.at(-1)?.id ?? null, activeBranchId: 'capture-history', revertedIds: [] };
}

/** Refresh source data without changing the sandbox or losing a valid history selection. */
export function refreshCaptureHistory(previous: GraphState, next: GraphState): GraphState {
  return { ...next, selectedId: previous.selectedId === null ? null
    : next.nodes.some(node => node.id === previous.selectedId) ? previous.selectedId : next.selectedId };
}

import { normalizedCaptureSubject } from './git-history.ts';
import type { GitHistory } from './git-history.ts';

/** Attach saved versions to Git commits; uncaptured commits remain part of the graph. */
export function buildGitCaptureHistory(captures: Capture[], git: GitHistory): GraphState {
  const saved = buildCaptureHistory(captures);
  if (!git.commits.length) return saved;
  const matched = new Map<string, VersionNode>();
  const unmatched: VersionNode[] = [];
  for (const node of saved.nodes) {
    if (!node.capture?.pushed) { unmatched.push(node); continue; }
    const subject = normalizedCaptureSubject(node.title);
    const candidates = git.commits.filter(commit => normalizedCaptureSubject(commit.subject).startsWith(subject));
    candidates.sort((a, b) => Math.abs(a.timestamp - Date.parse(node.createdAt)) - Math.abs(b.timestamp - Date.parse(node.createdAt)));
    if (subject && candidates[0] && !matched.has(candidates[0].sha)) matched.set(candidates[0].sha, node); else unmatched.push(node);
  }
  const bySha = new Map(git.commits.map(commit => [commit.sha, commit]));
  // Begin with the earliest captured commit, retaining meaningful descendants on every branch.
  const first = git.commits.find(commit => matched.has(commit.sha));
  const included = new Set<string>();
  for (const commit of git.commits) {
    if (!first || commit.sha === first.sha || matched.has(commit.sha) || commit.parents.some(parent => included.has(parent))) included.add(commit.sha);
  }
  const visible = new Set(git.commits.filter(commit => included.has(commit.sha) && (matched.has(commit.sha) || commit.subject !== 'chore: progress screenshot')).map(commit => commit.sha));
  const nearest = (sha: string): string[] => {
    if (visible.has(sha)) return [sha];
    return bySha.get(sha)?.parents.flatMap(nearest) ?? [];
  };
  const nodes: VersionNode[] = git.commits.filter(commit => visible.has(commit.sha)).map(commit => {
    const captured = matched.get(commit.sha);
    const parents = [...new Set(commit.parents.flatMap(nearest))];
    const branch = commit.branch ?? captured?.capture?.branches.at(-1) ?? git.branches.find(ref => ref.tip === commit.sha)?.name ?? 'main';
    return {
      ...captured, id: commit.sha, label: captured?.label ?? commit.sha.slice(0, 7), title: commit.subject,
      saveType: 'manual', createdAt: new Date(commit.timestamp).toISOString(), parentId: parents[0] ?? null,
      relation: parents.length ? 'commit' : 'root', branchId: branch,
      files: captured?.files ?? [], prompts: captured?.prompts ?? [], summary: commit.subject,
      git: { sha: commit.sha, parents, refs: git.branches.filter(ref => nearest(ref.tip).includes(commit.sha)).map(ref => ref.name),
        merges: git.merges.filter(merge => merge.sha === commit.sha).map(merge => `${merge.source} → ${merge.branch}${merge.fastForward ? ' (fast-forward)' : ''}`) },
    };
  });
  // Unpushed or unmatched captures remain explicitly labeled, attached to the recorded branch tip when known.
  for (const node of unmatched) {
    const branch = node.capture?.branches.at(-1) ?? git.currentBranch;
    const ref = git.branches.find(ref => ref.name === branch);
    const parentId = ref ? nearest(ref.tip)[0] ?? null : null;
    nodes.push({ ...node, branchId: branch, parentId, relation: parentId ? 'commit' : 'root',
      summary: `${node.capture?.pushed ? 'Capture without a matching Git commit' : 'Unpushed work'} · ${node.summary}` });
  }
  return { nodes, activeBranchId: git.currentBranch || nodes.at(-1)?.branchId || 'main', selectedId: nodes.at(-1)?.id ?? null, revertedIds: [] };
}
