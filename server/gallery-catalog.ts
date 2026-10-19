import { visualReferencePrompt } from '../src/shared/visual-reference-path.mjs';
import { parsePromptLog } from '../src/shared/prompt-log.mjs';
import { readTokenUsage } from './token-usage.ts';
import { readGitHistory, readPushMessages } from './git-history.ts';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { captureImageInfo } from './capture-image.mjs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { parseCaptureName } from '../src/features/iteration-gallery/model.ts';

export const captureDirectory = '[frame capture] screenshots';
export const visualReferenceDirectory = 'visual_ref';
const manifestPath = '/gallery/manifest.json';
const imagesPath = '/gallery/images/';
const referencesPath = '/gallery/references/';

export function readCaptureCatalog(root: string) {
  const directory = join(root, captureDirectory);
  if (!existsSync(directory)) return { frames: [], ignored: 0, references: readVisualReferences(root) };
  const promptFile = join(root, 'docs/prompt-log.md');
  const prompts = parsePromptLog(existsSync(promptFile) ? readFileSync(promptFile, 'utf8') : '');
  // A capture is published only after the capture process records its successful
  // completion. A logged prompt or a PNG being written is not a finished frame.
  const instructions = join(root, 'AGENTS.md');
  const completedPrompt = existsSync(instructions)
    ? /Progress counters[^\n]*push #\d+\s*·\s*prompt #(\d+)/.exec(readFileSync(instructions, 'utf8'))?.[1]
    : undefined;
  let ignored = 0;
  const frames = readdirSync(directory).flatMap(filename => {
    if (!filename.toLowerCase().endsWith('.png')) return [];
    const metadata = parseCaptureName(filename);
    if (!metadata) { ignored++; return []; }
    if (metadata.kind === 'prompt' && completedPrompt !== undefined && metadata.number !== null
      && metadata.number > Number(completedPrompt)) return [];
    try {
      const image = captureImageInfo(join(directory, filename));
      return [{ ...metadata, fullPrompt: metadata.kind === 'prompt' ? prompts.get(metadata.number) : undefined, commitMessage: undefined as string | undefined, id: filename, filename, ...image, url: `gallery/images/${encodeURIComponent(filename)}` }];
    } catch { ignored++; return []; }
  });
  // Push names come from their Git commits, not the length-limited capture filename.
  const pushMessages = readPushMessages(root, frames.flatMap(frame => frame.kind === 'push' && frame.number !== null ? [{ number: frame.number, summary: frame.summary, timestamp: frame.timestamp }] : []));
  for (const frame of frames) if (frame.kind === 'push' && frame.number !== null) frame.commitMessage = pushMessages.get(frame.number);
  const usage = readTokenUsage(root, frames.map(frame => frame.id));
  return { frames: frames.map(frame => ({ ...frame, tokenUsage: usage[frame.id] })), ignored, references: readVisualReferences(root) };
}

export type VisualReference = { name: string; url: string; prompt: number };

/** Only visual_ref files marked with a prompt number are planning references. */
export function readVisualReferences(root: string): VisualReference[] {
  const directory = join(root, visualReferenceDirectory);
  if (!existsSync(directory)) return [];
  const names = readdirSync(directory).filter(name => statSync(join(directory, name)).isFile());
  const annotations = join(directory, 'annotation');
  if (existsSync(annotations)) names.push(...readdirSync(annotations).filter(name => statSync(join(annotations, name)).isFile()).map(name => `annotation/${name}`));
  return names.flatMap(name => {
    const prompt = visualReferencePrompt(name);
    if (prompt === null) return [];
    return [{ name, prompt, url: `gallery/references/${name.split('/').map(encodeURIComponent).join('/')}` }];
  });
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
      const promptFile = join(root, 'docs/prompt-log.md');
      const instructions = join(root, 'AGENTS.md');
      const referenceDirectory = join(root, visualReferenceDirectory);
      server.watcher.add([directory, promptFile, referenceDirectory, instructions]);
      const invalidate = (path: string) => { if (path.startsWith(directory) || path.startsWith(referenceDirectory) || path === promptFile || path === instructions) cached = null; };
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
          try { res.setHeader('Content-Type', captureImageInfo(path).mimeType); }
          catch { res.statusCode = 404; res.end(); return; }
          res.setHeader('Cache-Control', 'public, max-age=60');
          res.setHeader('Content-Length', statSync(path).size);
          const stream = createReadStream(path);
          stream.on('error', () => { if (!res.headersSent) res.statusCode = 404; res.end(); });
          stream.pipe(res);
        } else if (pathname.startsWith(referencesPath)) {
          let filename: string;
          try { filename = decodeURIComponent(pathname.slice(referencesPath.length)); }
          catch { res.statusCode = 400; res.end(); return; }
          if (visualReferencePrompt(filename) === null) {
            res.statusCode = 404; res.end(); return;
          }
          const path = join(root, visualReferenceDirectory, filename);
          if (!existsSync(path)) { res.statusCode = 404; res.end(); return; }
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Content-Length', statSync(path).size);
          const stream = createReadStream(path);
          stream.on('error', () => { if (!res.headersSent) res.statusCode = 404; res.end(); });
          stream.pipe(res);
        } else next();
      });
    },
    async generateBundle() {
      const useBlob = process.env.VERCEL === '1' || process.env.MITWERK_GALLERY_SOURCE === 'blob';
      let catalog = readCaptureCatalog(root);
      if (useBlob) {
        const storage = JSON.parse(readFileSync(join(root, 'data/blob-storage.json'), 'utf8'));
        const response = await fetch(storage.manifestUrl, { signal: AbortSignal.timeout(60_000), cache: 'no-store' });
        if (!response.ok) this.error(`Saved-frame catalog returned HTTP ${response.status}`);
        catalog = await response.json();
        if (!Array.isArray(catalog.frames) || !Array.isArray(catalog.references)) this.error('Invalid Blob gallery catalog');
      }
      if (!catalog.frames.length) this.error('No saved frames found. Capture images are stored in Git LFS: run git lfs pull (they may still be pointer files), or build with MITWERK_GALLERY_SOURCE=blob.');
      this.emitFile({ type: 'asset', fileName: 'gallery/git-history.json', source: JSON.stringify(readGitHistory(root)) });
      this.emitFile({ type: 'asset', fileName: 'gallery/manifest.json', source: JSON.stringify(catalog) });
      if (useBlob) return; // Vercel routes serve immutable image objects from Blob.
      for (const frame of catalog.frames) this.emitFile({ type: 'asset', fileName: `gallery/images/${frame.filename}`,
        source: readFileSync(join(root, captureDirectory, frame.filename)) });
      for (const reference of catalog.references) this.emitFile({ type: 'asset', fileName: `gallery/references/${reference.name}`,
        source: readFileSync(join(root, visualReferenceDirectory, reference.name)) });
    },
  };
}
