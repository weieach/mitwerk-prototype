import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCaptureCatalog, captureDirectory } from '../server/gallery-catalog.ts';
import { buildVersions, resolveFrameRequest } from '../src/features/iteration-gallery/model.ts';

test('running prompts remain unpublished until completion, including already-written PNGs', () => {
  const root = mkdtempSync(join(tmpdir(), 'mitwerk-publication-'));
  try {
    mkdirSync(join(root, captureDirectory));
    mkdirSync(join(root, 'docs'));
    const png = Buffer.alloc(24);
    png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(0x0d0a1a0a, 4);
    png.write('IHDR', 12); png.writeUInt32BE(20, 16); png.writeUInt32BE(10, 20);
    const completed = '[prompt #1] Finished-2026-10-17-090000.png';
    const running = '[prompt #2] Running-2026-10-17-090100.png';
    const push = '[push #1] Saved-2026-10-17-085900.png';
    for (const name of [push, completed, running]) writeFileSync(join(root, captureDirectory, name), png);
    writeFileSync(join(root, 'docs/prompt-log.md'), '## Prompt #2\n\n```text\nStill running\n```\n');
    writeFileSync(join(root, 'AGENTS.md'), 'Progress counters (source of truth): **push #1 · prompt #1**.');
    const before = readCaptureCatalog(root);
    assert.deepEqual(before.frames.map(f => f.filename).sort(), [completed, push].sort());
    assert.equal(resolveFrameRequest(buildVersions(before.frames), {frameId:running}), undefined);
    writeFileSync(join(root, 'AGENTS.md'), 'Progress counters (source of truth): **push #1 · prompt #2**.');
    const after = readCaptureCatalog(root);
    assert.equal(after.frames.length, 3);
    assert.equal(resolveFrameRequest(buildVersions(after.frames), {frameId:running})?.fullPrompt, 'Still running');
    rmSync(join(root, 'AGENTS.md'));
    assert.equal(readCaptureCatalog(root).frames.length, 3, 'legacy catalogs retain their completed images');
  } finally { rmSync(root, {recursive:true, force:true}); }
});
