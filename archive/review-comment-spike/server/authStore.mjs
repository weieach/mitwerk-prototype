// Persists the OAuth client registration and tokens between runs, so you only
// sign in to Figma once. Everything lands in a single gitignored JSON file.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const FILE = join(here, '..', '..', '..', '.mitwerk-auth.json');

function readAll() {
  if (!existsSync(FILE)) return {};
  try {
    return JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    // A corrupt cache should never be fatal — starting over just means signing in again.
    return {};
  }
}

function writeAll(data) {
  writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

export const authStore = {
  get(key) {
    return readAll()[key];
  },
  set(key, value) {
    const all = readAll();
    all[key] = value;
    writeAll(all);
  },
  clear(keys) {
    const all = readAll();
    for (const k of keys) delete all[k];
    writeAll(all);
  },
  path: FILE,
};
