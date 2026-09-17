import type { GraphState } from '../src/features/version-tree/model.ts';

/** Multi-route fixture for geometry tests only. */
export function createTestGraphState(): GraphState {
  return {
    selectedId: 'v2',
    nodes: [
      {
        id: 'v1', label: 'V1', title: 'Finish project setup', saveType: 'auto',
        createdAt: '2026-09-17T09:00:00', branchId: 'main', parentId: null, relation: 'root',
        summary: 'A shared starting point for the workspace.',
        prompts: [{ id: 'p1', text: 'Set up a workspace for exploring the version tree.' }],
        files: [
          { name: 'project-proposal.md', kind: 'reference', added: 0, removed: 0 },
          { name: 'App.tsx', kind: 'code', added: 24, removed: 0 },
        ],
      },
      {
        id: 'v2', label: 'V2', title: 'Build the version tree', saveType: 'manual',
        createdAt: '2026-09-17T09:18:00', branchId: 'main', parentId: 'v1', relation: 'commit',
        summary: 'Explore the structure of versions, branches, and their connections.',
        prompts: [
          { id: 'p2', text: 'Arrange versions as stations on an isometric grid.' },
          { id: 'p3', text: 'Keep each version’s prompts and file changes beside its station.' },
        ],
        files: [
          { name: 'VersionTree.tsx', kind: 'code', added: 132, removed: 12 },
          { name: 'versiontree-plan-1.png', kind: 'reference', added: 0, removed: 0 },
        ],
      },
      {
        id: 'v3', label: 'V3', title: 'Make room to explore', saveType: 'auto',
        createdAt: '2026-09-17T09:34:00', branchId: 'main', parentId: 'v2', relation: 'commit',
        summary: 'Navigate the canvas as the version tree grows.',
        prompts: [{ id: 'p4', text: 'Add canvas navigation and controls for creating branches and commits.' }],
        files: [{ name: 'VersionCanvas.tsx', kind: 'code', added: 86, removed: 8 }],
      },
      {
        id: 'v2-1', label: 'V2.1', title: 'Try another direction', saveType: 'manual',
        createdAt: '2026-09-17T09:26:00', branchId: 'alternative', parentId: 'v2', relation: 'branch',
        summary: 'An alternative that keeps its connection to the original idea.',
        prompts: [{ id: 'p5', text: 'Branch from this version to explore another approach.' }],
        files: [{ name: 'tree-layout.ts', kind: 'code', added: 48, removed: 4 }],
      },
    ],
  };
}
