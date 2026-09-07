import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// @ts-expect-error — plain-JS server module, deliberately untyped
import { annotateFrame } from './server/annotate.mjs';

/**
 * The "backend" for this MVP.
 *
 * The MCP client has to run in Node (the OAuth token must never reach the
 * browser, and MCP needs POST + session handling), so this plugin mounts one
 * endpoint on Vite's own dev server. That keeps it to a single `npm run dev`
 * with no second process and no CORS.
 *
 * Note: middleware only runs under `vite dev`, not in a static build. When this
 * needs deploying, the handler body lifts into a standalone Node server as-is.
 */
function annotationApi() {
  return {
    name: 'mitwerk-annotation-api',
    configureServer(server: any) {
      server.middlewares.use('/api/annotate', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk; });
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const { fileUrl, frameName } = JSON.parse(body || '{}');
            const result = await annotateFrame({ fileUrl, frameName });
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({
              ok: false,
              message: 'Server error.',
              detail: String(err?.message ?? err),
            }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), annotationApi()],
});
