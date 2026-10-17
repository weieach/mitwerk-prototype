import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { enqueueCapturePublication, pendingPublications, drainCapturePublications, acquirePublicationLock } from '../scripts/capture-publication.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'capture-publish-'));
  const capture = join(root, 'saved.png');
  writeFileSync(capture, 'saved image');
  return { root, capture, clean: () => rmSync(root, { recursive: true, force: true }) };
}
test('saved captures queue durably; missing/empty captures never queue', () => {
  const f = fixture();
  try {
    assert.throws(() => enqueueCapturePublication(f.root, join(f.root, 'missing'), { start: false }));
    writeFileSync(f.capture, '');
    assert.throws(() => enqueueCapturePublication(f.root, f.capture, { start: false }), /unsaved/);
    assert.equal(pendingPublications(f.root).length, 0);
    writeFileSync(f.capture, 'saved image');
    enqueueCapturePublication(f.root, f.capture, { start: false });
    assert.equal(pendingPublications(f.root).length, 1);
  } finally { f.clean(); }
});
test('a failed upload retains its batch, retries, and drains captures added during publication', async () => {
  const f = fixture();
  try {
    enqueueCapturePublication(f.root, f.capture, { start: false });
    let attempts = 0, retries = 0;
    await drainCapturePublications({ root: f.root, log() {},
      sleep: async delay => { retries++; assert.equal(delay, 15000); assert.equal(pendingPublications(f.root).length, 1); },
      publish: async () => {
        attempts++;
        if (attempts === 1) throw Error('offline');
        if (attempts === 2) enqueueCapturePublication(f.root, f.capture, { start: false });
      },
    });
    assert.equal(attempts, 3);
    assert.equal(retries, 1);
    assert.equal(pendingPublications(f.root).length, 0);
  } finally { f.clean(); }
});
test('only one capture publication worker owns the queue at a time', () => {
  const f = fixture();
  try {
    const release = acquirePublicationLock(f.root);
    assert.ok(release);
    assert.equal(acquirePublicationLock(f.root), null);
    release();
    const again = acquirePublicationLock(f.root);
    assert.ok(again);
    again();
  } finally { f.clean(); }
});
