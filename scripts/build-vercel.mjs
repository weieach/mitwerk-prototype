import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { builtPrototypeData, createPrototypeService, pushAvailable } from '../server/prototype-service.mjs';

// Build locally: captures and Git history are not in Git; push sources come from data/push-shas.json.
// Upload only this output via `vercel deploy --prebuilt --prod`.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
const output = join(root, '.vercel/output');
await rm(output, { recursive: true, force: true });
const staticDir = join(output, 'static');
await cp(join(root, 'dist'), staticDir, { recursive: true });
const data = builtPrototypeData(root);
const service = createPrototypeService(root, data);
const prototypes = {};
const routes = [];
const numbers = [...new Set(data.catalog().frames.filter(f => f.kind === 'push').map(f => f.number))];
for (const number of numbers) {
  if (!await pushAvailable(root, number)) continue;
  console.log(`Preparing archived prototype ${number}…`);
  prototypes[number] = await service.prepare(number);
  const base = `/__mitwerk/prototype-assets/${number}`;
  const built = join(root, '.mitwerk-prototypes', `push-${number}`);
  await cp(built, join(staticDir, base), { recursive: true });
  routes.push({ src: `${base}/(.*)`, headers: {
    'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff',
  }, continue: true });
  // The iframe keeps its original frozen catalog; image bytes are stored only once.
  routes.push({ src: `${base}/gallery/(images|references)/(.*)`, dest: '/gallery/$1/$2' });
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
await writeFile(join(output, 'config.json'), JSON.stringify({ version: 3, routes }, null, 2));
const catalog = JSON.parse(await readFile(join(staticDir, 'gallery/manifest.json'), 'utf8'));
console.log(`Vercel output ready: ${catalog.frames.length} frames, ${Object.keys(prototypes).length} archived prototypes.`);
