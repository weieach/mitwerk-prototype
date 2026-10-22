import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCaptureCatalog, captureDirectory, visualReferenceDirectory } from '../server/gallery-catalog.ts';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = process.argv[2] ?? '.vercel/output/static';
const remote = /^https?:\/\//.test(target);
const base = remote ? new URL(target.endsWith('/') ? target : `${target}/`) : null;
async function readTarget(path: string, blobUrl?: string) {
  if (!base && blobUrl) {
    const response = await fetch(blobUrl, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`${response.status}: ${blobUrl}`);
    return Buffer.from(await response.arrayBuffer());
  }
  if (!base) return readFile(join(resolve(root, target), decodeURIComponent(path)));
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(60_000), cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status}: ${path}`);
  return Buffer.from(await response.arrayBuffer());
}
const actual = JSON.parse((await readTarget('gallery/manifest.json')).toString('utf8'));
// Static deployments ship re-encoded WebPs: verify them against the hashes recorded at packaging.
const isStatic = actual.source === 'static';
const expected = process.argv.includes('--published') && !isStatic
  ? JSON.parse(await readFile(join(root, '.vercel/blob-catalog.json'), 'utf8')) as ReturnType<typeof readCaptureCatalog>
  : readCaptureCatalog(root);
if (!expected.frames.length) throw new Error('Local saved-frame catalog is empty; cannot verify completeness.');
for (const [kind, local, deployed] of [
  ['frames', expected.frames.map(f => f.id), (actual.frames ?? []).map((f: { id: string }) => f.id)],
  ['references', expected.references.map(f => f.name), (actual.references ?? []).map((f: { name: string }) => f.name)],
] as const) {
  const ids = new Set(deployed);
  const missing = local.filter(id => !ids.has(id));
  if (missing.length) throw new Error(`${target} is missing ${missing.length} ${kind}: ${missing.slice(0, 3).join(', ')}`);
}
// Check every published URL against its original bytes, including annotations.
const assets = [
  ...expected.frames.map(f => ({ source: join(root, captureDirectory, f.filename), ...actual.frames.find((a: { id: string }) => a.id === f.id) })),
  ...expected.references.map(f => ({ source: join(root, visualReferenceDirectory, f.name), ...actual.references.find((a: { name: string }) => a.name === f.name) })),
];
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
let verified = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (assets.length) {
    const asset = assets.pop()!;
    if (isStatic) {
      for (const [url, sha] of [[asset.url, asset.sha256], [asset.thumbUrl, asset.thumbSha256]]) {
        if (!url) continue;
        if (!sha || hash(await readTarget(url)) !== sha) throw new Error(`Image bytes differ: ${url}`);
        verified++;
      }
      continue;
    }
    const [original, published] = await Promise.all([readFile(asset.source), readTarget(asset.url, asset.blobUrl)]);
    if (hash(original) !== hash(published)) throw new Error(`Image bytes differ: ${asset.url}`);
    verified++;
  }
}));
console.log(`Verified ${expected.frames.length} frames and ${expected.references.length} references (${verified} matching SHA-256 hashes) at ${target}.`);
if (remote) {
  const prototypes = JSON.parse(await readFile(join(root, '.vercel/output/functions/prototypes.func/prototypes.json'), 'utf8'));
  for (const prototype of Object.values(prototypes) as { url: string }[]) {
    const path = prototype.url.slice(0, prototype.url.lastIndexOf('/') + 1);
    const frozen = JSON.parse((await readTarget(`${path}gallery/manifest.json`)).toString('utf8'));
    const frame = frozen.frames[0];
    if (!frame) throw new Error(`Empty archived catalog: ${path}`);
    if (frame.sha256 && hash(await readTarget(`${path}${frame.url}`)) !== frame.sha256) throw new Error(`Archived image mismatch: ${path}`);
  }
  // Compatibility checks for filename URLs saved before the Blob migration.
  const local = readCaptureCatalog(root);
  const legacy = [local.frames[0], local.frames.find(f => f.mimeType === 'image/jpeg'),
    local.references[0], local.references.find(f => f.name.includes('/'))].filter(Boolean);
  for (const row of legacy) {
    const name = 'filename' in row! ? row!.filename : row!.name;
    const directory = 'filename' in row! ? captureDirectory : visualReferenceDirectory;
    const published = isStatic ? ('filename' in row! ? actual.frames.find((f: { id: string }) => f.id === row!.id) : actual.references.find((f: { name: string }) => f.name === name))?.sha256
      : hash(await readFile(join(root, directory, name)));
    if (hash(await readTarget(row!.url)) !== published) throw new Error(`Legacy image mismatch: ${row!.url}`);
  }
  console.log(`Verified ${Object.keys(prototypes).length} frozen archive image routes and ${legacy.length} legacy filename links.`);
}
