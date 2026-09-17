// Measures what it costs to resolve a frame name three different ways, so the
// escalation ladder in ../server/figmaRest.mjs can be judged on numbers rather
// than on argument.
//
//   npm run bench                       # the default test file
//   npm run bench -- "<figma url>"      # any file you can read
//
// Run it against a real production file — that is where the three strategies
// diverge. On a small file they all look the same.
import { parseFigmaUrl } from '../server/figmaUrl.mjs';
import { patAuthFromEnv } from '../server/comment.mjs';
import { clearCache } from '../server/figmaRest.mjs';

const DEFAULT_URL =
  'https://www.figma.com/design/30KWPrZ48jBMqozHlwSarX/Test--agent-annotation?node-id=0-1';

const fileUrl = process.argv[2] ?? DEFAULT_URL;
const parsed = parseFigmaUrl(fileUrl);
if (!parsed.ok) {
  console.error(parsed.message);
  process.exit(1);
}

const auth = patAuthFromEnv();
const API = 'https://api.figma.com';

async function measure(label, path) {
  const started = Date.now();
  const response = await fetch(API + path, {
    headers:
      auth.type === 'oauth'
        ? { Authorization: 'Bearer ' + auth.token }
        : { 'X-Figma-Token': auth.token },
  });
  const body = await response.text();
  const ms = Date.now() - started;

  if (!response.ok) return { label, error: response.status + ' ' + body.slice(0, 120) };

  // Count frames so the coverage difference between strategies is visible.
  let frames = 0;
  try {
    const json = JSON.parse(body);
    const root = json.document ?? Object.values(json.nodes ?? {})[0]?.document;
    if (root) {
      (function walk(node) {
        if (node.type === 'FRAME') frames += 1;
        for (const child of node.children ?? []) walk(child);
      })(root);
    }
  } catch {
    // Counting is a nicety; the size and time are the point.
  }

  return { label, bytes: Buffer.byteLength(body), ms, frames };
}

function fmt(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

const key = encodeURIComponent(parsed.fileKey);
clearCache();

console.log('file:      ' + parsed.fileKey);
console.log('node-id:   ' + (parsed.nodeId ?? '(none in URL)'));
console.log('');

const runs = [];
if (parsed.nodeId) {
  runs.push(await measure('1. node-hint', '/v1/files/' + key + '/nodes?ids=' + encodeURIComponent(parsed.nodeId)));
  runs.push(
    await measure(
      '1b. page-scoped depth=2',
      '/v1/files/' + key + '?ids=' + encodeURIComponent(parsed.nodeId) + '&depth=2'
    )
  );
}
runs.push(await measure('2. whole file depth=2', '/v1/files/' + key + '?depth=2'));
runs.push(await measure('3. whole file (naive)', '/v1/files/' + key));

const width = Math.max(...runs.map((r) => r.label.length));
for (const run of runs) {
  if (run.error) {
    console.log(run.label.padEnd(width) + '   ERROR ' + run.error);
    continue;
  }
  console.log(
    run.label.padEnd(width) +
      '   ' +
      fmt(run.bytes).padStart(9) +
      '   ' +
      (run.ms + 'ms').padStart(7) +
      '   ' +
      run.frames +
      ' frames'
  );
}

const naive = runs.find((r) => r.label.startsWith('3.'));
const cheapest = runs.filter((r) => !r.error && !r.label.startsWith('3.')).sort((a, b) => a.bytes - b.bytes)[0];
if (naive && cheapest && !naive.error) {
  const ratio = naive.bytes / Math.max(cheapest.bytes, 1);
  console.log('');
  console.log(
    'Cheapest successful strategy downloads ' +
      ratio.toFixed(1) +
      'x less than fetching the whole file.'
  );
}
