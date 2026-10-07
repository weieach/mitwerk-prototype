import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../server/deployed-prototypes.cjs';

test('deployed prototypes expose only prepared archives without a runtime build', () => {
  const prototype = { number: 18, url: '/__mitwerk/prototype-assets/18/index.html' };
  const handler = createHandler({ 18: prototype });
  const request = (url: string, method = 'GET') => {
    const headers: Record<string, string> = {};
    const result = { statusCode: 200, body: '', headers,
      setHeader(key: string, value: string) { headers[key] = value; },
      end(body: string) { result.body = body; },
    };
    handler({ url, method }, result);
    return result;
  };
  assert.deepEqual(JSON.parse(request('/__mitwerk/prototypes/18').body), { available: true });
  assert.deepEqual(JSON.parse(request('/__mitwerk/prototypes/18', 'POST').body), prototype);
  assert.deepEqual(JSON.parse(request('/__mitwerk/prototypes/1').body), { available: false });
  assert.equal(request('/__mitwerk/prototypes/1', 'POST').statusCode, 422);
  assert.equal(request('/__mitwerk/prototypes/18', 'DELETE').statusCode, 405);
  assert.equal(request('/__mitwerk/prototypes/../../secrets').statusCode, 404);
});
