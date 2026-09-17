import { spawn } from 'node:child_process';
import { appendFileSync, closeSync, constants, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.SCREENSHOT_URL ?? 'http://localhost:5173';
const screenshotsDir = join(root, 'screenshots');
const pushMarkerFile = join(screenshotsDir, '.last-push-sha');
const captureLockFile = join(screenshotsDir, '.capture.lock');
const captureLogFile = join(screenshotsDir, '.capture.log');
const stashDir = join(tmpdir(), 'mitwerk-prompt-stash');
const chromeCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function timecode(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function sanitizeMessage(message, fallback) {
  const cleaned = String(message ?? '')
    .replace(/[[\]]/g, '')
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
  return (cleaned || fallback).slice(0, 120);
}

function fileLabel(count) {
  return count === 1 ? '1 file' : `${count} files`;
}

function listedPaths(output) {
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function isCountedPath(name) {
  return Boolean(name) && !name.startsWith('screenshots/') && name !== '.mitwerk-graph.json';
}

function countChangedFiles(tag, sha, base) {
  try {
    if (tag === 'push') {
      const zeros = '0000000000000000000000000000000000000000';
      const names = base && base !== zeros
        ? listedPaths(git(['diff', '--name-only', `${base}...${sha}`]))
        : listedPaths(git(['diff-tree', '--no-commit-id', '--name-only', '-r', sha]));
      return new Set(names.filter(isCountedPath)).size;
    }
    const names = [
      ...listedPaths(git(['diff', '--name-only'])),
      ...listedPaths(git(['diff', '--name-only', '--cached'])),
      ...listedPaths(git(['ls-files', '--others', '--exclude-standard'])),
    ];
    return new Set(names.filter(isCountedPath)).size;
  } catch {
    return 0;
  }
}

function nextTagCount(dir, tag) {
  let max = 0;
  let matching = 0;
  const pattern = new RegExp(`^\\[${tag}(?: #(\\d+))?\\]`, 'i');
  for (const name of readdirSync(dir)) {
    const match = name.match(pattern);
    if (!match) {
      continue;
    }
    matching += 1;
    if (match[1]) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return Math.max(max, matching) + 1;
}

function findChrome() {
  return chromeCandidates.find((bin) => existsSync(bin));
}

function stashPath(conversationId) {
  return join(stashDir, `${conversationId || 'latest'}.txt`);
}

function saveStash(conversationId, prompt) {
  mkdirSync(stashDir, { recursive: true });
  writeFileSync(stashPath(conversationId), prompt, 'utf8');
  writeFileSync(stashPath('latest'), prompt, 'utf8');
}

function readStash(conversationId) {
  const paths = [stashPath(conversationId), stashPath('latest')];
  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }
    const text = readFileSync(path, 'utf8').trim();
    if (text) {
      return text;
    }
  }
  return '';
}

function textFromUnknown(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(textFromUnknown).filter(Boolean).join(' ').trim();
  }
  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') {
      return value.text.trim();
    }
    if (value.content) {
      return textFromUnknown(value.content);
    }
  }
  return '';
}

function lastUserPrompt(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) {
    return '';
  }
  const lines = readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const row = JSON.parse(lines[i]);
      const role = row.role ?? row.type ?? row.message?.role ?? row.author ?? '';
      if (!/user/i.test(String(role))) {
        continue;
      }
      const text = textFromUnknown(row.prompt ?? row.text ?? row.content ?? row.message);
      if (text) {
        return text;
      }
    } catch {
      // skip malformed transcript lines
    }
  }
  return '';
}

function labelFromHook(payload) {
  const fromPrompt = textFromUnknown(payload.prompt);
  if (fromPrompt) {
    return fromPrompt;
  }
  const stashed = readStash(payload.conversation_id);
  if (stashed) {
    return stashed;
  }
  const fromTranscript = lastUserPrompt(payload.transcript_path);
  if (fromTranscript) {
    return fromTranscript;
  }
  return 'prompt';
}

async function readStdin() {
  if (process.stdin.isTTY) {
    return '';
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parsePayload(raw) {
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function emitHook(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function assertServer() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!response.ok && response.status >= 500) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    throw new Error(
      `Nothing is running at ${url}. Start the app with npm run dev. Use git push --no-verify or MITWERK_SCREENSHOT_SKIP=1 to skip.`,
    );
  }
}

function stopProcess(child) {
  if (!child.pid) {
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      // already gone
    }
  }
}

function capture(chrome, outFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      chrome,
      [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-crash-reporter',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        `--user-data-dir=${join(tmpdir(), `mitwerk-chrome-screenshot-${process.pid}`)}`,
        '--high-dpi-support=1',
        '--force-device-scale-factor=2',
        '--window-size=1440,900',
        `--screenshot=${outFile}`,
        url,
      ],
      { detached: true, stdio: ['ignore', 'ignore', 'pipe'] },
    );

    let stderr = '';
    let settled = false;
    let lastSize = -1;
    let stableCount = 0;

    const finish = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearInterval(poll);
      clearTimeout(timeout);
      stopProcess(child);
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => finish(error));

    const poll = setInterval(() => {
      if (!existsSync(outFile)) {
        return;
      }
      const size = statSync(outFile).size;
      if (size < 1000) {
        return;
      }
      if (size === lastSize) {
        stableCount += 1;
        if (stableCount >= 2) {
          finish();
        }
        return;
      }
      lastSize = size;
      stableCount = 0;
    }, 150);

    const timeout = setTimeout(() => {
      if (existsSync(outFile) && statSync(outFile).size > 1000) {
        finish();
        return;
      }
      finish(new Error(`Chrome screenshot timed out. ${stderr.trim()}`.trim()));
    }, 15000);
  });
}

function captureLog(message) {
  mkdirSync(screenshotsDir, { recursive: true });
  appendFileSync(captureLogFile, `${new Date().toISOString()} ${message}\n`);
}

function readPushMarker() {
  return existsSync(pushMarkerFile) ? readFileSync(pushMarkerFile, 'utf8').trim() : '';
}

function writePushMarker(sha) {
  mkdirSync(screenshotsDir, { recursive: true });
  writeFileSync(pushMarkerFile, `${sha}\n`);
}

function gitLiteral(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
  }).trim();
}

function newestUntrackedPushScreenshot(subject) {
  try {
    const needle = sanitizeMessage(subject, 'commit');
    const names = git(['ls-files', '--others', '--exclude-standard', '--', 'screenshots'])
      .split('\n')
      .filter((name) => name.startsWith('screenshots/[push') && name.includes(needle));
    if (!names.length) return '';
    names.sort();
    return join(root, names.at(-1));
  } catch {
    return '';
  }
}

function acquireCaptureLock() {
  mkdirSync(screenshotsDir, { recursive: true });
  try {
    const fd = openSync(captureLockFile, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
    writeFileSync(captureLockFile, `${process.pid}\n`);
    closeSync(fd);
    return true;
  } catch {
    if (existsSync(captureLockFile) && Date.now() - statSync(captureLockFile).mtimeMs > 120000) {
      try { unlinkSync(captureLockFile); } catch { /* retry below */ }
      return acquireCaptureLock();
    }
    return false;
  }
}

function releaseCaptureLock() {
  try {
    unlinkSync(captureLockFile);
  } catch {
    // already gone
  }
}

async function reconcilePush({ commitAndPush }) {
  if (process.env.MITWERK_SCREENSHOT_SKIP === '1' || process.env.MITWERK_SCREENSHOT_HOOK === '1') {
    return '';
  }
  const sha = git(['rev-parse', 'HEAD']);
  let upstream = '';
  try {
    upstream = git(['rev-parse', '@{u}']);
  } catch {
    captureLog(`reconcile skip: no upstream (${sha})`);
    return '';
  }
  if (sha !== upstream) {
    captureLog(`reconcile skip: HEAD ${sha} != upstream ${upstream}`);
    return '';
  }
  const subject = git(['log', '-1', '--pretty=%s', sha]);
  if (subject === 'chore: progress screenshot') {
    writePushMarker(sha);
    captureLog(`reconcile skip: screenshot commit ${sha}`);
    return '';
  }
  const pending = newestUntrackedPushScreenshot(subject);
  if (!pending && readPushMarker() === sha) {
    captureLog(`reconcile skip: already captured ${sha}`);
    return '';
  }
  if (!acquireCaptureLock()) {
    captureLog('reconcile skip: capture lock held');
    return '';
  }
  try {
    let outFile = pending;
    if (!outFile) {
      let base = '';
      try {
        base = git(['rev-parse', `${sha}^`]);
      } catch {
        base = '';
      }
      captureLog(`reconcile capture ${sha} ${subject}`);
      outFile = await takeScreenshot({ tag: 'push', label: subject, sha, base });
    } else {
      captureLog(`reconcile reuse ${outFile}`);
    }
    if (commitAndPush) {
      gitLiteral(['add', '--', outFile]);
      gitLiteral(['commit', '--no-verify', '-m', 'chore: progress screenshot', '--', outFile]);
      execFileSync('git', ['push', '--no-verify'], {
        cwd: root,
        env: { ...process.env, MITWERK_SCREENSHOT_HOOK: '1' },
      });
      writePushMarker(git(['rev-parse', 'HEAD']));
      captureLog(`reconcile pushed screenshot ${outFile}`);
    } else {
      writePushMarker(sha);
    }
    return outFile;
  } finally {
    releaseCaptureLock();
  }
}

async function takeScreenshot({ tag, label, sha, base }) {
  const chrome = findChrome();
  if (!chrome) {
    throw new Error('Google Chrome is required to capture progress screenshots.');
  }
  await assertServer();
  mkdirSync(screenshotsDir, { recursive: true });
  const message = sanitizeMessage(label, tag === 'prompt' ? 'prompt' : 'commit');
  const count = nextTagCount(screenshotsDir, tag);
  const files = countChangedFiles(tag, sha, base);
  const filename = `[${tag} #${count}] ${fileLabel(files)} · ${message}-${timecode()}.png`;
  const outFile = join(screenshotsDir, filename);
  await capture(chrome, outFile);
  return outFile;
}

async function main() {
  const hookMode = hasFlag('hook-mode');
  const failOpen = hookMode || hasFlag('fail-open');
  const raw = hasFlag('from-stdin') || hookMode ? await readStdin() : '';
  const payload = parsePayload(raw);
  const event = payload.hook_event_name ?? '';

  if (hookMode && event === 'beforeSubmitPrompt') {
    saveStash(payload.conversation_id, textFromUnknown(payload.prompt) || 'prompt');
    emitHook({ continue: true });
    return;
  }

  if (hasFlag('reconcile-push') || event === 'afterShellExecution') {
    try {
      if (process.env.MITWERK_SCREENSHOT_SKIP === '1') {
        if (hookMode) emitHook({});
        return;
      }
      const outFile = await reconcilePush({
        commitAndPush: hasFlag('commit-and-push') || event === 'afterShellExecution',
      });
      if (hookMode) {
        if (outFile) console.error(`Saved ${outFile}`);
        emitHook({});
        return;
      }
      if (outFile) console.log(outFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      captureLog(`reconcile failed: ${message}`);
      console.error(message);
      if (hookMode) {
        emitHook({});
        return;
      }
      if (failOpen) return;
      process.exit(1);
    }
    return;
  }

  const tag = argValue('tag', event === 'stop' || event === 'beforeSubmitPrompt' ? 'prompt' : 'push');
  const sha = argValue('sha', 'HEAD');
  const base = argValue('base');
  const label = argValue('label')
    || (tag === 'prompt' ? labelFromHook(payload) : git(['log', '-1', '--pretty=%s', sha]));

  try {
    if (process.env.MITWERK_SCREENSHOT_SKIP === '1') {
      if (hookMode) {
        emitHook({});
      }
      return;
    }
    const outFile = await takeScreenshot({ tag, label, sha, base });
    if (hookMode) {
      console.error(`Saved ${outFile}`);
      emitHook({});
      return;
    }
    console.log(outFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    if (hookMode) {
      emitHook({});
      return;
    }
    if (failOpen) {
      return;
    }
    process.exit(1);
  }
}

await main();
