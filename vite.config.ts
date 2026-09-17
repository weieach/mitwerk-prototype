import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const GRAPH_KEY = 'mitwerk.version-tree.graph';
const GRAPH_PATH = '/__mitwerk/graph';

function isGraphSnapshot(value: unknown): value is { nodes: unknown[] } {
  return Boolean(value) && typeof value === 'object' && Array.isArray((value as { nodes?: unknown }).nodes)
    && (value as { nodes: unknown[] }).nodes.length > 0;
}

function readBody(req: { on: (event: string, fn: (chunk?: Buffer) => void) => void }) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => { chunks.push(chunk as Buffer); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Mirror the in-browser graph to disk so headless screenshots see saved nodes. */
function mitwerkGraphPersist(): Plugin {
  const graphFile = join(process.cwd(), '.mitwerk-graph.json');
  return {
    name: 'mitwerk-graph-persist',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== GRAPH_PATH) {
          next();
          return;
        }
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(existsSync(graphFile) ? readFileSync(graphFile, 'utf8') : 'null');
          return;
        }
        if (req.method === 'POST') {
          try {
            const raw = await readBody(req);
            const parsed = JSON.parse(raw) as unknown;
            if (!isGraphSnapshot(parsed)) {
              res.statusCode = 400;
              res.end('invalid graph');
              return;
            }
            writeFileSync(graphFile, `${JSON.stringify(parsed, null, 2)}\n`);
            res.statusCode = 204;
            res.end();
          } catch {
            res.statusCode = 400;
            res.end('invalid graph');
          }
          return;
        }
        next();
      });
    },
    transformIndexHtml(html) {
      if (!existsSync(graphFile)) return html;
      try {
        const parsed = JSON.parse(readFileSync(graphFile, 'utf8')) as unknown;
        if (!isGraphSnapshot(parsed)) return html;
        const payload = JSON.stringify(JSON.stringify(parsed)).replaceAll('<', '\\u003c');
        const script = `<script>try{var k=${JSON.stringify(GRAPH_KEY)};if(!localStorage.getItem(k))localStorage.setItem(k,${payload});}catch(e){}</script>`;
        return html.replace('<head>', `<head>${script}`);
      } catch {
        return html;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), mitwerkGraphPersist()],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});

