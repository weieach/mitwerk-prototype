import { visualReferencePrompt } from '../src/shared/visual-reference-path.mjs';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile, spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';

export const pushShaFile = join('data', 'push-shas.json');
export const prototypeApi = '/__mitwerk/prototypes';
const assetsPrefix = '/__mitwerk/prototype-assets/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.otf': 'font/otf' };
// Top-level paths a historical prototype never needs at runtime.
const excludedPaths = new Set(['.cursor', '.githooks', 'node_modules', 'dist', 'archive', 'docs', 'tests', 'scripts', 'server', 'visual_ref']);
const execFileAsync = promisify(execFile);

/** Push numbers resolve to the exact commit recorded at push time. Never guess by version order. */
export function findPushSha(root, number) {
  if (!Number.isSafeInteger(number) || number < 1) return null;
  try {
    const sha = JSON.parse(readFileSync(join(root, pushShaFile), 'utf8'))[number];
    return typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha) ? sha : null;
  } catch { return null; }
}

function extractTar(source, dest, args = []) {
  return new Promise((done, fail) => {
    const tar = spawn('tar', ['-x', ...args, '-C', dest], { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    tar.stderr.on('data', chunk => { stderr += chunk; });
    tar.on('error', fail); source.on('error', fail);
    tar.on('close', code => code === 0 ? done() : fail(new Error(stderr.trim() || `tar exited with ${code}`)));
    source.pipe(tar.stdin);
  });
}

async function stageFromGit(root, sha, dest) {
  const { stdout } = await execFileAsync('git', ['ls-tree', '--name-only', sha], { cwd: root });
  const paths = stdout.split('\n').filter(name => name && !excludedPaths.has(name));
  const git = spawn('git', ['archive', '--format=tar', sha, '--', ...paths], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  git.stderr.on('data', chunk => { stderr += chunk; });
  const exited = new Promise((done, fail) => { git.on('error', fail); git.on('close', code => code === 0 ? done() : fail(new Error(stderr.trim() || `git archive failed for ${sha}`))); });
  await Promise.all([extractTar(git.stdout, dest), exited]);
}

async function githubRepository(root) {
  const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: root });
  const repo = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/i.exec(stdout.trim())?.[1];
  if (!repo) throw new Error('The origin remote is not a GitHub repository.');
  return repo;
}

/** Public archives need no token. Private repositories use the authenticated API. */
async function stageFromGithub(root, sha, dest) {
  const token = process.env.GITHUB_TOKEN;
  const repo = await githubRepository(root);
  const url = token ? `https://api.github.com/repos/${repo}/tarball/${sha}`
    : `https://codeload.github.com/${repo}/tar.gz/${sha}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } : {},
    signal: AbortSignal.timeout(60000) });
  if (!response.ok || !response.body) throw new Error(`GitHub returned ${response.status} for saved commit ${sha}. Check that the commit exists${token ? '.' : '; private repositories require GITHUB_TOKEN.'}`);
  await extractTar(Readable.fromWeb(response.body), dest, ['-z', '--strip-components=1']);
  await Promise.all([...excludedPaths].map(name => rm(join(dest, name), { recursive: true, force: true })));
}

const hasLocalCommit = (root, sha) => execFileAsync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root }).then(() => true, () => false);

/** A push can be entered when its exact commit is local or available from GitHub. */
export async function pushAvailable(root, number) {
  const sha = findPushSha(root, number);
  if (!sha) return false;
  if (await hasLocalCommit(root, sha)) return true;
  try {
    const repo = await githubRepository(root);
    const token = process.env.GITHUB_TOKEN;
    const response = await fetch(`https://api.github.com/repos/${repo}/git/commits/${sha}`, {
      headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(15000),
    });
    await response.body?.cancel();
    return response.ok;
  } catch { return false; }
}

/** Materialize a pushed tree on demand: local Git objects first, GitHub second. */
export async function stagePushSource(root, sha, dest) {
  await rm(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  await (await hasLocalCommit(root, sha) ? stageFromGit(root, sha, dest) : stageFromGithub(root, sha, dest));
  if (!existsSync(join(dest, 'index.html')) || !existsSync(join(dest, 'package.json'))) throw new Error('This push has no buildable prototype.');
}

/** A sandboxed archive gets ephemeral storage and access only to its frozen, read-only assets. */
export function prototypeBootstrap(base, timestamp) {
  // Historical date filters should see the snapshot date, not the deployment/viewing date.
  const clock = Number.isFinite(timestamp) ? `const NativeDate=Date;const snapshotTime=${JSON.stringify(timestamp)};function SnapshotDate(...args){if(!new.target)return new NativeDate(snapshotTime).toString();return Reflect.construct(NativeDate,args.length?args:[snapshotTime],new.target)}Object.setPrototypeOf(SnapshotDate,NativeDate);SnapshotDate.prototype=NativeDate.prototype;SnapshotDate.now=()=>snapshotTime;window.Date=SnapshotDate;` : '';
  return `<script>(()=>{${clock}const base=${JSON.stringify(base)};const memory=()=>{const data=new Map();return {getItem:k=>data.get(String(k))??null,setItem:(k,v)=>data.set(String(k),String(v)),removeItem:k=>data.delete(String(k)),clear:()=>data.clear(),key:i=>[...data.keys()][i]??null,get length(){return data.size}}};for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{value:memory()});const request=window.fetch.bind(window);window.fetch=(input,init)=>{let url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);if(url.pathname.startsWith('/__mitwerk/graph'))return Promise.resolve(new Response('null',{headers:{'Content-Type':'application/json'}}));if(url.pathname.startsWith('/gallery/'))url=new URL(base+url.pathname.slice(1),location.origin);if(url.origin!==location.origin||!url.pathname.startsWith(base))return Promise.reject(new Error('This archived prototype only accesses its saved assets.'));return request(url,{...init,credentials:'omit'});};})();</script>`;
}

export function snapshotCatalog(catalog, push) {
  return { ...catalog, frames: catalog.frames.filter(frame => frame.timestamp <= push.timestamp) };
}

export function createPrototypeService(root, { catalog, history }) {
  const builds = new Map();
  const ready = new Map();
  async function prepare(number) {
    const sha = findPushSha(root, number);
    const push = catalog().frames.find(frame => frame.kind === 'push' && frame.number === number);
    if (!sha || !push) throw new Error('No saved codebase is available for this push.');
    if (builds.has(number)) return builds.get(number);
    const pending = (async () => {
      const base = `${assetsPrefix}${number}/`;
      const cache = join(root, '.mitwerk-prototypes');
      const sourceDir = join(cache, `source-${number}`);
      const outDir = join(cache, `push-${number}`);
      mkdirSync(cache, { recursive: true });
      // Stage under a URL-safe, disposable path; the pushed commit itself is never modified.
      await stagePushSource(root, sha, sourceDir);
      const frozen = snapshotCatalog(catalog(), push);
      const git = history();
      const commits = (git.commits ?? []).filter(commit => commit.timestamp <= push.timestamp);
      const ids = new Set(commits.map(commit => commit.sha));
      const frozenHistory = { ...git, commits, branches: (git.branches ?? []).filter(branch => ids.has(branch.tip)),
        merges: (git.merges ?? []).filter(merge => ids.has(merge.sha)), head: commits.at(-1)?.sha ?? '', currentBranch: push.branch ?? 'main' };
      // Build source with our configuration. Never execute archived Vite configs, scripts, hooks or servers.
      await build({ root: sourceDir, configFile: false, envFile: false, publicDir: false, base, logLevel: 'error',
        plugins: [react(), { name: 'archived-prototype-data',
          transformIndexHtml: { order: 'post', handler: html => html.replace('<head>', `<head>${prototypeBootstrap(base, push.timestamp)}`) },
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
        res.end(JSON.stringify({ available: await pushAvailable(root, number) })); return;
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
        if (!built.references.has(name) || (name.includes('\\') || (name.includes('/') && visualReferencePrompt(name) === null))) throw new Error('Unknown reference');
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
