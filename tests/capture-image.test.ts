import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureImageInfo } from '../server/capture-image.mjs';

test('historical JPEG captures retain .png filenames and expose their real dimensions/type', () => {
  const root = mkdtempSync(join(tmpdir(), 'capture-image-'));
  const path = join(root, 'historical.png');
  try {
    for (const marker of [0xc0, 0xc2]) {
      writeFileSync(path, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, marker, 0, 8, 8, 0, 90, 0, 160, 1, 0xff, 0xd9]));
      assert.deepEqual(captureImageInfo(path), { width: 160, height: 90, mimeType: 'image/jpeg' });
    }
    writeFileSync(path, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff]));
    assert.throws(() => captureImageInfo(path), /Invalid capture/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
