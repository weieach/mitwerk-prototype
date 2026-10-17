import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { visualReferencePath, visualReferencePrompt } from '../src/shared/visual-reference-path.mjs';
import { readVisualReferences } from '../server/gallery-catalog.ts';

test('annotation references keep their prompt identity and reject paths outside the designated folder', () => {
  const path = visualReferencePath('[prompt #12] Screenshot.png', 291, true);
  assert.equal(path, 'annotation/[prompt #291] [annotation] Screenshot.png');
  assert.equal(visualReferencePrompt(path), 291);
  for (const path of ['../[prompt #1] x.png', 'annotation/../[prompt #1] x.png', 'annotation/[prompt #1] x.png', '[prompt #1] x/y.png']) assert.equal(visualReferencePrompt(path), null);
});
test('catalog includes root and annotation references with valid encoded URLs', () => {
  const root = mkdtempSync(join(tmpdir(), 'mitwerk-references-'));
  try {
    mkdirSync(join(root, 'visual_ref/annotation'), {recursive:true});
    writeFileSync(join(root, 'visual_ref/[prompt #290] Old.png'), 'test');
    writeFileSync(join(root, 'visual_ref/annotation/[prompt #291] [annotation] Marked.png'), 'test');
    const refs = readVisualReferences(root);
    assert.equal(refs.length, 2);
    const annotation = refs.find(r => r.prompt === 291)!;
    assert.equal(decodeURIComponent(annotation.url), 'gallery/references/annotation/[prompt #291] [annotation] Marked.png');
  } finally { rmSync(root, {recursive:true,force:true}); }
});
