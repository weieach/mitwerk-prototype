import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const queueDirectory = root => join(root, '.vercel/gallery-publish-queue');
export const pendingPublications = root => existsSync(queueDirectory(root))
  ? readdirSync(queueDirectory(root)).filter(name => name.endsWith('.json')).map(name => join(queueDirectory(root), name)) : [];

export function startPublicationWorker(root) {
  mkdirSync(join(root, '.vercel'), { recursive: true });
  const log = openSync(join(root, '.vercel/gallery-publish.log'), 'a');
  try {
    const child = spawn(process.execPath, [join(root, 'scripts/publish-capture-worker.mjs')], {
      cwd: root, detached: true, stdio: ['ignore', log, log],
    });
    child.on('error', error => console.error(`Capture saved; Blob publication remains queued: ${error.message}`));
    child.unref();
  } finally { closeSync(log); }
}

export function enqueueCapturePublication(root, capture, { start = true } = {}) {
  if (!statSync(capture).isFile() || !statSync(capture).size) throw new Error('Cannot publish an unsaved capture');
  mkdirSync(queueDirectory(root), { recursive: true });
  const request = join(queueDirectory(root), `${Date.now()}-${randomUUID()}.json`);
  writeFileSync(request, JSON.stringify({ capture, queuedAt: new Date().toISOString() }), { flag: 'wx' });
  if (start) startPublicationWorker(root);
  return request;
}

export function acquirePublicationLock(root) {
  mkdirSync(join(root, '.vercel'), { recursive: true });
  const lock = join(root, '.vercel/gallery-publish.lock');
  try {
    const fd = openSync(lock, 'wx');
    try { writeFileSync(fd, String(process.pid)); } finally { closeSync(fd); }
    return () => { try { unlinkSync(lock); } catch {} };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let pid;
    try { pid = Number(readFileSync(lock, 'utf8')); } catch { return null; }
    // The owner may still be writing its PID. Never steal a live worker's lock.
    if (!Number.isSafeInteger(pid) || pid <= 0) return null;
    try { process.kill(pid, 0); return null; }
    catch (error) {
      if (error.code !== 'ESRCH') return null;
      try { unlinkSync(lock); } catch { return null; }
      return acquirePublicationLock(root);
    }
  }
}

export async function drainCapturePublications({ root, publish, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), log = console.log }) {
  let failures = 0;
  while (true) {
    const batch = pendingPublications(root);
    if (!batch.length) return;
    try {
      await publish();
      // Only acknowledge this batch; captures saved during publishing need another pass.
      for (const request of batch) { try { unlinkSync(request); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
      failures = 0;
      log(`Published ${batch.length} queued capture(s).`);
    } catch (error) {
      const delay = Math.min(300_000, 15_000 * 2 ** Math.min(failures++, 5));
      log(`Blob publication pending; retrying in ${delay / 1000}s: ${error.message}`);
      await sleep(delay);
    }
  }
}
