import { readGitHistory } from './git-history.ts';
import { closeSync, createReadStream, existsSync, openSync, readFileSync, readdirSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { parseCaptureName } from '../src/features/iteration-gallery/model.ts';

export const captureDirectory = '[frame capture] screenshots';
const manifestPath = '/gallery/manifest.json';
const imagesPath = '/gallery/images/';

export function readCaptureCatalog(root: string) {
  const directory = join(root, captureDirectory);
  if (!existsSync(directory)) return { frames: [], ignored: 0 };
  let ignored = 0;
  const frames = readdirSync(directory).flatMap(filename => {
    if (!filename.toLowerCase().endsWith('.png')) return [];
    const metadata = parseCaptureName(filename);
    if (!metadata) { ignored++; return []; }
    try {
      const file = openSync(join(directory, filename), 'r');
      const bytes = Buffer.alloc(24);
      let read = 0;
      try { read = readSync(file, bytes, 0, bytes.length, 0); } finally { closeSync(file); }
      if (read < 24 || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.readUInt32BE(4) !== 0x0d0a1a0a || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG');
      const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
      if (!width || !height) throw new Error('Empty image');
      return [{ ...metadata, id: filename, filename, width, height, url: `gallery/images/${encodeURIComponent(filename)}` }];
    } catch { ignored++; return []; }
  });
  return { frames, ignored };
}

/** Same folder-driven catalog in development and in the static production build. */
export function iterationGalleryCatalog(): Plugin {
  let root = '';
  let cached: ReturnType<typeof readCaptureCatalog> | null = null;
  return {
    name: 'iteration-gallery-catalog',
    configResolved(config) { root = config.root; },
    configureServer(server) {
      const directory = join(root, captureDirectory);
      server.watcher.add(directory);
      const invalidate = (path: string) => { if (path.startsWith(directory)) cached = null; };
      server.watcher.on('all', (_event, path) => invalidate(path));
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost:5173').pathname;
        if (pathname === '/gallery/git-history.json') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(JSON.stringify(readGitHistory(root)));
        } else if (pathname === manifestPath) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          cached ??= readCaptureCatalog(root);
          res.end(JSON.stringify(cached));
        } else if (pathname.startsWith(imagesPath)) {
          let filename: string;
          try { filename = decodeURIComponent(pathname.slice(imagesPath.length)); }
          catch { res.statusCode = 400; res.end(); return; }
          if (filename.includes('/') || filename.includes('\\') || !parseCaptureName(filename)) {
            res.statusCode = 404; res.end(); return;
          }
          const path = join(directory, filename);
          if (!existsSync(path)) { res.statusCode = 404; res.end(); return; }
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=60');
          res.setHeader('Content-Length', statSync(path).size);
          const stream = createReadStream(path);
          stream.on('error', () => { if (!res.headersSent) res.statusCode = 404; res.end(); });
          stream.pipe(res);
        } else next();
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'gallery/git-history.json', source: JSON.stringify(readGitHistory(root)) });
      const catalog = readCaptureCatalog(root);
      this.emitFile({ type: 'asset', fileName: 'gallery/manifest.json', source: JSON.stringify(catalog) });
      for (const frame of catalog.frames) this.emitFile({ type: 'asset', fileName: `gallery/images/${frame.filename}`,
        source: readFileSync(join(root, captureDirectory, frame.filename)) });
    },
  };
}
