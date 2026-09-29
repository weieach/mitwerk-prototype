import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';

export type TokenUsage = { input: number; output: number; total: number; simulated: true };
/** Persist once per capture; future real measurements can replace this provider. */
export function readTokenUsage(root: string, ids: string[]): Record<string, TokenUsage> {
  const directory = join(root, 'data');
  const path = join(directory, 'token-usage.json');
  const values: Record<string, TokenUsage> = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  let changed = false;
  for (const id of ids) {
    if (values[id]) continue;
    const input = randomInt(200, 16001), output = randomInt(100, 8001);
    values[id] = { input, output, total: input + output, simulated: true };
    changed = true;
  }
  if (changed) {
    mkdirSync(directory, { recursive: true });
    const temporary = `${path}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(values, null, 2) + '\n');
    renameSync(temporary, path);
  }
  return values;
}
