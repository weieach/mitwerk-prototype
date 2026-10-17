import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquirePublicationLock, drainCapturePublications, pendingPublications, startPublicationWorker } from './capture-publication.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const release = acquirePublicationLock(root);
if (release) {
  try {
    await drainCapturePublications({ root, publish: () => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--experimental-strip-types', join(root, 'scripts/publish-gallery.ts'), '--incremental'], {
        cwd: root, stdio: 'inherit', timeout: 240_000,
      });
      child.on('error', reject);
      child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Publisher exited ${signal ?? code}`)));
    }) });
  } finally {
    release();
    // Close the race where an enqueuer saw our lock just as we finished draining.
    if (pendingPublications(root).length) startPublicationWorker(root);
  }
}
