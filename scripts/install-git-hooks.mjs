import { chmod, copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gitDir = join(root, '.git');
if (!existsSync(gitDir)) {
  process.exit(0);
}

const src = join(root, '.githooks', 'pre-push');
const dest = join(gitDir, 'hooks', 'pre-push');
await mkdir(join(gitDir, 'hooks'), { recursive: true });
await copyFile(src, dest);
await chmod(src, 0o755);
await chmod(dest, 0o755);
console.log('Installed git pre-push hook for progress screenshots.');
