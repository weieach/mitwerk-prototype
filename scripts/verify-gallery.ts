import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCaptureCatalog, captureDirectory, visualReferenceDirectory } from '../server/gallery-catalog.ts';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = process.argv[2] ?? '.vercel/output/static';
const remote = /^https?:\/\//.test(target);
const base = remote ? new URL(target.endsWith('/') ? target : `${target}/`) : null;
async function readTarget(path: string) {
  if (!base) return readFile(join(resolve(root, target), decodeURIComponent(path)));
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(60_000), cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status}: ${path}`);
  return Buffer.from(await response.arrayBuffer());
}
const expected = readCaptureCatalog(root);
if (!expected.frames.length) throw new Error('Local saved-frame catalog is empty; cannot verify completeness.');
const actual = JSON.parse((await readTarget('gallery/manifest.json')).toString('utf8'));
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
  ...expected.frames.map(f => ({ source: join(root, captureDirectory, f.filename), url: actual.frames.find((a: { id: string }) => a.id === f.id).url })),
  ...expected.references.map(f => ({ source: join(root, visualReferenceDirectory, f.name), url: actual.references.find((a: { name: string }) => a.name === f.name).url })),
];
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
let verified = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (assets.length) {
    const asset = assets.pop()!;
    const [original, published] = await Promise.all([readFile(asset.source), readTarget(asset.url)]);
    if (hash(original) !== hash(published)) throw new Error(`Image bytes differ: ${asset.url}`);
    verified++;
  }
}));
console.log(`Verified ${expected.frames.length} frames and ${expected.references.length} references (${verified} matching SHA-256 hashes) at ${target}.`);
