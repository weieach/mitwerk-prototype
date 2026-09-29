import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { cp, rm } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';

export const archiveDirectory = '[ver capture] codebase';
export const prototypeApi = '/__mitwerk/prototypes';
const assetsPrefix = '/__mitwerk/prototype-assets/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.otf': 'font/otf' };

/** Push numbers are stable across screenshot/archive timestamp differences. Never guess by version order. */
export function findArchive(root, number) {
  const directory = join(root, archiveDirectory);
  if (!Number.isSafeInteger(number) || number < 1 || !existsSync(directory)) return null;
  const matches = readdirSync(directory, { withFileTypes: true }).filter(entry =>
    entry.isDirectory() && /^\[push #(\d+)\]/.exec(entry.name)?.[1] === String(number));
  if (matches.length !== 1) return null;
  const path = join(directory, matches[0].name);
  return existsSync(join(path, 'index.html')) && existsSync(join(path, 'package.json')) ? path : null;
}

/** A sandboxed archive gets ephemeral storage and access only to its frozen, read-only assets. */
export function prototypeBootstrap(base) {
  return `<script>(()=>{const base=${JSON.stringify(base)};const memory=()=>{const data=new Map();return {getItem:k=>data.get(String(k))??null,setItem:(k,v)=>data.set(String(k),String(v)),removeItem:k=>data.delete(String(k)),clear:()=>data.clear(),key:i=>[...data.keys()][i]??null,get length(){return data.size}}};for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{value:memory()});const request=window.fetch.bind(window);window.fetch=(input,init)=>{let url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);if(url.pathname.startsWith('/__mitwerk/graph'))return Promise.resolve(new Response('null',{headers:{'Content-Type':'application/json'}}));if(url.pathname.startsWith('/gallery/'))url=new URL(base+url.pathname.slice(1),location.origin);if(url.origin!==location.origin||!url.pathname.startsWith(base))return Promise.reject(new Error('This archived prototype only accesses its saved assets.'));return request(url,{...init,credentials:'omit'});};})();</script>`;
}

export function snapshotCatalog(catalog, push) {
  return { ...catalog, frames: catalog.frames.filter(frame => frame.timestamp <= push.timestamp) };
}

export function createPrototypeService(root, { catalog, history }) {
  const builds = new Map();
  const ready = new Map();
  async function prepare(number) {
    const archive = findArchive(root, number);
    const push = catalog().frames.find(frame => frame.kind === 'push' && frame.number === number);
    if (!archive || !push) throw new Error('No saved codebase is available for this push.');
    if (builds.has(number)) return builds.get(number);
    const pending = (async () => {
      const base = `${assetsPrefix}${number}/`;
      const cache = join(root, '.mitwerk-prototypes');
      const sourceDir = join(cache, `source-${number}`);
      const outDir = join(cache, `push-${number}`);
      mkdirSync(cache, { recursive: true });
      await rm(sourceDir, { recursive: true, force: true });
      // Archive names contain #, which Vite interprets as a URL fragment in CSS assets.
      // Stage a disposable copy under a URL-safe path, leaving the archive untouched.
      // Stage runtime source/assets without blocking the dev server on historical docs/captures.
      const excluded = new Set(['.git', '.cursor', '.githooks', 'node_modules', 'dist', 'archive', 'docs', 'tests', 'scripts', 'server', 'visual_ref', archiveDirectory, '[frame capture] screenshots']);
      await cp(archive, sourceDir, { recursive: true,
        filter: path => !excluded.has(relative(archive, path).split(sep)[0]),
      });
      const frozen = snapshotCatalog(catalog(), push);
      const git = history();
      const commits = (git.commits ?? []).filter(commit => commit.timestamp <= push.timestamp);
      const ids = new Set(commits.map(commit => commit.sha));
      const frozenHistory = { ...git, commits, branches: (git.branches ?? []).filter(branch => ids.has(branch.tip)),
        merges: (git.merges ?? []).filter(merge => ids.has(merge.sha)), head: commits.at(-1)?.sha ?? '', currentBranch: push.branch ?? 'main' };
      // Build source with our configuration. Never execute archived Vite configs, scripts, hooks or servers.
      await build({ root: sourceDir, configFile: false, envFile: false, publicDir: false, base, logLevel: 'error',
        plugins: [react(), { name: 'archived-prototype-data',
          transformIndexHtml: { order: 'post', handler: html => html.replace('<head>', `<head>${prototypeBootstrap(base)}`) },
          generateBundle() {
            this.emitFile({ type: 'asset', fileName: 'gallery/manifest.json', source: JSON.stringify(frozen) });
            this.emitFile({ type: 'asset', fileName: 'gallery/git-history.json', source: JSON.stringify(frozenHistory) });
          },
        }],
        build: { outDir, emptyOutDir: true, sourcemap: false },
      });
      ready.set(number, { outDir, images: new Set(frozen.frames.map(frame => frame.filename)), references: new Set((frozen.references ?? []).map(reference => reference.name)) });
      return { url: `${base}index.html`, number };
    })();
    builds.set(number, pending);
    try { return await pending; } catch (error) { builds.delete(number); throw error; }
  }
  async function middleware(req, res, next) {
    const pathname = new URL(req.url ?? '/', 'http://localhost:5173').pathname;
    const route = new RegExp(`^${prototypeApi}/([1-9]\\d*)$`).exec(pathname);
    if (route) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      const number = Number(route[1]);
      if (req.method === 'GET') {
        res.end(JSON.stringify({ available: !!findArchive(root, number) })); return;
      }
      if (req.method !== 'POST') { res.statusCode = 405; res.end('{}'); return; }
      try { res.end(JSON.stringify(await prepare(number))); }
      catch (error) { res.statusCode = 422; res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'The archived prototype could not be built.' })); }
      return;
    }
    if (!pathname.startsWith(assetsPrefix)) { next(); return; }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
    try {
      const match = /^([1-9]\d*)\/(.+)$/.exec(decodeURIComponent(pathname.slice(assetsPrefix.length)));
      const built = match && ready.get(Number(match[1]));
      if (!built) throw new Error('Not built');
      const relative = match[2];
      let path;
      if (relative.startsWith('gallery/images/')) {
        const name = relative.slice('gallery/images/'.length);
        if (!built.images.has(name) || name.includes('/') || name.includes('\\')) throw new Error('Unknown image');
        path = join(root, '[frame capture] screenshots', name);
      } else if (relative.startsWith('gallery/references/')) {
        const name = relative.slice('gallery/references/'.length);
        if (!built.references.has(name) || name.includes('/') || name.includes('\\')) throw new Error('Unknown reference');
        path = join(root, 'visual_ref', name);
      } else {
        path = resolve(built.outDir, relative);
        if (!realpathSync(path).startsWith(realpathSync(built.outDir) + sep)) throw new Error('Outside build');
      }
      const info = statSync(path);
      if (!info.isFile() || !mime[extname(path)]) throw new Error('Not an asset');
      res.setHeader('Content-Type', mime[extname(path)]);
      res.setHeader('Cache-Control', 'no-cache');
      if (extname(path) === '.html') {
        const source = `http://localhost:5173${assetsPrefix}${match[1]}/`;
        res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'unsafe-inline' ${source}; style-src 'unsafe-inline' ${source}; img-src data: blob: ${source}; font-src ${source}; connect-src ${source}; frame-src 'none'; form-action 'none'; base-uri 'none'; sandbox allow-scripts`);
      }
      res.setHeader('Content-Length', info.size);
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = createReadStream(path);
      stream.on('error', () => { res.destroy(); }); stream.pipe(res);
    } catch { res.statusCode = 404; res.end('Prototype asset not found'); }
  }
  return { prepare, middleware };
}

export function builtPrototypeData(root) {
  const read = file => { try { return JSON.parse(readFileSync(join(root, 'dist', 'gallery', file), 'utf8')); } catch { return {}; } };
  return { catalog: () => ({ frames: [], ...read('manifest.json') }), history: () => read('git-history.json') };
}
