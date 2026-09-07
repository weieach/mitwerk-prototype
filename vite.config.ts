import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// @ts-expect-error — plain-JS server module, deliberately untyped
import { handleApi } from './server/api.mjs';

/**
 * Mounts the API on Vite's dev server.
 *
 * The Figma call has to run in Node so tokens never reach the browser. Keeping
 * it here means one `npm run dev`, no second process and no CORS — and because
 * the handler itself lives in server/api.mjs, the same code runs unchanged
 * behind the standalone server used for hosting (`npm start`).
 */
function api() {
  return {
    name: 'mitwerk-api',
    configureServer(server: any) {
      // Load .env.local into process.env so the Figma credentials are visible
      // to the server half. Vite's own loadEnv only exposes VITE_-prefixed vars
      // to the client, which is not what we want for secrets.
      try {
        process.loadEnvFile('.env.local');
      } catch {
        // Fine — the app reports missing configuration itself.
      }

      server.middlewares.use((req: any, res: any, next: any) => {
        handleApi(req, res).then((handled: boolean) => {
          if (!handled) next();
        }, next);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), api()],
});
