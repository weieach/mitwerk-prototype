import { promptReferences, type VisualReference } from '../iteration-gallery/references.ts';
import { buildVersions } from '../iteration-gallery/model.ts';
import type { Capture } from '../iteration-gallery/model.ts';
import type { GraphState, VersionNode } from './model.ts';

/** Capture chronology only: filenames do not contain Git parent hashes. */
export function promptReferenceFiles(references: VisualReference[], prompts: number[]) {
  return promptReferences(references, prompts).map(file => ({ ...file, kind: 'reference' as const, added: 0, removed: 0 }));
}

export function buildCaptureHistory(captures: Capture[], references: VisualReference[] = []): GraphState {
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
      prompts: version.frames.filter(frame => frame.kind === 'prompt').map(frame => ({ id: frame.id, text: frame.fullPrompt ?? frame.summary })),
      files: [...version.frames.map(frame => ({ name: frame.filename, kind: 'reference' as const, added: 0, removed: 0, url: frame.url })),
        ...promptReferenceFiles(references, version.frames.flatMap(frame => frame.kind === 'prompt' && frame.number !== null ? [frame.number] : []))],
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
export function buildGitCaptureHistory(captures: Capture[], git: GitHistory, references: VisualReference[] = []): GraphState {
  const saved = buildCaptureHistory(captures, references);
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
  const ancestors = (sha: string) => {
    const found = new Set<string>();
    const pending = [sha];
    while (pending.length) {
      const id = pending.pop()!;
      if (found.has(id)) continue;
      found.add(id);
      pending.push(...(bySha.get(id)?.parents ?? []));
    }
    return found;
  };
  // Uncaptured remote contributions enter as a branch tip, not numbered local work.
  const remoteSources = new Map<string, string>();
  for (const commit of git.commits.filter(commit => commit.parents.length > 1)) {
    const mainline = ancestors(commit.parents[0]);
    for (const sha of commit.parents.slice(1)) {
      if (git.branches.some(ref => ref.tip === sha)) continue;
      const remote = git.remoteBranches?.find(ref => ref.tip === sha)
        ?? git.remoteBranches?.find(ref => ancestors(ref.tip).has(sha));
      if (!remote) continue;
      const contribution = [...ancestors(sha)].filter(id => !mainline.has(id));
      if (!contribution.length || contribution.some(id => matched.has(id))) continue;
      remoteSources.set(sha, remote.name);
      for (const id of contribution) visible.delete(id);
    }
  }
  const nearest = (sha: string): string[] => {
    if (visible.has(sha)) return [sha];
    return bySha.get(sha)?.parents.flatMap(nearest) ?? [];
  };
  const nodes: VersionNode[] = git.commits.filter(commit => visible.has(commit.sha)).map(commit => {
    const captured = matched.get(commit.sha);
    const incomingBranches = commit.parents.slice(1).filter(sha => !visible.has(sha)).map(sha => ({
      sha,
      name: remoteSources.get(sha) ?? [...git.branches, ...(git.remoteBranches ?? [])].find(ref => ref.tip === sha)?.name
        ?? bySha.get(sha)?.branch
        ?? git.merges.find(merge => merge.sha === commit.sha && !merge.fastForward)?.source
        ?? `Branch at ${sha.slice(0, 7)}`,
    }));
    // Never project an unseen merge parent onto an unrelated visible ancestor.
    const parents = [...new Set(commit.parents.flatMap((sha, index) => index > 0 && !visible.has(sha) ? [] : nearest(sha)))];
    const branch = commit.branch ?? captured?.capture?.branches.at(-1) ?? git.branches.find(ref => ref.tip === commit.sha)?.name ?? 'main';
    return {
      ...captured, id: commit.sha, label: captured?.label ?? commit.sha.slice(0, 7), title: commit.subject,
      saveType: 'manual', createdAt: new Date(commit.timestamp).toISOString(), parentId: parents[0] ?? null,
      relation: parents.length ? 'commit' : 'root', branchId: branch,
      files: captured?.files ?? [], prompts: captured?.prompts ?? [], summary: commit.subject,
      incomingBranches,
      git: { sha: commit.sha, rawParents: commit.parents, parents, refs: git.branches.filter(ref => nearest(ref.tip).includes(commit.sha)).map(ref => ref.name),
        filesChanged: commit.filesChanged ?? 0, added: commit.added ?? 0, removed: commit.removed ?? 0,
        merges: git.merges.filter(merge => merge.sha === commit.sha).map(merge => `${merge.source} → ${merge.branch}${merge.fastForward ? ' (fast-forward)' : ''}`) },
    };
  });
  // Insert missing captures between their recorded version anchors. Keep Git's
  // topological order intact and never attach old captures to today's branch tip.
  for (const node of unmatched) {
    const version = node.capture!.version;
    const previousIndex = nodes.reduce((last, item, index) => item.capture && item.capture.version < version ? index : last, -1);
    const nextIndex = nodes.findIndex(item => item.capture && item.capture.version > version);
    const end = nextIndex < 0 ? nodes.length : nextIndex;
    let index = Math.min(previousIndex + 1, end);
    while (index < end && Date.parse(nodes[index].createdAt) <= Date.parse(node.createdAt)) index++;
    const branch = node.capture?.branches.at(-1) ?? git.currentBranch;
    const preceding = nodes.slice(0, index);
    const ref = git.branches.find(ref => ref.name === branch);
    const tip = ref ? nearest(ref.tip)[0] : undefined;
    const parentId = tip && preceding.some(item => item.id === tip) ? tip
      : preceding.slice().reverse().find(item => item.branchId === branch)?.id ?? null;
    nodes.splice(index, 0, { ...node, branchId: branch, parentId, relation: parentId ? 'commit' : 'root',
      summary: `${node.capture?.pushed ? 'Capture without a matching Git commit' : 'Unpushed work'} · ${node.summary}` });
  }
  // A capture-only predecessor is chronological evidence, not a Git parent.
  let previousCapture: VersionNode | undefined;
  for (const node of nodes) {
    if (!node.capture) continue;
    if (previousCapture && !previousCapture.git && node.git) node.chronologyParentId = previousCapture.id;
    previousCapture = node;
  }
  assignInterimVersionLabels(nodes);
  for (const node of nodes) {
    const title = displayedCommitTitle(node.label);
    if (!title) continue;
    node.title = title;
    if (node.git) node.summary = title;
  }
  return { nodes, activeBranchId: git.currentBranch || nodes.at(-1)?.branchId || 'main', selectedId: nodes.at(-1)?.id ?? null, revertedIds: [] };
}

/** Curated wording for the recorded history. Versions without an entry keep the Git subject. */
const displayedCommitTitles: Record<string, string> = {
  v1: 'Add prototype version stream with subway-style branching and per-push screenshots',
  v2: 'Improve screen capture mechanics',
  v3: 'Fix screen capture on push',
  v4: 'Implement git branching logic with current-branch highlight; add version panel actions',
  v5: 'Enhance progress screenshots and version management',
  v6: 'Clarify connector behavior and layering by version order in design system',
  v7: 'Update branch color palette; improve version label readability on zoom',
  v8: 'Refine file chips; add compact cards for off-current branches',
  v9: 'Add revert commit and disabled node states; improve hide-grid button',
  v10: 'Add per-push repo capture hook and update capture filenames; fix add-commit button on endpoints',
  v11: 'Add initial iteration gallery, version tree test visuals, and capture logic',
  'v11.1': 'Render iteration gallery with interactive WebGL blocks',
  v12: 'Begin 3D view (WIP)',
  v13: 'Add frontal theater view framework and 2D/3D transitions',
  v14: 'Add XR integration; improve data viz labels',
  v15: 'Quick change',
  v16: 'Clarify branch coloring; show gallery labels in top view; add theater timeline side view',
};

export function displayedCommitTitle(label: string) {
  return displayedCommitTitles[label.toLowerCase()] ?? null;
}

/** Capture identities are authoritative; uncaptured commits use dotted labels. */
export function assignInterimVersionLabels(nodes: VersionNode[]) {
  let major = 0, minor = 0;
  let previousMilestone: VersionNode | undefined;
  const byId = new Map(nodes.map(node => [node.id, node]));
  function hasAncestor(node: VersionNode, id: string): boolean {
    const pending = [...(node.git?.parents ?? (node.parentId ? [node.parentId] : []))];
    const seen = new Set<string>();
    while (pending.length) {
      const next = pending.pop()!;
      if (next === id) return true;
      if (seen.has(next)) continue;
      seen.add(next);
      const parent = byId.get(next);
      if (parent) pending.push(...(parent.git?.parents ?? (parent.parentId ? [parent.parentId] : [])));
    }
    return false;
  }
  for (const node of nodes) {
    const precedingMilestone = previousMilestone;
    const recorded = node.capture?.version ?? (/^V(\d+)$/.exec(node.label)?.[1] ? Number(node.label.slice(1)) : null);
    const merge = (node.git?.rawParents?.length ?? node.git?.parents.length ?? 0) > 1;
    if (recorded !== null) {
      major = recorded;
      node.label = `V${major}`;
      minor = 0;
      previousMilestone = node;
    } else if (major && !/^V\d+\.\d+$/.test(node.label)) {
      node.label = `V${major}.${++minor}`;
    }
    if (merge) {
      if (precedingMilestone && !hasAncestor(node, precedingMilestone.id)) {
        node.chronologyParentId = precedingMilestone.id;
      }
      previousMilestone = node;
    }
  }
  return nodes;
}
