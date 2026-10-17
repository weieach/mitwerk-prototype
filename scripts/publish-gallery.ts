import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, list, put } from '@vercel/blob';
import { readCaptureCatalog, captureDirectory, visualReferenceDirectory } from '../server/gallery-catalog.ts';
import { captureImageInfo } from '../server/capture-image.mjs';
import { blobImagePath, mergeBlobCatalog, sha256, catalogWriteEtag } from '../server/blob-gallery.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
if (existsSync(join(root, '.env.local'))) process.loadEnvFile(join(root, '.env.local'));
const local = readCaptureCatalog(root);
if (!local.frames.length || local.ignored) throw new Error(`Refusing publication: ${local.frames.length} frames, ${local.ignored} unreadable captures.`);
const previous = await get('gallery/manifest.json', { access: 'public', useCache: false, abortSignal: AbortSignal.timeout(60_000) });
const oldCatalog = previous?.stream ? await new Response(previous.stream).json() : null;
const existing = new Map<string, string>();
let cursor: string | undefined;
do {
  const page = await list({ prefix: 'gallery/', cursor, limit: 1000 });
  page.blobs.forEach(blob => existing.set(blob.pathname, blob.url));
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);
const frames = new Map(), references = new Map();
const assets = [
  ...local.frames.map(frame => ({ row: frame, key: frame.id, kind: 'images', path: join(root, captureDirectory, frame.filename), output: frames })),
  ...local.references.map(reference => ({ row: reference, key: reference.name, kind: 'references', path: join(root, visualReferenceDirectory, reference.name), output: references })),
];
let done = 0, uploaded = 0;
const total = assets.length;
// Deduplicate concurrent work if multiple captures contain identical bytes.
const pending = new Map<string, Promise<string>>();
await Promise.all(Array.from({ length: 6 }, async () => {
  while (assets.length) {
    const asset = assets.pop()!;
    const bytes = await readFile(asset.path);
    const { mimeType } = captureImageInfo(asset.path);
    const pathname = blobImagePath(asset.kind, bytes, mimeType);
    if (!pending.has(pathname)) pending.set(pathname, (async () => {
      let url = existing.get(pathname);
      if (!url) {
        const blob = await put(pathname, bytes, { access: 'public', addRandomSuffix: false,
          contentType: mimeType, cacheControlMaxAge: 31536000 });
        url = blob.url;
        uploaded++;
      }
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok || sha256(Buffer.from(await response.arrayBuffer())) !== sha256(bytes)) {
        throw new Error(`Blob verification failed: ${pathname}`);
      }
      return url;
    })());
    const blobUrl = await pending.get(pathname)!;
    asset.output.set(asset.key, { ...asset.row, url: pathname, blobUrl, sha256: sha256(bytes), bytes: bytes.length, mimeType });
    done++;
    if (done % 50 === 0 || done === total) console.log(`Verified ${done}/${total} gallery assets (${uploaded} newly uploaded).`);
  }
}));
const catalog = mergeBlobCatalog(oldCatalog, { ...local,
  frames: local.frames.map(frame => frames.get(frame.id)),
  references: local.references.map(reference => references.get(reference.name)),
});
const body = JSON.stringify(catalog);
const snapshotPath = `gallery/catalogs/${sha256(body)}.json`;
if (!existing.has(snapshotPath)) await put(snapshotPath, body, { access: 'public', addRandomSuffix: false,
  contentType: 'application/json', cacheControlMaxAge: 31536000 });
// Publish last, with compare-and-swap to reject concurrent/stale publishers.
const manifest = await put('gallery/manifest.json', body, { access: 'public', addRandomSuffix: false,
  contentType: 'application/json', cacheControlMaxAge: 60,
  ...(previous ? { ifMatch: catalogWriteEtag(previous.blob.etag), allowOverwrite: true } : {}) });
// Public Blob caches can retain the prior catalog briefly after an overwrite.
let confirmed = false;
for (let attempt = 0; attempt < 14; attempt++) {
  const result = await get(manifest.url, { access: 'public', useCache: false, abortSignal: AbortSignal.timeout(60_000) });
  if (result?.stream && sha256(await new Response(result.stream).text()) === sha256(body)) { confirmed = true; break; }
  if (attempt === 0) console.log('Waiting for the public catalog cache to refresh…');
  await new Promise(resolve => setTimeout(resolve, 5000));
}
if (!confirmed) throw new Error('Catalog was uploaded, but public cache verification timed out; rerun publish:gallery.');
await mkdir(join(root, '.vercel'), { recursive: true });
await writeFile(join(root, '.vercel/blob-catalog.json'), body);
// Only public addresses are persisted in Git. Credentials remain in ignored env files.
await writeFile(join(root, 'data/blob-storage.json'), JSON.stringify({
  origin: new URL(manifest.url).origin, manifestUrl: manifest.url,
}, null, 2) + '\n');
console.log(`Published ${catalog.frames.length} frames and ${catalog.references.length} references to ${manifest.url}`);
