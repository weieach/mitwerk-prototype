// The hosted server: serves the built front end and the same API handler that
// runs under `vite dev`.
//
//   npm run build && npm start
//
// This is what makes the app deployable. Nothing here is Vite-specific, so it
// runs anywhere Node runs.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';
import { handleApi } from './api.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, '..', 'dist');
const PORT = Number(process.env.PORT ?? 5173);

try {
  process.loadEnvFile(join(here, '..', '.env.local'));
} catch {
  // In real hosting the environment supplies these directly.
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  // normalize + the prefix check below keep '../' out of the served path.
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(DIST, requested);

  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    // Unknown path: hand back index.html so client-side routing works.
    filePath = join(DIST, 'index.html');
  }

  try {
    const body = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[extname(filePath)] ?? 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}

createServer(async (req, res) => {
  const handled = await handleApi(req, res);
  if (!handled) await serveStatic(req, res);
}).listen(PORT, () => {
  console.log('Mitwerk listening on http://localhost:' + PORT);
});
