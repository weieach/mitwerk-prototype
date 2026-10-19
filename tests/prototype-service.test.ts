import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Writable } from 'node:stream';
import { execFileSync } from 'node:child_process';
import { pushShaFile, findPushSha, pushAvailable, createPrototypeService, prototypeBootstrap } from '../server/prototype-service.mjs';
import { runInNewContext } from 'node:vm';

test('push service builds the recorded commit on demand, bypasses archived hooks, freezes data, and confines assets', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mitwerk-prototype-test-'));
  try {
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    git('init', '-q'); git('config', 'user.email', 'test@example.com'); git('config', 'user.name', 'Test');
    mkdirSync(join(root, 'src'), { recursive: true }); mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(join(root, 'vite.config.js'), 'throw new Error("Archived config must never run")');
    writeFileSync(join(root, 'index.html'), '<html><head></head><body><button>Old prototype</button><script type="module" src="/src/main.js"></script></body></html>');
    writeFileSync(join(root, 'src/main.js'), 'document.querySelector("button").onclick=()=>document.body.dataset.clicked="yes";');
    writeFileSync(join(root, 'docs/notes.md'), 'historical docs');
    git('add', '-A'); git('commit', '-qm', 'historical code');
    const sha = git('rev-parse', 'HEAD');
    // Later work must not leak into the pushed snapshot.
    writeFileSync(join(root, 'src/main.js'), 'throw new Error("Working tree must not be built")');
    mkdirSync(join(root, 'data'), { recursive: true });
    writeFileSync(join(root, pushShaFile), JSON.stringify({ 7: sha, 8: 'not-a-sha', 9: 'f'.repeat(40) }));
    assert.equal(findPushSha(root, 7), sha);
    assert.equal(findPushSha(root, 8), null);
    assert.equal(findPushSha(root, 10), null);
    assert.equal(findPushSha(root, -1), null);
    assert.equal(await pushAvailable(root, 7), true);
    const token = process.env.GITHUB_TOKEN; delete process.env.GITHUB_TOKEN;
    try { assert.equal(await pushAvailable(root, 9), false); } finally { if (token !== undefined) process.env.GITHUB_TOKEN = token; }
    mkdirSync(join(root, 'visual_ref/annotation'), {recursive:true});
    const annotationName = 'annotation/[prompt #1] [annotation] Marked.png';
    writeFileSync(join(root, 'visual_ref', annotationName), 'annotated-image');
    writeFileSync(join(root, 'visual_ref', 'reference.png'), 'reference-image');
    const service = createPrototypeService(root, { catalog: () => ({ frames: [
      { id: 'old', kind: 'prompt', timestamp: 1, filename: 'old.png' },
      { id: 'push', kind: 'push', number: 7, timestamp: 2, filename: 'push.png' },
      { id: 'future', kind: 'prompt', timestamp: 3, filename: 'future.png' },
    ], references: [{ name: 'reference.png', prompt: 1 }, { name: annotationName, prompt: 1 }] }), history: () => ({ commits: [], branches: [], merges: [] }) });
    const [a, b] = await Promise.all([service.prepare(7), service.prepare(7)]);
    assert.deepEqual(a, b);
    const out = join(root, '.mitwerk-prototypes/push-7');
    assert.deepEqual(JSON.parse(readFileSync(join(out, 'gallery/manifest.json'), 'utf8')).frames.map((frame: {id: string}) => frame.id), ['old', 'push']);
    assert.equal(readFileSync(join(root, 'src/main.js'), 'utf8'), 'throw new Error("Working tree must not be built")');
    assert.equal(existsSync(join(root, '.mitwerk-prototypes/source-7/docs')), false);
    const bundle = readdirSync(join(out, 'assets')).filter(name => name.endsWith('.js')).map(name => readFileSync(join(out, 'assets', name), 'utf8')).join('');
    assert.ok(bundle.includes('clicked') && !bundle.includes('Working tree must not be built'));
    assert.equal(git('status', '--porcelain', '--', 'index.html', 'package.json'), '');
    assert.ok(readFileSync(join(out, 'index.html'), 'utf8').includes('localStorage'));
    await assert.rejects(service.prepare(99), /No saved codebase/);
    const request = async (url: string, method = 'GET') => {
      let body = ''; const headers: Record<string, string> = {};
      const response = Object.assign(new Writable({ write(chunk, _encoding, done) { body += chunk; done(); } }), {
        statusCode: 200, setHeader(key: string, value: string) { headers[key] = value; },
      });
      const ended = new Promise<void>(resolve => response.on('finish', resolve));
      await service.middleware({ url, method }, response, () => { response.statusCode = 599; response.end(); });
      await ended; return { status: response.statusCode, body, headers };
    };
    assert.equal((await request('/__mitwerk/prototype-assets/7/%2e%2e%2fsource-7/package.json')).status, 404);
    assert.equal((await request('/__mitwerk/prototype-assets/7/gallery/images/future.png')).status, 404);
    assert.equal((await request('/__mitwerk/prototype-assets/7/index.html', 'POST')).status, 405);
    assert.equal((await request('/__mitwerk/prototype-assets/7/gallery/references/reference.png')).body, 'reference-image');
    assert.equal((await request('/__mitwerk/prototype-assets/7/gallery/references/unknown.png')).status, 404);
    assert.equal((await request(`/__mitwerk/prototype-assets/7/gallery/references/${encodeURIComponent(annotationName)}`)).body, 'annotated-image');
    const page = await request(a.url);
    assert.equal(page.status, 200);
    assert.ok(page.headers['Content-Security-Policy'].includes('sandbox allow-scripts'));
    assert.equal(page.headers['Access-Control-Allow-Origin'], '*');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('embedded storage is ephemeral and fetch cannot access the current graph or external services', async () => {
  const calls: string[] = [];
  const window: Record<string, any> = { fetch: async (url: URL) => { calls.push(url.href); return new Response('{}'); } };
  const bootstrap = prototypeBootstrap('/__mitwerk/prototype-assets/7/').replace(/^<script>|<\/script>$/g, '');
  runInNewContext(bootstrap, { window, URL, Response, location: new URL('http://localhost:5173/__mitwerk/prototype-assets/7/index.html') });
  window.localStorage.setItem('graph', 'test'); assert.equal(window.localStorage.getItem('graph'), 'test');
  assert.equal(window.sessionStorage.getItem('graph'), null);
  await window.fetch('/__mitwerk/graph', { method: 'POST', body: '{}' }); assert.equal(calls.length, 0);
  await assert.rejects(window.fetch('https://example.com/'), /only accesses/);
  await assert.rejects(window.fetch('/__mitwerk/prototypes/8'), /only accesses/);
  await window.fetch('/gallery/manifest.json'); assert.equal(calls[0], 'http://localhost:5173/__mitwerk/prototype-assets/7/gallery/manifest.json');
});

test('archived fetch accepts URL objects as well as string paths', async () => {
  const calls: string[] = [];
  const window: Record<string, any> = { fetch: async (url: URL) => { calls.push(url.href); return new Response('{}'); } };
  runInNewContext(prototypeBootstrap('/__mitwerk/prototype-assets/7/').replace(/^<script>|<\/script>$/g, ''),
    { window, URL, Response, location: new URL('http://localhost:5173/__mitwerk/prototype-assets/7/index.html') });
  await window.fetch(new URL('http://localhost:5173/gallery/manifest.json'));
  assert.equal(calls[0], 'http://localhost:5173/__mitwerk/prototype-assets/7/gallery/manifest.json');
});


test('archived date filters use the push timestamp while explicit dates and date parsing remain intact', () => {
  const timestamp = Date.parse('2026-09-24T12:00:00Z');
  const window: Record<string, any> = { fetch: async () => new Response('{}') };
  runInNewContext(prototypeBootstrap('/__mitwerk/prototype-assets/18/', timestamp).replace(/^<script>|<\/script>$/g, ''),
    { window, URL, Response, location: new URL('https://example.com/__mitwerk/prototype-assets/18/index.html') });
  assert.equal(window.Date.now(), timestamp);
  assert.equal(new window.Date().getTime(), timestamp);
  assert.equal(new window.Date(0).getTime(), 0);
  assert.equal(window.Date.parse('2026-09-24T12:00:00Z'), timestamp);
  assert.equal(window.Date.UTC(1970, 0, 1), 0);
  assert.equal(typeof window.Date(), 'string');
});

test('push names use the full commit message without trailing Git trailers', async () => {
  const { commitMessageText } = await import('../server/git-history.ts');
  assert.equal(commitMessageText('Playback timeline: brighter border;\nliver server scaled\n\nCo-Authored-By: Someone <a@b.c>\n'), 'Playback timeline: brighter border;\nliver server scaled');
  assert.equal(commitMessageText('Fix: keep the colon in a one-paragraph subject'), 'Fix: keep the colon in a one-paragraph subject');
  assert.equal(commitMessageText('Title\n\nBody paragraph.\n\nSigned-off-by: A <a@b.c>\nCo-Authored-By: B <b@c.d>'), 'Title\n\nBody paragraph.');
});

test('a partial cloud checkout builds public saved commits without a GitHub token', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mitwerk-public-archive-'));
  const previousToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['remote', 'add', 'origin', 'https://github.com/example/prototype.git'], { cwd: root });
    const sha = 'a'.repeat(40);
    mkdirSync(join(root, 'data'));
    writeFileSync(join(root, pushShaFile), JSON.stringify({ 18: sha }));
    const archiveRoot = join(root, 'fixture');
    mkdirSync(join(archiveRoot, 'repo/src'), { recursive: true });
    writeFileSync(join(archiveRoot, 'repo/package.json'), '{"type":"module"}');
    writeFileSync(join(archiveRoot, 'repo/index.html'), '<html><head></head><body><script type="module" src="/src/main.js"></script></body></html>');
    writeFileSync(join(archiveRoot, 'repo/src/main.js'), 'document.body.textContent="Exact public archive";');
    const archive = execFileSync('tar', ['-czf', '-', 'repo'], { cwd: archiveRoot });
    const calls: {url:string; authorization:string|null}[] = [];
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      calls.push({url:String(url),authorization:new Headers(init.headers).get('Authorization')});
      return String(url).includes('/git/commits/') ? new Response('{}', {status:200}) : new Response(archive);
    });
    assert.equal(await pushAvailable(root, 18), true);
    const service = createPrototypeService(root, { catalog: () => ({frames:[{kind:'push', number:18, timestamp:1}]}), history: () => ({commits:[],branches:[],merges:[]}) });
    assert.deepEqual(await service.prepare(18), {url:'/__mitwerk/prototype-assets/18/index.html',number:18});
    assert.equal(calls[1].url, `https://codeload.github.com/example/prototype/tar.gz/${sha}`);
    assert.ok(calls.every(call => call.authorization === null));
    const assets = join(root, '.mitwerk-prototypes/push-18/assets');
    assert.ok(readdirSync(assets).some(name => readFileSync(join(assets,name),'utf8').includes('Exact public archive')));
    assert.equal(existsSync(join(root,'src/main.js')), false);
    process.env.GITHUB_TOKEN = 'test-token';
    assert.equal(await pushAvailable(root, 18), true);
    assert.equal(calls.at(-1)?.authorization, 'Bearer test-token');
    const privateService = createPrototypeService(root, { catalog: () => ({frames:[{kind:'push',number:18,timestamp:1}]}), history: () => ({commits:[],branches:[],merges:[]}) });
    await privateService.prepare(18);
    assert.equal(calls.at(-1)?.url, `https://api.github.com/repos/example/prototype/tarball/${sha}`);
    assert.equal(calls.at(-1)?.authorization, 'Bearer test-token');
    t.mock.method(globalThis, 'fetch', async () => new Response('Not found', {status:404}));
    assert.equal(await pushAvailable(root, 18), false);
    const unavailable = createPrototypeService(root, { catalog: () => ({frames:[{kind:'push',number:18,timestamp:1}]}), history: () => ({commits:[],branches:[],merges:[]}) });
    await assert.rejects(unavailable.prepare(18), /GitHub returned 404/);
  } finally {
    if (previousToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = previousToken;
    rmSync(root, {recursive:true,force:true});
  }
});
