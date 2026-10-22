import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { builtPrototypeData, createPrototypeService, findPushSha } from '../server/prototype-service.mjs';
import { blobGalleryRoutes } from '../server/blob-gallery.mjs';
import { packageBlobManifest } from './package-blob-manifest.mjs';

// Package exact pushed trees from local Git or GitHub, including partial cloud checkouts.
// Capture images come from Blob; recorded commit identities come from data/push-shas.json.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cloudBuild = process.env.VERCEL === '1' || process.env.MITWERK_GALLERY_SOURCE === 'blob';
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
if (!cloudBuild) execFileSync('npm', ['run', 'publish:gallery'], { cwd: root, stdio: 'inherit' });
const blobConfig = JSON.parse(await readFile(join(root, 'data/blob-storage.json'), 'utf8'));
const blobCatalog = JSON.parse(await readFile(join(root, cloudBuild ? 'dist/gallery/manifest.json' : '.vercel/blob-catalog.json'), 'utf8'));
const output = join(root, '.vercel/output');
await rm(output, { recursive: true, force: true });
const staticDir = join(output, 'static');
await cp(join(root, 'dist'), staticDir, { recursive: true });
await packageBlobManifest(output, blobConfig.manifestUrl);
const data = builtPrototypeData(root);
const localCatalog = data.catalog();
await writeFile(join(staticDir, 'gallery/manifest.json'), JSON.stringify(blobCatalog));
await rm(join(staticDir, 'gallery/images'), { recursive: true, force: true });
await rm(join(staticDir, 'gallery/references'), { recursive: true, force: true });
await rm(join(staticDir, 'gallery/thumbs'), { recursive: true, force: true });
const service = createPrototypeService(root, { ...data, catalog: () => blobCatalog });
const prototypes = {};
const routes = blobGalleryRoutes(blobConfig, localCatalog, blobCatalog);
const numbers = [...new Set(data.catalog().frames.filter(f => f.kind === 'push').map(f => f.number))];
for (const number of numbers) {
  if (!findPushSha(root, number)) {
    console.warn(`Push #${number} has no recorded commit; no prototype can be packaged.`);
    continue;
  }
  console.log(`Preparing archived prototype ${number}…`);
  try { prototypes[number] = await service.prepare(number); }
  catch (error) { throw new Error(`Could not package recorded push #${number}; refusing to deploy an incomplete prototype catalog.`, { cause: error }); }
  const base = `/__mitwerk/prototype-assets/${number}`;
  const built = join(root, '.mitwerk-prototypes', `push-${number}`);
  await cp(built, join(staticDir, base), { recursive: true });
  routes.push({ src: `${base}/(.*)`, headers: {
    'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff',
  }, continue: true });
  // The iframe keeps its original frozen catalog; image bytes are stored only once.
  routes.push({ src: `${base}/gallery/(images|references|thumbs)/([a-f0-9]{64}\\.(?:png|jpg|webp))`, dest: `${blobConfig.origin}/gallery/$1/$2` });
}
const fn = join(output, 'functions/prototypes.func');
await mkdir(fn, { recursive: true });
await cp(join(root, 'server/deployed-prototypes.cjs'), join(fn, 'handler.cjs'));
await writeFile(join(fn, 'prototypes.json'), JSON.stringify(prototypes));
await writeFile(join(fn, 'index.cjs'), "module.exports = require('./handler.cjs').createHandler(require('./prototypes.json'));\n");
await writeFile(join(fn, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.cjs', launcherType: 'Nodejs' }));
routes.push({ src: '/__mitwerk/prototypes/([1-9]\\d*)', dest: '/prototypes' });
// Browser-local test graphs remain local; production never writes to the repo.
await writeFile(join(staticDir, 'graph-empty.json'), 'null');
routes.push({ src: '/__mitwerk/graph', methods: ['GET'], dest: '/graph-empty.json' });
routes.push({ src: '/__mitwerk/graph', methods: ['POST'], status: 204 });
routes.push({ handle: 'filesystem' });
routes.push({ src: '/__mitwerk/(.*)', status: 404 });
routes.push({ src: '/((?:gallery|assets)/.*)', status: 404 });
routes.push({ src: '/.*', dest: '/index.html' });
const catalog = JSON.parse(await readFile(join(staticDir, 'gallery/manifest.json'), 'utf8'));
await writeFile(join(output, 'config.json'), JSON.stringify({ version: 3, routes }, null, 2));
if (!cloudBuild) execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/verify-gallery.ts'], { cwd: root, stdio: 'inherit' });
console.log(`Vercel output ready: ${catalog.frames.length} frames, ${Object.keys(prototypes).length} archived prototypes.`);
