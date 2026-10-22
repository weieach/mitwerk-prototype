import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { packageStaticGallery } from '../scripts/static-gallery.mjs';

test('static gallery ships hashed WebP images and thumbnails and keeps filename links alive', async () => {
  const root = mkdtempSync(join(tmpdir(), 'verso-static-'));
  const filename = '[prompt #1] A+B-2026-01-01-000000.png';
  mkdirSync(join(root, '[frame capture] screenshots'));
  writeFileSync(join(root, '[frame capture] screenshots', filename),
    await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#808080' } }).png().toBuffer());
  const local = { frames: [{ id: filename, filename, width: 3000, height: 2000, url: `gallery/images/${encodeURIComponent(filename)}` }], references: [], ignored: 0 };
  const staticDir = join(root, 'out');
  const { catalog, routes } = await packageStaticGallery(root, staticDir, local);
  const [frame] = catalog.frames;
  assert.equal(catalog.source, 'static');
  assert.match(frame.url, /^gallery\/images\/[a-f0-9]{64}\.webp$/);
  assert.match(frame.thumbUrl, /^gallery\/thumbs\/[a-f0-9]{64}\.webp$/);
  assert.equal(frame.width, 3000, 'album plane sizes keep the original dimensions');
  const full = readFileSync(join(staticDir, frame.url));
  assert.equal(createHash('sha256').update(full).digest('hex'), frame.sha256);
  assert.equal((await sharp(full).metadata()).width, 2400);
  assert.equal((await sharp(readFileSync(join(staticDir, frame.thumbUrl))).metadata()).width, 960);
  assert.ok(routes.some(route => route.dest === `/${frame.url}` && new RegExp(`^${route.src}$`).test(`/${local.frames[0].url}`)));
  assert.deepEqual(JSON.parse(readFileSync(join(staticDir, 'gallery/manifest.json'), 'utf8')).frames[0].url, frame.url);
});
