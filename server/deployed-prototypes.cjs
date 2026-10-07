/** Read-only counterpart to the local archive builder: builds are prepared before upload. */
exports.createHandler = function createHandler(prototypes) {
  return function handler(req, res) {
    const path = new URL(req.url, 'http://localhost').pathname;
    const number = /^\/__mitwerk\/prototypes\/([1-9]\d*)$/.exec(path)?.[1];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (!number) { res.statusCode = 404; res.end('{}'); return; }
    const prototype = prototypes[number];
    if (req.method === 'GET') {
      res.end(JSON.stringify({ available: Boolean(prototype) })); return;
    }
    if (req.method !== 'POST') {
      res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); res.end('{}'); return;
    }
    if (!prototype) {
      res.statusCode = 422;
      res.end(JSON.stringify({ error: 'No saved codebase is available for this push.' })); return;
    }
    res.end(JSON.stringify(prototype));
  };
};
