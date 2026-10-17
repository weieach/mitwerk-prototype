import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Writable } from 'node:stream';
import { archiveDirectory, findArchive, createPrototypeService, prototypeBootstrap } from '../server/prototype-service.mjs';
import { runInNewContext } from 'node:vm';

test('archive service maps push numbers, bypasses archived hooks, freezes data, and confines assets', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mitwerk-prototype-test-'));
  try {
    const archive = join(root, archiveDirectory, '[push #7] historical code-2026-09-24-120000');
    mkdirSync(join(archive, 'src'), { recursive: true });
    writeFileSync(join(archive, 'package.json'), '{"type":"module"}');
    writeFileSync(join(archive, 'vite.config.js'), 'throw new Error("Archived config must never run")');
    writeFileSync(join(archive, 'index.html'), '<html><head></head><body><button>Old prototype</button><script type="module" src="/src/main.js"></script></body></html>');
    writeFileSync(join(archive, 'src/main.js'), 'document.querySelector("button").onclick=()=>document.body.dataset.clicked="yes";');
    assert.equal(findArchive(root, 7), archive);
    assert.equal(findArchive(root, 8), null);
    assert.equal(findArchive(root, -1), null);
    mkdirSync(join(root, 'visual_ref'));
    writeFileSync(join(root, 'visual_ref', 'reference.png'), 'reference-image');
    const before = readFileSync(join(archive, 'index.html'), 'utf8');
    const service = createPrototypeService(root, { catalog: () => ({ frames: [
      { id: 'old', kind: 'prompt', timestamp: 1, filename: 'old.png' },
      { id: 'push', kind: 'push', number: 7, timestamp: 2, filename: 'push.png' },
      { id: 'future', kind: 'prompt', timestamp: 3, filename: 'future.png' },
    ], references: [{ name: 'reference.png', prompt: 1 }] }), history: () => ({ commits: [], branches: [], merges: [] }) });
    const [a, b] = await Promise.all([service.prepare(7), service.prepare(7)]);
    assert.deepEqual(a, b);
    const out = join(root, '.mitwerk-prototypes/push-7');
    assert.deepEqual(JSON.parse(readFileSync(join(out, 'gallery/manifest.json'), 'utf8')).frames.map((frame: {id: string}) => frame.id), ['old', 'push']);
    assert.equal(readFileSync(join(archive, 'index.html'), 'utf8'), before);
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
