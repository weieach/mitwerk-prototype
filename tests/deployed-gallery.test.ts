import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { createHandler } = createRequire(import.meta.url)('../server/deployed-gallery.cjs');

test('live catalog reader disables both browser and edge caching and rejects failed/empty catalogs', async () => {
  const original = globalThis.fetch;
  try {
    for (const [status, body, expected] of [[200, { frames: [{ id: 'new' }] }, 200], [200, { frames: [] }, 502], [503, {}, 502]] as const) {
      globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
      const headers = new Map();
      const res = { statusCode: 200, body: '', setHeader: (key, value) => headers.set(key, value), end(value) { this.body = value; } };
      await createHandler('https://example.com/catalog')({}, res);
      assert.equal(res.statusCode, expected);
      assert.equal(headers.get('Cache-Control'), 'no-store');
      assert.equal(headers.get('Vercel-CDN-Cache-Control'), 'no-store');
      if (expected === 200) assert.deepEqual(JSON.parse(res.body), body);
    }
  } finally { globalThis.fetch = original; }
});
