import { spawn } from 'node:child_process';
import { existsSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { iterationGalleryCatalog } from './server/gallery-catalog.ts';

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

/**
 * Cursor's Source Control panel sets core.hooksPath=/dev/null, so pre-push never
 * runs there. Watch the remote-tracking ref and capture after a UI push lands.
 */
function mitwerkPushCapture(): Plugin {
  return {
    name: 'mitwerk-push-capture',
    apply: 'serve',
    configureServer() {
      const root = process.cwd();
      const script = join(root, 'scripts/screenshot-progress.mjs');
      const originDir = join(root, '.git/refs/remotes/origin');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const kick = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (process.env.MITWERK_SCREENSHOT_SKIP === '1') return;
          const child = spawn(process.execPath, [script, '--reconcile-push', '--commit-and-push'], {
            cwd: root,
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
        }, 800);
      };
      if (existsSync(originDir)) {
        try {
          watch(originDir, { persistent: false }, kick);
        } catch {
          // packed-refs only; startup pass still covers a just-finished push
        }
      }
      setTimeout(kick, 2000);
    },
  };
}

export default defineConfig({
  plugins: [react(), mitwerkGraphPersist(), mitwerkPushCapture(), iterationGalleryCatalog()],
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: (path: string) => path.includes('/[ver capture] codebase') },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
