import { appendPromptEntry } from '../src/shared/prompt-log.mjs';
import { enqueueCapturePublication } from './capture-publication.mjs';
import { captureSummaryMaxLength } from '../src/shared/capture-format.mjs';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { appendFileSync, closeSync, constants, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.SCREENSHOT_URL ?? 'http://localhost:5173';
const frameCaptureDirName = '[frame capture] screenshots';
const screenshotsDir = join(root, frameCaptureDirName);
const pushShaFile = join(root, 'data', 'push-shas.json');
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
  return (cleaned || fallback).slice(0, captureSummaryMaxLength);
}

function fileLabel(count) {
  return count === 1 ? '1 file' : `${count} files`;
}

function lineLabel(added, deleted) {
  return `+${added} -${deleted}`;
}

function compactCount(value) {
  const n = Math.abs(Math.round(Number(value) || 0));
  if (n === 0) return '0';
  if (n < 1000) return String(n);
  const exp = Math.floor(Math.log10(n));
  const rounded = Math.round(n / 10 ** (exp - 1)) * 10 ** (exp - 1);
  if (rounded >= 1_000_000) {
    const millions = rounded / 1_000_000;
    return millions >= 10 ? `${Math.round(millions)}M` : `${millions.toFixed(1)}M`;
  }
  const thousands = rounded / 1000;
  return thousands >= 10 ? `${Math.round(thousands)}k` : `${thousands.toFixed(1)}k`;
}

function compactLineDelta(added, deleted) {
  return `+${compactCount(added)}-${compactCount(deleted)}`;
}

function parentSha(sha) {
  try {
    return git(['rev-parse', `${sha}^`]);
  } catch {
    return '';
  }
}

function currentBranch() {
  try {
    return git(['rev-parse', '--abbrev-ref', 'HEAD']);
  } catch {
    return '';
  }
}

function branchSegment(branch = currentBranch()) {
  const name = sanitizeMessage(branch, '');
  if (!name || /^(main|master|HEAD)$/i.test(name)) return '';
  return name;
}

function frameStem({ tag, count, files = 0, added = 0, deleted = 0, message, branch = currentBranch() }) {
  const extra = branchSegment(branch);
  const lead = extra ? `${extra} · ` : '';
  if (tag === 'prompt') {
    return `[${tag} #${count}] ${lead}${compactLineDelta(added, deleted)} · ${message}`;
  }
  return `[${tag} #${count}] ${lead}${fileLabel(files)} · ${lineLabel(added, deleted)} · ${message}`;
}

function listedPaths(output) {
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function isCountedPath(name) {
  return Boolean(name)
    && !name.startsWith(`${frameCaptureDirName}/`)
    && !name.startsWith('screenshots/')
    && name !== '.mitwerk-graph.json';
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

function addNumstat(output, totals) {
  for (const line of output.split('\n')) {
    const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!match || !isCountedPath(match[3])) continue;
    if (match[1] !== '-') totals.added += Number(match[1]);
    if (match[2] !== '-') totals.deleted += Number(match[2]);
  }
}

function countLineChanges(sha, base) {
  try {
    const zeros = '0000000000000000000000000000000000000000';
    const output = base && base !== zeros
      ? git(['diff', '--numstat', `${base}...${sha}`])
      : git(['diff-tree', '--no-commit-id', '--numstat', '-r', sha]);
    const totals = { added: 0, deleted: 0 };
    addNumstat(output, totals);
    return totals;
  } catch {
    return { added: 0, deleted: 0 };
  }
}

function countFileLines(path) {
  const buf = readFileSync(path);
  if (buf.includes(0)) return 0;
  const text = buf.toString('utf8');
  if (!text) return 0;
  const lines = text.split(/\r\n|\n/);
  if (lines.at(-1) === '') lines.pop();
  return lines.length;
}

function countWorkingTreeLineChanges() {
  const totals = { added: 0, deleted: 0 };
  try {
    addNumstat(git(['diff', 'HEAD', '--numstat']), totals);
  } catch {
    // no HEAD or empty tree
  }
  try {
    for (const name of listedPaths(git(['ls-files', '--others', '--exclude-standard']))) {
      if (!isCountedPath(name)) continue;
      const path = join(root, name);
      if (!existsSync(path) || statSync(path).isDirectory()) continue;
      totals.added += countFileLines(path);
    }
  } catch {
    // ignore untracked scan failures
  }
  return totals;
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

function skipPath(conversationId) {
  return join(stashDir, `${conversationId || 'latest'}.skip`);
}

function conversationId(payload) {
  return payload.conversation_id || payload.conversationId || payload.session_id || payload.sessionId || '';
}

function composerMode(payload) {
  const nested = payload.composer && typeof payload.composer === 'object' ? payload.composer : {};
  const raw = payload.composer_mode
    ?? payload.composerMode
    ?? nested.mode
    ?? payload.mode
    ?? payload.session_mode
    ?? payload.current_mode
    ?? payload.interaction_mode
    ?? '';
  return String(raw).toLowerCase();
}

function isAskMode(payload) {
  const mode = composerMode(payload);
  return mode === 'ask' || mode === 'chat';
}

function projectSkipPath(id) {
  return join(screenshotsDir, `.ask-skip-${id || 'latest'}`);
}

function skipMarkerPaths(id) {
  return [skipPath(id), skipPath('latest'), projectSkipPath(id), projectSkipPath('latest')];
}

function saveSkip(id) {
  mkdirSync(stashDir, { recursive: true });
  mkdirSync(screenshotsDir, { recursive: true });
  for (const path of skipMarkerPaths(id)) {
    writeFileSync(path, 'ask', 'utf8');
  }
}

function clearSkip(id) {
  for (const path of skipMarkerPaths(id)) {
    try {
      unlinkSync(path);
    } catch {
      // not present
    }
  }
}

function hasSkipMarker(id) {
  if (id && (existsSync(skipPath(id)) || existsSync(projectSkipPath(id)))) return true;
  if (!id && (existsSync(skipPath('latest')) || existsSync(projectSkipPath('latest')))) return true;
  return false;
}

function shouldSkipAskScreenshot(payload) {
  if (isAskMode(payload)) return true;
  return hasSkipMarker(conversationId(payload));
}

function excludesCounter(text) {
  return /\bx counter\b/i.test(text);
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
    const text = readFileSync(path, 'utf8');
    if (text) {
      return text;
    }
  }
  return '';
}

function textFromUnknown(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(textFromUnknown).filter(text => text.trim()).join('\n');
  }
  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') {
      return value.text;
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

function writePromptCounter(outFile) {
  const count = Number(/^\[prompt #(\d+)\]/i.exec(basename(outFile))?.[1] ?? 0);
  if (!count) return;
  const agentsPath = join(root, 'AGENTS.md');
  try {
    const text = readFileSync(agentsPath, 'utf8');
    const latest = Math.max(count, Number(/\*\*push #\d+ · prompt #(\d+)/.exec(text)?.[1] ?? 0));
    const next = text.replace(/(\*\*push #\d+ · )prompt #\d+/, `$1prompt #${latest}`);
    if (next !== text) writeFileSync(agentsPath, next);
  } catch (error) {
    captureLog(`prompt counter update failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function hookCommand(payload) {
  const value = payload.command ?? payload.shell_command ?? payload.cmd ?? '';
  return typeof value === 'string' ? value : '';
}

function promptStampPath() {
  return join(screenshotsDir, '.last-prompt-label');
}

function promptAlreadyCaptured(label) {
  if (!existsSync(promptStampPath())) return false;
  const [stamp, previous] = readFileSync(promptStampPath(), 'utf8').split('\n');
  return previous === sanitizeMessage(label, 'prompt') && Date.now() - Number(stamp) < 120000;
}

function stampPrompt(label) {
  mkdirSync(screenshotsDir, { recursive: true });
  writeFileSync(promptStampPath(), `${Date.now()}\n${sanitizeMessage(label, 'prompt')}\n`);
}

function labelFromHook(payload) {
  const fromPrompt = textFromUnknown(payload.prompt);
  if (fromPrompt) {
    return fromPrompt;
  }
  const stashed = readStash(conversationId(payload));
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function screenshotInteractFromPrompt(prompt) {
  const text = String(prompt).toLowerCase();
  const count = /\b(circled number|count hint|branch count)\b/.test(text)
    || (/\b(caret|triangle)\b/.test(text) && /\b(circled|count)\b/.test(text));
  const menu = /\b(action menu|overflow control|floating panel|card menu)\b/.test(text);
  return [count ? 'count' : '', menu ? 'menu' : ''].filter(Boolean).join(',');
}

function wantsResetCapture(prompt = '') {
  return ['reset', 'frontal', 'top', 'overhead'].includes(argValue('gallery-view')) || /\bisometric\b/i.test(prompt)
    || /\bc gallery\b/i.test(prompt) && /\breset view\b/i.test(prompt)
    || /\bcapture\b[\s\S]{0,80}\breset view\b/i.test(prompt) || /\breset view\b[\s\S]{0,40}\bcapture\b/i.test(prompt);
}

function wantsIdeaStreamCapture(prompt = '') {
  return /\bc chat\b[^.\n]*\bidea stream\b/i.test(prompt) || hasFlag('idea-stream') || /\bc chat (?:and|&) idea stream\b/i.test(prompt) || /\bc idea stream\b/i.test(prompt) || /\bc (?:home|homescreen)\s+w\/?\s+[^.\n]*\bidea stream\b/i.test(prompt);
}

function wantsLandingCapture(prompt = '') { return argValue('gallery-view') === 'landing' || /\bc landing\b/i.test(prompt); }

/** `c slider`, or `c ... w simulator` (`work state simulator`), opens the work state simulator, optionally `at N%`. */
function workStateCapture(prompt = '') {
  if (hasFlag('work-state') || hasFlag('work-state-hidden')) return argValue('work-state-progress', 'open');
  if (!/\bc slider\b/i.test(prompt) && !/\bc\b[^\n]*\b(?:work state )?simulator\b/i.test(prompt)) return null;
  const percent = /\b(?:simulator|slider)\b[^.\n]*?\bat (\d{1,3})%/i.exec(prompt);
  return percent ? String(Math.min(100, Number(percent[1])) / 100) : 'open';
}

function wantsHomeCapture(prompt = '') {
  return argValue('gallery-view') === 'home' || /\bc (?:home|homescreen|slider|milestone overlay|chat (?:and|&) gallery)\b/i.test(prompt);
}

function wantsLightCapture(prompt = '') {
  return /\bc(?:\s+(?:home|homescreen|chat|gallery|theater|token|todos|to-dos))?\s+(?:w\/?\s+)?light mode\b/i.test(prompt);
}

function wantsDarkCapture(prompt = '') {
  return /\bc(?:\s+(?:home|homescreen|chat|gallery|theater|token|todos|to-dos))?\s+(?:w\/?\s+)?dark mode\b/i.test(prompt);
}

function chatCaptureTitle(prompt = '') {
  const quoted = /\bc(?:\s*\/)? chat\s+"([^"]+)"/i.exec(prompt);
  if (quoted) return quoted[1].trim();
  const plain = /\bc(?:\s*\/)? chat\s+([^\n]+)/i.exec(prompt);
  if (!plain) return '';
  if (/^fullscreen(?:\s|$)/i.test(plain[1])) return '';
  return plain[1].replace(/(?:^|\s+)(?:w\/?|with)\s+[\s\S]*$/i, '').replace(/\s+/g, ' ').trim();
}

function wantsTodosCapture(prompt = '') {
  return /\bc to-?dos?\b/i.test(prompt);
}

function wantsSideBySideCapture(prompt = '') {
  return /\bc(?:\s*\/)? chat (?:and|&) version side[ -]by[ -]side\b/i.test(prompt);
}

function wantsChatPlaybackCapture(prompt = '') {
  return /\bc chat (?:and|&) playback\b|\bc chat\b[^.\n]*\bplayback\b/i.test(prompt);
}

function wantsChatCapture(prompt = '') {
  if (argValue('gallery-view') === 'chat') return true;
  return /\bc(?:\s*\/)? chat\b/i.test(prompt) && !wantsHomeCapture(prompt) && !wantsSideBySideCapture(prompt) && !wantsChatPlaybackCapture(prompt);
}

function wantsTheaterCapture(prompt = '') {
  if (wantsChatPlaybackCapture(prompt)) return true;
  if (wantsHomeCapture(prompt)) return false;
  if (argValue('gallery-view') === 'theater') return true;
  if (/\bc gallery\b/i.test(prompt) || ['reset', 'center', 'top'].includes(argValue('gallery-view'))) return false;
  if (/\bisometric\b/i.test(prompt) && !/\btheater\b/i.test(prompt)) return false;
  const theaterSubject = prompt.split(/tree-panel|version-card/i)[0] ?? '';
  if (/\bat mobile\b|mobile breakpoint/i.test(prompt)) return true;
  if (/iteration-gallery|theater-view|theater-version|theater-branch|\boverlay\b|\bprototype\b/i.test(theaterSubject)) return true;
  if (/tree-panel|version-card|version stream/i.test(prompt) && !/\bcaptur(?:e|ed|ing|this)\b[\s\S]{0,40}\btheater\b/i.test(prompt)) return false;
  return /\btheater\b/i.test(prompt) || /\bcaptur(?:e|ed)\b[\s\S]{0,80}\btheater view\b/i.test(prompt) || /\btheater view\b[\s\S]{0,80}\bcaptur(?:e|ed)\b/i.test(prompt);
}

function wantsTransitionCapture(prompt = '') {
  return ['transition', 'timeline-transition'].includes(argValue('gallery-view')) || /\bmidway\b[\s\S]{0,80}\btransition\b/i.test(prompt) || /\btransition\b[\s\S]{0,80}\bmidway\b/i.test(prompt) || /\bmid-transition\b/i.test(prompt);
}

function wantsTokenCapture(prompt = '') {
  return argValue('gallery-view') === 'tokens' || /\bc token\b/i.test(prompt);
}

function wantsTipHover(prompt = '') {
  return /\btip hovered\b/i.test(prompt);
}

function wantsGalleryHover(prompt = '') {
  if (wantsTipHover(prompt) || wantsTokenCapture(prompt)) return false;
  return argValue('gallery-view') === 'top' || hasFlag('gallery-hover') || (/\bhover(?:ing|ed)?\b/i.test(prompt) && !wantsResetCapture(prompt));
}

function wantsPrototypeCapture(prompt) { return argValue('gallery-view') === 'prototype' || /\bc prototype(?: embed)?\b|\bc chat (?:and|&) prototype\b|\bc playback\b[^.\n]*\bprototype\b/i.test(prompt); }

function wantsLiveCapture(prompt) { return argValue('gallery-view') === 'live' || /\bc live server\b|\bc chat (?:and|&) playback\b[^.\n]*\blive server\b/i.test(prompt); }

function screenshotUrl(prompt = '') {
  const target = new URL(url);
  target.searchParams.set('screenshot', '1');
  if (!target.searchParams.has('playUnit') && /milestone (?:play )?mode/i.test(prompt)) target.searchParams.set('playUnit', 'milestone');
  if (/\bexport overlay\b/i.test(prompt)) target.searchParams.set('exportOpen', '1');
  if (/\bcontrol(?:s)? (?:overlay|panel)\b/i.test(prompt)) target.searchParams.set('controlsOpen', '1');
  const workState = workStateCapture(prompt);
  if (workState) target.searchParams.set('workState', workState);
  if (wantsLandingCapture(prompt)) { target.search = '?screenshot=1&page=landing'; if (wantsDarkCapture(prompt)) target.searchParams.set('theme', 'dark'); else if (wantsLightCapture(prompt)) target.searchParams.set('theme', 'light'); return target.href; }
  if (/\bc (?:home|homescreen)\b[^.\n]*milestone[^.\n]*zoomed in/i.test(prompt)) { target.searchParams.set('treeMilestone', 'latest'); target.searchParams.set('treeZoom', '1'); }
  if (hasFlag('tree-fit') || /fit all view/i.test(prompt)) target.searchParams.set('treeFit', '1');
  if (/\bc (?:home|homescreen)\b[^.\n]*todo added to chat field/i.test(prompt)) target.searchParams.set('todoDraft', '1');
  if (hasFlag('todo-drawer') || /\bc (?:home|homescreen|chat)\b[\s\S]*\btodo drawer\b/i.test(prompt)) target.searchParams.set('todoDrawer', 'open');
  if (wantsDarkCapture(prompt)) target.searchParams.set('theme', 'dark');
  else if (wantsLightCapture(prompt)) target.searchParams.set('theme', 'light');
  // Capture the complete prototype shell, retaining gallery state parameters.
  target.searchParams.delete('view');
  target.searchParams.set('treeMode', argValue('tree-mode', 'history'));
  if (wantsLiveCapture(prompt)) { target.searchParams.set('layout', 'side-by-side'); target.searchParams.set('galleryView', 'theater'); target.searchParams.set('liveOpen', '1'); return target.href; }
  if (wantsPrototypeCapture(prompt)) { target.searchParams.set('layout', 'side-by-side'); target.searchParams.set('galleryView', 'theater'); target.searchParams.set('frameKind', 'prototype'); target.searchParams.set('prototypeOpen', '1'); return target.href; }
  if (wantsIdeaStreamCapture(prompt)) { if (/milestone edit/i.test(prompt)) { target.searchParams.set('treeMilestone', 'latest'); target.searchParams.set('treeZoom', '0.8'); } target.searchParams.set('ideaStream', '1'); target.searchParams.delete('galleryView'); if (wantsHomeCapture(prompt) || /\bc chat\b/i.test(prompt)) target.searchParams.set('layout', 'side-by-side'); return target.href; }
  if (wantsTodosCapture(prompt)) {
    target.searchParams.set('page', 'todos');
    if (/todo navigation dialog/i.test(prompt)) target.searchParams.set('todoDialog', 'navigation');
    return target.href;
  }
  if (wantsSideBySideCapture(prompt)) {
    target.searchParams.set('layout', 'side-by-side');
    if (/\btoast\b/i.test(prompt)) target.searchParams.set('toast', '1');
    return target.href;
  }
  if (wantsChatPlaybackCapture(prompt)) {
    target.searchParams.set('layout', 'side-by-side'); target.searchParams.set('galleryView', 'theater');
    if (/annotation overlay/i.test(prompt) && !/milestone overlay/i.test(prompt)) target.searchParams.set('annotationOverlay', '1');
    if (/\breference chip\b/i.test(prompt)) target.searchParams.set('frameChip', '1');
    return target.href;
  }
  if (wantsChatCapture(prompt)) {
    const title = chatCaptureTitle(prompt);
    if (title) target.searchParams.set('chat', title);
    else target.searchParams.set('layout', 'chat');
    if (/page scrolled to top/i.test(prompt)) target.searchParams.set('scroll', 'top');
    return target.href;
  }
  if (wantsHomeCapture(prompt)) {
    target.searchParams.delete('galleryView');
    target.searchParams.set('layout', 'side-by-side');
    if (hasFlag('gallery-hover')) target.searchParams.set('galleryHover', '1');
    return target.href;
  }
  if (wantsTokenCapture(prompt)) { target.searchParams.set('galleryView', 'tokens'); return target.href; }
  const hover = wantsGalleryHover(prompt);
  if (wantsTransitionCapture(prompt)) { target.searchParams.set('galleryView', argValue('gallery-view') === 'timeline-transition' ? 'timeline-transition' : 'transition'); return target.href; }
  if (hover) target.searchParams.set('galleryHover', '1');
  if (wantsTheaterCapture(prompt)) {
    target.searchParams.set('galleryView', 'theater');
    if (/push frame selected|push node/i.test(prompt)) target.searchParams.set('frameKind', 'push');
  } else if (wantsResetCapture(prompt)) {
    target.searchParams.set('galleryView', 'reset');
  } else if (argValue('gallery-view') === 'center' || hover || /\bcenter(?:ed)? view\b/i.test(prompt)) {
    target.searchParams.set('galleryView', 'center');
  }
  const interact = screenshotInteractFromPrompt(prompt);
  if (interact) target.searchParams.set('interact', interact);
  const scale = /(\d+(?:\.\d+)?)\s*%(?:\s+in)?\s+scale/i.exec(prompt) || /scale\b[\s\S]{0,80}?(\d+(?:\.\d+)?)\s*%/i.exec(prompt);
  if (/fit all view/i.test(prompt)) target.searchParams.set('treeFit', '1');
  if (scale) target.searchParams.set('treeZoom', String(Number(scale[1]) / 100));
  const centered = /\bv(\d+(?:\.\d+)?)(?:\s+\w+){0,3}\s+centered\b/i.exec(prompt);
  if (centered) target.searchParams.set('treeCenter', centered[1]);
  if (/\b(?:near\s+)?bottom of (?:the )?(?:page|panel)\b/i.test(prompt) || /recapture last prompt/i.test(prompt)) target.searchParams.set('treeFrame', 'bottom');
  if (centered) target.searchParams.delete('treeFrame');
  if (/a bit more upward/i.test(prompt)) target.searchParams.set('treeLift', '0.22');
  if (/same (?:spot|zone) as (?:the )?last (?:prompt|one)|recapture last frame/i.test(prompt)) {
    try {
      const saved = JSON.parse(readFileSync(join(screenshotsDir, '.last-tree-frame'), 'utf8'));
      if (saved.treeZoom) target.searchParams.set('treeZoom', String(saved.treeZoom));
      if (saved.treeFrame) target.searchParams.set('treeFrame', String(saved.treeFrame));
      if (saved.treeCenter) target.searchParams.set('treeCenter', String(saved.treeCenter));
      if (saved.galleryView) target.searchParams.set('galleryView', String(saved.galleryView));
      if (saved.frameKind) target.searchParams.set('frameKind', String(saved.frameKind));
    } catch { /* The first remembered frame is written after a framed capture. */ }
  }
  if (/push frame selected|push node/i.test(prompt)) target.searchParams.set('frameKind', 'push');
  const namedPush = /push node(?:\s+\w+){0,3}\s+v?(\d+)/i.exec(prompt);
  if (namedPush) target.searchParams.set('pushVersion', namedPush[1]);
  const namedFrame = /\bframe\s+#?(\d+)/i.exec(prompt);
  if (namedFrame) target.searchParams.set('frameNumber', namedFrame[1]);
  if (/annotation overlay|\bc theater overlay\b/i.test(prompt)) target.searchParams.set('annotationOverlay', '1');
  if (/playhead at last frame/i.test(prompt)) target.searchParams.set('playhead', 'end');
  if (/show the toast/i.test(prompt)) target.searchParams.set('prototypeToast', '1');
  if (/overlay open/i.test(prompt)) target.searchParams.set('overlay', '1');
  if (/mobile breakpoint|\bat mobile\b/i.test(prompt)) { target.searchParams.set('viewport', 'phone'); target.searchParams.set('frameKind', 'push'); target.searchParams.set('prototypeOpen', '1'); }
  if (/overlay open/i.test(prompt) || /prototype (?:is )?entered|prototype mode/i.test(prompt) || (/push node/i.test(prompt) && /enter prototype|exit prototype|full screen overlay/i.test(prompt) && !/overlay closed/i.test(prompt))) target.searchParams.set('prototypeOpen', '1');
  const frame = { treeZoom: target.searchParams.get('treeZoom'), treeFrame: target.searchParams.get('treeFrame'), treeCenter: target.searchParams.get('treeCenter'), galleryView: target.searchParams.get('galleryView'), frameKind: target.searchParams.get('frameKind') };
  if (frame.treeZoom || frame.treeFrame) {
    mkdirSync(screenshotsDir, { recursive: true });
    writeFileSync(join(screenshotsDir, '.last-tree-frame'), JSON.stringify(frame));
  }
  return target.href;
}

async function waitForFile(path, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (existsSync(path)) return readFileSync(path, 'utf8');
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${path}`);
}

async function waitForPage(port) {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = list.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      // Chrome is still starting.
    }
    await delay(50);
  }
  throw new Error('Chrome DevTools page target not found');
}

function waitForSocket(ws) {
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(), { once: true });
    ws.addEventListener('error', () => reject(new Error('Chrome DevTools socket failed')), { once: true });
  });
}

function createCdp(ws) {
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const payload = typeof event.data === 'string' ? event.data : event.data.toString();
    const message = JSON.parse(payload);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });
  return (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId += 1;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? {sessionId} : {}) }));
  });
}

async function waitForScreenshotReady(cdp, timeoutMs, prompt = '') {
  const started = Date.now();
  let milestoneRequested = false;
  let runtimeSession = null;
  while (Date.now() - started < timeoutMs) {
    const result = await cdp('Runtime.evaluate', {
      expression: wantsLandingCapture(prompt)
        ? 'document.querySelector(".landing-page")?.dataset.intro === "settled" && document.querySelector(".landing-description")?.dataset.typingComplete === "true" && document.querySelector(".landing-stage")?.dataset.orbitReady === "true" && !!document.querySelector(".landing-page .landing-open")'
        : wantsLiveCapture(prompt)
        ? 'document.querySelector(".theater-runtime")?.dataset.runtimeReady === "true" && !!document.querySelector(".theater-screen .theater-runtime iframe") && !document.querySelector(".runtime-status")'
        : wantsPrototypeCapture(prompt)
        ? 'document.querySelector(".theater-runtime")?.dataset.runtimeReady === "true" && !!document.querySelector(".theater-runtime iframe") && !document.querySelector(".runtime-status")'
        : wantsIdeaStreamCapture(prompt)
        ? '!!document.querySelector("#workspace-pane-ideas .tree-viewport") && (document.querySelector(".iteration-gallery") ? document.querySelector(".iteration-gallery").dataset.galleryPhase === "theater" && document.querySelector(".theater-view")?.dataset.frameReady === "true" && !!document.querySelector(".theater-screen img")?.complete : document.documentElement.dataset.screenshotReady === "1")'
        : wantsTodosCapture(prompt)
        ? `(document.documentElement.dataset.screenshotReady === "1" || !!document.querySelector(".workspace-gallery-only .album-3d-viewport canvas")) && !!document.querySelector(".todos-page .kanban") && !document.querySelector(".mw-reader")${/todo navigation dialog/i.test(prompt) ? ' && !!document.querySelector(".todo-navigation-dialog[open]")' : ''}`
        : wantsSideBySideCapture(prompt)
        ? `(document.documentElement.dataset.screenshotReady === "1" || !!document.querySelector(".workspace-gallery-only .album-3d-viewport canvas")) && !!document.querySelector(".mw-dialog") && !!document.querySelector(".mw-reader .workspace") && !document.querySelector(".reader-expanded")${/\btoast\b/i.test(prompt) ? ' && !!document.querySelector(".mw-toast")' : ''}`
        : wantsChatCapture(prompt)
        ? `(document.documentElement.dataset.screenshotReady === "1" || !!document.querySelector(".workspace-gallery-only .album-3d-viewport canvas")) && !!document.querySelector(".mw-dialog") && !document.querySelector(".mw-reader")${/page scrolled to top/i.test(prompt) ? ' && document.querySelector(".conversation-scroll")?.scrollTop === 0' : ''}`
        : wantsHomeCapture(prompt)
        ? '(document.documentElement.dataset.screenshotReady === "1" || !!document.querySelector(".workspace-gallery-only .album-3d-viewport canvas"))'
        : wantsTokenCapture(prompt)
        ? '(document.documentElement.dataset.screenshotReady === "1" || !!document.querySelector(".workspace-gallery-only .album-3d-viewport canvas")) && document.querySelector(".album-3d-viewport")?.dataset.tokenUsageReady === "true"'
        : wantsTransitionCapture(prompt)
        ? '(document.documentElement.dataset.screenshotReady === "1" || !!document.querySelector(".workspace-gallery-only .album-3d-viewport canvas")) && document.querySelector(".album-3d-viewport")?.dataset.transitionReady === "true"'
        : new URL(url).searchParams.get('annotationOverlay') === '1'
        ? '!!document.querySelector(".annotation-overlay[open][data-entered=true]") && !!document.querySelector(".annotation-preview")?.complete && document.querySelector(".annotation-preview")?.naturalWidth > 0'
        : wantsTheaterCapture(prompt)
        ? `document.querySelector(".iteration-gallery")?.dataset.galleryPhase === "theater" && (document.querySelector(".theater-view")?.dataset.frameReady === "true") && !!document.querySelector(".theater-screen img")?.complete && (() => { const tag = document.querySelector(".annotation-tag"); return !tag || (tag.classList.contains("is-ready") && !tag.getAnimations().some(animation => animation.playState === "running")); })()${/annotation overlay|\bc theater overlay\b/i.test(prompt) && !/milestone overlay/i.test(prompt) ? ' && !!document.querySelector(".annotation-overlay[open][data-entered=true]")' : ''}${/overlay open/i.test(prompt) ? ' && !!document.querySelector(".theater-fullscreen") && !document.querySelector(".theater-fullscreen .is-exit")' : ''}${/mobile breakpoint|\bat mobile\b/i.test(prompt) ? ' && document.querySelector("[aria-label=\\"Preview viewport\\"]")?.value === "phone" && !!document.querySelector(".theater-frame-bed")' : ''}${/\breference chip\b/i.test(prompt) ? ' && !!document.querySelector(".mw-composer .frame-context-chip img")?.complete' : ''}${/prototype (?:is )?entered|prototype mode/i.test(prompt) ? ' && !!document.querySelector("[aria-label=\\"Preview viewport\\"]")' : ''}${/playhead at last frame/i.test(prompt) ? ' && document.querySelector(".theater-view")?.dataset.rangeEdge === "end" && (() => { const head = document.querySelector(".gallery-timeline-playhead"); const scroller = document.querySelector(".gallery-timeline-scroll"); if (!head || !scroller) return false; const h = head.getBoundingClientRect(); const s = scroller.getBoundingClientRect(); return h.left >= s.left - 4 && h.right <= s.right + 4; })()' : ''}`
        : /annotation overlay|\bc theater overlay\b/i.test(prompt)
        ? '(document.documentElement.dataset.screenshotReady === "1" || !!document.querySelector(".workspace-gallery-only .album-3d-viewport canvas")) && !!document.querySelector(".annotation-overlay[open][data-entered=true]") && document.querySelector(".annotation-preview")?.complete'
        : wantsGalleryHover(prompt)
        ? '(document.documentElement.dataset.screenshotReady === "1" || !!document.querySelector(".workspace-gallery-only .album-3d-viewport canvas")) && document.querySelector(".album-3d-viewport")?.dataset.inspectionReady === "true"'
        : '(document.documentElement.dataset.screenshotReady === "1" || !!document.querySelector(".workspace-gallery-only .album-3d-viewport canvas"))',
      returnByValue: true,
    });
    if (result.result?.value === true) {
      if (wantsLandingCapture(prompt)) {
        const viewport = await cdp('Runtime.evaluate', { expression:'({width:innerWidth, height:innerHeight})', returnByValue:true });
        await cdp('Input.dispatchMouseEvent', { type:'mouseMoved', x:viewport.result.value.width / 2, y:viewport.result.value.height * .85 });
        await delay(750);
      }
      if (wantsPrototypeCapture(prompt)) {
        // Sandboxed archives run in an out-of-process iframe, with their own CDP target.
        if (!runtimeSession) {
          const { targetInfos } = await cdp('Target.getTargets');
          const embedded = targetInfos.find(target => target.type === 'iframe' && target.url.includes('/__mitwerk/prototype-assets/'));
          if (!embedded) { await delay(100); continue; }
          runtimeSession = (await cdp('Target.attachToTarget', {targetId:embedded.targetId, flatten:true})).sessionId;
        }
        const runtime = await cdp('Runtime.evaluate', { expression: `(() => {
          if (document.fonts.status !== 'loaded' || !document.querySelector('.mw-app')) return false;
          const album = document.querySelector('.album-3d-viewport');
          if (document.querySelector('.gallery-empty') || (album && album.dataset.imagesReady !== 'true')) return false;
          return [...document.images].filter(image => image.getClientRects().length).every(image => image.complete && image.naturalWidth > 0);
        })()`, returnByValue: true }, runtimeSession);
        if (runtime.result?.value !== true) { await delay(100); continue; }
      }
      if (wantsLiveCapture(prompt)) {
        const live = await cdp('Runtime.evaluate', { expression: `(() => {
          const doc = document.querySelector('.theater-runtime iframe')?.contentDocument;
          if (!doc || doc.fonts.status !== 'loaded' || !doc.querySelector('.mw-app')) return false;
          const album = doc.querySelector('.album-3d-viewport');
          if (doc.querySelector('.gallery-empty') || (album && album.dataset.imagesReady !== 'true')) return false;
          return [...doc.images].filter(image => image.getClientRects().length).every(image => image.complete && image.naturalWidth > 0);
        })()`, returnByValue:true });
        if (live.result?.value !== true) { await delay(100); continue; }
      }
      if (wantsLiveCapture(prompt) || wantsPrototypeCapture(prompt)) {
        const settled = await cdp('Runtime.evaluate', { expression: `!document.querySelector('.theater-view')?.getAnimations({subtree:true}).some(animation => animation.playState === 'running')`, returnByValue:true });
        if (settled.result?.value !== true) { await delay(100); continue; }
      }
      const images = await cdp('Runtime.evaluate', { expression: `(() => {
        const gallery = document.querySelector('.iteration-gallery');
        if (gallery?.dataset.galleryPhase === 'album' && gallery.querySelector('.album-3d-viewport')?.dataset.imagesReady !== 'true') return false;
        return [...document.images].filter(image => image.getClientRects().length && getComputedStyle(image).visibility !== 'hidden').every(image => image.complete && image.naturalWidth > 0);
      })()`, returnByValue: true });
      if (images.result?.value !== true) { await delay(100); continue; }
      if (wantsDarkCapture(prompt)) {
        const themed = await cdp('Runtime.evaluate', { expression: 'document.documentElement.dataset.theme === "dark" && document.querySelector(".mw-app")?.dataset.theme === "dark"', returnByValue: true });
        if (themed.result?.value !== true) { await delay(100); continue; }
      }
      if (hasFlag('todo-drawer') || /\bc (?:home|homescreen|chat)\b[\s\S]*\btodo drawer\b/i.test(prompt)) {
        const drawer = await cdp('Runtime.evaluate', { expression: 'document.querySelector(".composer-drawer-heading")?.getAttribute("aria-expanded") === "true" && !document.querySelector(".composer-drawer-reveal")?.getAnimations({subtree:true}).some(animation => animation.playState === "running")', returnByValue: true });
        if (drawer.result?.value !== true) { await delay(100); continue; }
        if (/\b(?:location|bucket) chip\b/i.test(prompt)) {
          const tagged = await cdp('Runtime.evaluate', { expression: '!!document.querySelector(".composer-drawer-content .bucket-tag")', returnByValue: true });
          if (tagged.result?.value !== true) { await delay(100); continue; }
        }
      }
      if (/\bc (?:home|homescreen)\b[^.\n]*todo added to chat field/i.test(prompt)) {
        const draft = await cdp('Runtime.evaluate', { expression: '!!document.querySelector("textarea[aria-label=Message]")?.value', returnByValue: true });
        if (!draft.result?.value) { await delay(100); continue; }
      }
      if (hasFlag('milestone-invite')) {
        const invitation = await cdp('Runtime.evaluate', { expression: `(() => { document.querySelector('.message-version-card')?.scrollIntoView({block:'nearest',behavior:'instant'}); return !!document.querySelector('.message-version-output.is-milestone-ready:not(.is-milestone-jumping) .milestone-falling-controls[data-settled=true]'); })()`, returnByValue: true });
        if (!invitation.result?.value) { await delay(100); continue; }
      }
      if (hasFlag('expanded-versions')) {
        const expanded = await cdp('Runtime.evaluate', { expression: `(() => {
          const fold = document.querySelector('.idea-refold');
          if (!fold) { document.querySelector('.idea-fold')?.click(); return false; }
          fold.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
          return true;
        })()`, returnByValue: true });
        if (!expanded.result?.value) { await delay(100); continue; }
      }
      if (hasFlag('brand-menu')) {
        await cdp('Runtime.evaluate', { expression: `(() => { const trigger = document.querySelector('button[aria-label="verso menu"]'); if (trigger?.getAttribute('aria-expanded') !== 'true') trigger?.click(); })()` });
        const menu = await cdp('Runtime.evaluate', { expression: `!!document.querySelector('.brand-dropdown:popover-open')`, returnByValue: true });
        if (!menu.result?.value) { await delay(100); continue; }
      }
      if (hasFlag('model-menu')) {
        await cdp('Runtime.evaluate', { expression: `(() => { const trigger = document.querySelector('button[aria-label="Model"]'); if (trigger?.getAttribute('aria-expanded') !== 'true') trigger?.click(); })()` });
        const menu = await cdp('Runtime.evaluate', { expression: `!!document.querySelector('[role="listbox"][aria-label="Model"]')`, returnByValue: true });
        if (!menu.result?.value) { await delay(100); continue; }
      }
      if (/time range dropdown/i.test(prompt)) {
        await cdp('Runtime.evaluate', { expression: `(() => { if (!document.querySelector('[role="listbox"][aria-label="Date range"]')) document.querySelector('button[aria-label="Date range"]')?.click(); })()` });
        const menu = await cdp('Runtime.evaluate', { expression: `!!document.querySelector('[role="listbox"][aria-label="Date range"]')`, returnByValue: true });
        if (!menu.result?.value) { await delay(100); continue; }
      }
      if ((hasFlag('milestone-overlay') || /milestone overlay/i.test(prompt)) && !wantsLiveCapture(prompt) && !wantsPrototypeCapture(prompt)) {
        const milestone = await cdp('Runtime.evaluate', { expression: `(() => {
          const button = document.querySelector('.message-version-output.is-milestone-ready .message-version-main');
          const clicked = !${milestoneRequested} && !!button;
          if (clicked) button.click();
          return { clicked, ready: !!document.querySelector('.milestone-overlay[open][data-entered=true] .annotation-preview')?.complete && !!document.querySelector('.milestone-overlay .annotation-text') };
        })()`, returnByValue: true });
        milestoneRequested ||= !!milestone.result?.value?.clicked;
        if (!milestone.result?.value?.ready) { await delay(100); continue; }
      }
      if (/idea stream[^.\n]*milestone edit/i.test(prompt)) {
        await cdp('Runtime.evaluate', { expression: `(() => { if (!document.querySelector('.idea-card .idea-editor')) [...document.querySelectorAll('.idea-milestone')].at(-1)?.click(); })()` });
        const editor = await cdp('Runtime.evaluate', { expression: `!!document.querySelector('.idea-card .idea-editor input[type=text]')`, returnByValue: true });
        if (!editor.result?.value) { await delay(100); continue; }
      }
      if (/capture (?:location|screen) (?:chip )?dropdown/i.test(prompt)) {
        await cdp('Runtime.evaluate', { expression: `(() => { if (!document.querySelector('[role="listbox"][aria-label="Capture screen"]')) document.querySelector('button[aria-label="Capture screen"]')?.click(); })()` });
        const menu = await cdp('Runtime.evaluate', { expression: `!!document.querySelector('[role="listbox"][aria-label="Capture screen"]')`, returnByValue: true });
        if (!menu.result?.value) { await delay(100); continue; }
      }
      if (wantsLandingCapture(prompt)||wantsChatCapture(prompt)||wantsTodosCapture(prompt)||wantsHomeCapture(prompt)) return;
      const shell = await cdp('Runtime.evaluate', { expression: '!!document.querySelector(".mw-reader .workspace") && !!document.querySelector("#main-navigation")', returnByValue: true });
      if (shell.result?.value === true) return;
    }
    await delay(100);
  }
  throw new Error('Timed out waiting for the requested diagram and gallery capture state');
}

async function capture(chrome, outFile, prompt = '') {
  if (typeof WebSocket !== 'function') {
    throw new Error('Node WebSocket is required to capture focused progress screenshots.');
  }
  const userDataDir = join(tmpdir(), `mitwerk-chrome-screenshot-${process.pid}`);
  mkdirSync(userDataDir, { recursive: true });
  const child = spawn(
    chrome,
    [
      '--headless',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-crash-reporter',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0',
      '--remote-allow-origins=*',
      `--user-data-dir=${userDataDir}`,
      '--high-dpi-support=1',
      '--force-device-scale-factor=2',
      '--window-size=1440,900',
      screenshotUrl(prompt),
    ],
    { detached: true, stdio: ['ignore', 'ignore', 'pipe'] },
  );

  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  try {
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('spawn', resolve);
    });
    const raw = await waitForFile(join(userDataDir, 'DevToolsActivePort'), 8000);
    const port = Number(raw.split('\n')[0]);
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error(`Invalid Chrome DevTools port: ${raw.trim()}`);
    }
    const page = await waitForPage(port);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await waitForSocket(ws);
    const cdp = createCdp(ws);
    if (argValue('viewport-width') || argValue('viewport-height')) {
      const width = Number(argValue('viewport-width', '1440'));
      const height = Number(argValue('viewport-height', '900'));
      if (![width, height].every(value => Number.isInteger(value) && value >= 320 && value <= 7680)) throw new Error('Capture viewport dimensions must be integers between 320 and 7680');
      await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false });
    }
    await waitForScreenshotReady(cdp, hasFlag('milestone-overlay') ? 60000 : (wantsLandingCapture(prompt) || hasFlag('milestone-invite')) ? 20000 : (wantsPrototypeCapture(prompt) || wantsLiveCapture(prompt) || new URL(url).searchParams.get('annotationOverlay') === '1') ? 60000 : wantsTheaterCapture(prompt) ? 30000 : 10000, prompt);
    await cdp('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true, returnByValue: true });
    const chatPrompt = argValue('chat-prompt');
    if (chatPrompt) {
      const composer = await cdp('Runtime.evaluate', { expression: '(() => { const input = document.querySelector(".mw-composer textarea"); input?.focus(); return !!input; })()', returnByValue: true });
      if (!composer.result?.value) throw new Error('Chat prompt capture needs an open conversation');
      const before = await cdp('Runtime.evaluate', { expression: 'document.querySelectorAll(".mw-message").length', returnByValue: true });
      await cdp('Input.insertText', { text: chatPrompt });
      for (let attempt = 0; attempt < 50; attempt++) {
        const enabled = await cdp('Runtime.evaluate', { expression: `!!document.querySelector('button[aria-label="Send message"]:not(:disabled)')`, returnByValue: true });
        if (enabled.result?.value) break;
        await delay(50);
      }
      await cdp('Runtime.evaluate', { expression: `document.querySelector('button[aria-label="Send message"]')?.click()` });
      let finished = false;
      for (let attempt = 0; attempt < 200; attempt++) {
        const reply = await cdp('Runtime.evaluate', { expression: `(() => {
          const message = document.querySelector('.mw-message:last-child:not(.from-user)');
          return document.querySelectorAll('.mw-message').length >= ${Number(before.result?.value) + 2} && !!message && !message.querySelector('.printed-text') && !!message.querySelector('.message-version-output:not([hidden])');
        })()`, returnByValue: true });
        if (reply.result?.value) { finished = true; break; }
        await delay(100);
      }
      if (!finished) throw new Error('Chat prompt capture timed out waiting for the completed version card');
      await waitForScreenshotReady(cdp, 60000, prompt);
    }
    if (hasFlag('milestone-overlay')) await delay(700);
    if (hasFlag('milestone-editor')) {
      await cdp('Runtime.evaluate', { expression: `(() => { const wip = document.querySelector('.idea-wip-action'); if (!wip?.querySelector('.idea-editor')) wip?.querySelector('button')?.click(); })()` });
      await delay(100);
      const editor = await cdp('Runtime.evaluate', { expression: `!!document.querySelector('.idea-wip-action .idea-editor')`, returnByValue: true });
      if (!editor.result?.value) throw new Error('Milestone editor capture needs the Idea stream WIP card');
    }
    const annotationKind = argValue('annotation-kind');
    if (annotationKind) {
      await cdp('Runtime.evaluate', { expression: `document.querySelector('.annotation-create')?.click()` });
      await delay(100);
      const chosen = await cdp('Runtime.evaluate', { expression: `(() => { const option = [...document.querySelectorAll('.annotation-kind-select label')].find(label => label.textContent.toLowerCase() === ${JSON.stringify(annotationKind.toLowerCase())})?.querySelector('input'); option?.click(); return !!option; })()`, returnByValue: true });
      if (!chosen.result?.value) throw new Error(`Annotation kind unavailable: ${annotationKind}`);
      await delay(100);
    }
    if (/edit annotation overlay/i.test(prompt)) {
      const note = await cdp('Runtime.evaluate', { expression: `(() => {
        const item = document.querySelector('.annotation-list button');
        if (!item) return null;
        item.scrollIntoView({ block: 'nearest' });
        const rect = item.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`, returnByValue: true });
      if (!note.result?.value) throw new Error('The requested edit capture needs a frame with an existing annotation');
      await delay(500);
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...note.result.value });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...note.result.value });
      await delay(550);
      const edited = await cdp('Runtime.evaluate', { expression: `!!document.querySelector('.annotation-overlay[aria-label^="Edit "] .annotation-text')?.value`, returnByValue: true });
      if (!edited.result?.value) throw new Error('Annotation edit capture did not open a populated editor');
    }

    if (['frontal', 'top', 'overhead'].includes(argValue('gallery-view'))) {
      await cdp('Runtime.evaluate', { expression: `document.querySelector('.album-webgl canvas, canvas[aria-label^="3D iteration gallery"]')?.focus()` });
      if (argValue('gallery-view') === 'overhead') {
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 't', code: 'KeyT', windowsVirtualKeyCode: 84 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 't', code: 'KeyT', windowsVirtualKeyCode: 84 });
      } else {
        // Exercise the normal keyboard orbit, retaining the reset composition.
        for (let step = 0; step < 3; step++) {
          await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
          await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
        }
        if (argValue('gallery-view') === 'top') {
          for (let step = 0; step < 8; step++) {
            await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
            await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
          }
        }
      }
    }
    if (hasFlag('work-state-hidden')) {
      await cdp('Runtime.evaluate', { expression: 'document.activeElement?.blur()' });
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: '-', code: 'Minus' });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: '-', code: 'Minus' });
      await delay(600);
      const hidden = await cdp('Runtime.evaluate', { expression: 'document.querySelector(".work-state-simulator")?.getAttribute("aria-hidden") === "true"', returnByValue: true });
      if (!hidden.result?.value) throw new Error('The simulator did not hide for the requested capture');
    }
    await delay(['top', 'overhead'].includes(argValue('gallery-view')) ? 500 : 150);
    const hoverLabel = argValue('hover-label');
    if (hoverLabel) {
      const hovered = await cdp('Runtime.evaluate', { expression: `(() => {
        const label = [...document.querySelectorAll('.album-axis-label > span')].find(element => element.textContent === ${JSON.stringify(hoverLabel)} && !element.parentElement.hidden && +getComputedStyle(element.parentElement).opacity > .05);
        if (!label) return null;
        const rect = label.getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`, returnByValue: true });
      if (!hovered.result?.value) throw new Error(`Could not find gallery label: ${hoverLabel}`);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...hovered.result.value });
      await delay(150);
      const result = await cdp('Runtime.evaluate', { expression: `document.querySelector('.album-axis-label.is-hovered')?.textContent`, returnByValue: true });
      if (result.result?.value !== hoverLabel) throw new Error(`Gallery label was not hovered: ${hoverLabel}`);
    }
    const hoverControl = argValue('hover-control');
    if (hoverControl) {
      const hovered = await cdp('Runtime.evaluate', { expression: `(() => {
        const control = [...document.querySelectorAll('button[aria-label]')].find(button => button.getAttribute('aria-label') === ${JSON.stringify(hoverControl)});
        if (!control) return null;
        const rect = control.getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`, returnByValue: true });
      const point = hovered.result?.value;
      if (!point) throw new Error(`Could not find capture hover control: ${hoverControl}`);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
      await delay(150);
    }
    if (wantsTipHover(prompt)) {
      const hovered = await cdp('Runtime.evaluate', { expression: `(() => {
        const control = document.querySelector('[aria-label="Gallery navigation help"]');
        if (!control) return null;
        const rect = control.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`, returnByValue: true });
      const point = hovered.result?.value;
      if (!point) throw new Error('Could not find the gallery info tip');
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
      const opened = Date.now();
      let tipOpen = false;
      while (Date.now() - opened < 2000) {
        const result = await cdp('Runtime.evaluate', { expression: '!!document.querySelector(".info-tooltip-content")', returnByValue: true });
        if (result.result?.value === true) { tipOpen = true; break; }
        await delay(50);
      }
      if (!tipOpen) throw new Error('Gallery info tip did not open');
    }
    if (hasFlag('confetti') || /\bc chat (?:and|&) playback\b[^.\n]*\bconfetti\b/i.test(prompt)) {
      const burst = await cdp('Runtime.evaluate', { expression: `new Promise(resolve => {
        const button = document.querySelector('.annotation-milestone-icon:not(:disabled)');
        if (!button) { resolve(false); return; }
        button.click();
        const start = performance.now();
        const freeze = () => {
          const animations = document.querySelector('.milestone-confetti')?.getAnimations({subtree:true}) ?? [];
          if (animations.length) { animations.forEach(animation => { animation.pause(); animation.currentTime = 450; }); resolve(true); }
          else if (performance.now() - start < 1000) requestAnimationFrame(freeze);
          else resolve(false);
        };
        requestAnimationFrame(freeze);
      })`, awaitPromise: true, returnByValue: true });
      if (!burst.result?.value) {
        const state = await cdp('Runtime.evaluate', { expression: `JSON.stringify({url:location.href, trophy:document.querySelector('.annotation-milestone-icon')?.outerHTML, reduced:matchMedia('(prefers-reduced-motion: reduce)').matches, confetti:!!document.querySelector('.milestone-confetti')})`, returnByValue:true });
        throw new Error('Confetti capture needs an active milestone trophy: ' + (state.result?.value ?? JSON.stringify(burst)));
      }
    }
    const shot = await cdp('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(outFile, Buffer.from(shot.data, 'base64'));
    ws.close();
    if (!existsSync(outFile) || statSync(outFile).size < 1000) {
      throw new Error('Chrome screenshot was empty.');
    }
  } catch (error) {
    const detail = stderr.trim();
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(detail ? `${message} ${detail}` : message);
  } finally {
    stopProcess(child);
  }
}

function captureLog(message) {
  mkdirSync(screenshotsDir, { recursive: true });
  appendFileSync(captureLogFile, `${new Date().toISOString()} ${message}\n`);
}

function publishSavedCapture(outFile) {
  try {
    enqueueCapturePublication(root, outFile);
    captureLog(`Blob publication queued: ${basename(outFile)}`);
  } catch (error) {
    const message = `Capture saved, but Blob publication could not be queued: ${error.message}`;
    captureLog(message);
    console.error(message);
  }
}

function readPushMarker() {
  return existsSync(pushMarkerFile) ? readFileSync(pushMarkerFile, 'utf8').trim() : '';
}

function writePushMarker(sha) {
  mkdirSync(screenshotsDir, { recursive: true });
  writeFileSync(pushMarkerFile, `${sha}\n`);
}

function newestUntrackedPushScreenshot(subject) {
  try {
    if (!existsSync(screenshotsDir)) return '';
    const needle = sanitizeMessage(subject, 'commit');
    const names = readdirSync(screenshotsDir)
      .filter((name) => name.startsWith('[push') && name.includes(needle));
    if (!names.length) return '';
    names.sort();
    return join(screenshotsDir, names.at(-1));
  } catch {
    return '';
  }
}

function pushCountFromName(name) {
  const match = String(name).match(/\[push #(\d+)\]/i);
  return match ? Number(match[1]) : 0;
}

function pushMessageFromFilename(name) {
  const trimmed = String(name).replace(/-\d{4}-\d{2}-\d{2}-\d{6}(?:\.png)?$/, '');
  const parts = trimmed.split(' · ');
  return parts.length > 1 ? parts.at(-1) : '';
}

function readPushShas() {
  try {
    return JSON.parse(readFileSync(pushShaFile, 'utf8'));
  } catch {
    return {};
  }
}

/** Enter prototype loads a push from Git on demand; the push only needs its exact commit recorded. */
function recordPushSha({ sha, count }) {
  if (!count) return '';
  const resolved = git(['rev-parse', sha]);
  const shas = readPushShas();
  if (shas[count] === resolved) {
    captureLog(`push sha skip: #${count} ${resolved}`);
    return resolved;
  }
  if (shas[count]) {
    captureLog(`push sha keep: #${count} already ${shas[count]}, not ${resolved}`);
    return shas[count];
  }
  shas[count] = resolved;
  const sorted = Object.fromEntries(Object.entries(shas).sort(([a], [b]) => Number(a) - Number(b)));
  mkdirSync(dirname(pushShaFile), { recursive: true });
  writeFileSync(pushShaFile, `${JSON.stringify(sorted, null, 2)}\n`);
  captureLog(`push sha #${count} ${resolved}`);
  return resolved;
}

function findCommitBySubject(message) {
  const needle = sanitizeMessage(message, 'commit');
  if (!needle) return null;
  const rows = git(['log', '--pretty=%H%x09%s']).split('\n').filter(Boolean);
  for (const row of rows) {
    const tab = row.indexOf('\t');
    const sha = tab >= 0 ? row.slice(0, tab) : row;
    const subject = tab >= 0 ? row.slice(tab + 1) : '';
    if (subject === 'chore: progress screenshot') continue;
    const cleaned = sanitizeMessage(subject, 'commit');
    if (cleaned === needle || cleaned.startsWith(needle) || needle.startsWith(cleaned)) {
      return { sha, subject };
    }
  }
  return null;
}

function backfillPushShas() {
  if (!existsSync(screenshotsDir)) {
    throw new Error(`Missing ${frameCaptureDirName}`);
  }
  const known = readPushShas();
  const entries = readdirSync(screenshotsDir)
    .map((name) => ({ name, count: pushCountFromName(name) }))
    .filter((entry) => entry.count > 0 && entry.name.startsWith('[push') && !known[entry.count]);
  entries.sort((a, b) => a.count - b.count);
  const saved = [];
  for (const entry of entries) {
    const message = pushMessageFromFilename(entry.name);
    const commit = findCommitBySubject(message);
    if (!commit) {
      captureLog(`backfill miss: push #${entry.count} ${message}`);
      continue;
    }
    saved.push(`push #${entry.count} ${recordPushSha({ sha: commit.sha, count: entry.count })}`);
  }
  return saved;
}

function renameIfNeeded(from, to) {
  if (from === to || !existsSync(from)) return '';
  if (existsSync(to)) {
    captureLog(`relabel skip exists ${basename(to)}`);
    return '';
  }
  renameSync(from, to);
  return to;
}

function relabelFrames() {
  const renamed = [];
  if (existsSync(screenshotsDir)) {
    for (const name of readdirSync(screenshotsDir)) {
      if (name.startsWith('[prompt') && /\] \d+ files? · /.test(name)) {
        const next = name.replace(/^(\[prompt(?: #\d+)?\]) \d+ files? · /, '$1 ');
        const dest = renameIfNeeded(join(screenshotsDir, name), join(screenshotsDir, next));
        if (dest) renamed.push(dest);
        continue;
      }
      if (!name.startsWith('[push') || /· \+\d+ -\d+ ·/.test(name)) continue;
      const message = pushMessageFromFilename(name);
      const commit = findCommitBySubject(message);
      if (!commit) {
        captureLog(`relabel miss push ${name}`);
        continue;
      }
      const base = parentSha(commit.sha);
      const { added, deleted } = countLineChanges(commit.sha, base);
      const next = name.replace(/^(\[push #\d+\] \d+ files? · )(?!\+)/, `$1${lineLabel(added, deleted)} · `);
      const dest = renameIfNeeded(join(screenshotsDir, name), join(screenshotsDir, next));
      if (dest) renamed.push(dest);
    }
  }
  return renamed;
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
  if (readPushMarker() === sha) {
    captureLog(`reconcile skip: already captured ${sha}`);
    return '';
  }
  const pending = newestUntrackedPushScreenshot(subject);
  if (!acquireCaptureLock()) {
    captureLog('reconcile skip: capture lock held');
    return '';
  }
  try {
    const base = parentSha(sha);
    let outFile = pending;
    if (!outFile) {
      captureLog(`reconcile capture ${sha} ${subject}`);
      outFile = await takeScreenshot({ tag: 'push', label: subject, sha, base });
    } else {
      captureLog(`reconcile reuse ${outFile}`);
      try {
        recordPushSha({ sha, count: pushCountFromName(basename(outFile)) });
      } catch (error) {
        captureLog(`push sha failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    writePushMarker(sha);
    if (commitAndPush) {
      captureLog(`reconcile saved local screenshot ${outFile}`);
    }
    publishSavedCapture(outFile);
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
  const message = `${wantsLandingCapture(label) ? '[screen landing] ' : ''}${sanitizeMessage(label, tag === 'prompt' ? 'prompt' : 'commit')}`;
  const overwrite = tag === 'prompt' && (hasFlag('recapture-last') || argValue('recapture-prompt') || /recapture last prompt/i.test(label) && /overwrite/i.test(label));
  if (overwrite) {
    const number = name => Number(/^\[prompt #(\d+)\]/i.exec(name)?.[1] ?? 0);
    const prompts = readdirSync(screenshotsDir).filter(name => /^\[prompt #\d+\]/i.test(name)).sort((a, b) => number(a) - number(b));
    const kept = [];
    for (const name of prompts) {
      if (/recapture last prompt/i.test(name)) unlinkSync(join(screenshotsDir, name));
      else kept.push(name);
    }
    const requested = argValue('recapture-prompt');
    const previous = requested ? kept.find(name => number(name) === Number(requested)) : kept.at(-1);
    if (requested && !previous) throw new Error('The requested capture to repair does not exist.');
    if (previous) {
      const outFile = join(screenshotsDir, previous);
      await capture(chrome, outFile, label);
      return outFile;
    }
  }
  const requestedPrompt = tag === 'prompt' ? argValue('prompt-number') : '';
  const requestedCount = Number(requestedPrompt);
  const nextCount = nextTagCount(screenshotsDir, tag);
  // A concurrent chat may finish a later reserved prompt first. Fill the unused slot
  // without overwriting an existing capture or moving the shared counter backwards.
  const requestedExists = requestedPrompt && readdirSync(screenshotsDir).some(name => Number(/^\[prompt #(\d+)\]/i.exec(name)?.[1]) === requestedCount);
  if (requestedPrompt && (!Number.isSafeInteger(requestedCount) || requestedCount < 1 || requestedExists)) throw new Error('Requested prompt number must be a positive unused integer.');
  const count = requestedCount || nextCount;
  if (tag === 'prompt') {
    const logPath = join(root, 'docs/prompt-log.md');
    mkdirSync(dirname(logPath), { recursive: true });
    const before = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '# Full prompt log\n';
    const after = appendPromptEntry(before, count, label);
    if (after !== before) writeFileSync(logPath, after);
  }
  const files = tag === 'push' ? countChangedFiles(tag, sha, base) : 0;
  const lines = tag === 'push' ? countLineChanges(sha, base) : countWorkingTreeLineChanges();
  const filename = `${frameStem({ tag, count, files, ...lines, message })}-${timecode()}.png`;
  const outFile = join(screenshotsDir, filename);
  await capture(chrome, outFile, label);
  if (tag === 'push') {
    try {
      recordPushSha({ sha, count });
    } catch (error) {
      captureLog(`push sha failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return outFile;
}

async function main() {
  const hookMode = hasFlag('hook-mode');
  const failOpen = hookMode || hasFlag('fail-open');
  if (hasFlag('backfill-push-shas')) {
    const saved = backfillPushShas();
    for (const line of saved) console.log(line);
    if (!saved.length) console.log('No new push commits to record.');
    return;
  }
  if (hasFlag('relabel-frames')) {
    const saved = relabelFrames();
    for (const dest of saved) console.log(dest);
    if (!saved.length) console.log('No frame names to update.');
    return;
  }
  const raw = hasFlag('from-stdin') || hookMode ? await readStdin() : '';
  const payload = parsePayload(raw);
  const event = payload.hook_event_name ?? '';

  if (hookMode && event === 'beforeSubmitPrompt') {
    const id = conversationId(payload);
    const mode = composerMode(payload) || 'unknown';
    captureLog(`prompt submit mode=${mode}${mode === 'unknown' ? ` keys=${Object.keys(payload).join(',')}` : ''}`);
    const submitted = textFromUnknown(payload.prompt) || '';
    if (isAskMode(payload) || excludesCounter(submitted)) {
      saveSkip(id);
      captureLog(`skip ${isAskMode(payload) ? 'ask' : 'x counter'} prompt (${mode})`);
      emitHook({ continue: true });
      return;
    }
    clearSkip(id);
    saveStash(id, textFromUnknown(payload.prompt) || 'prompt');
    emitHook({ continue: true });
    return;
  }

  if (hasFlag('reconcile-push') || event === 'afterShellExecution') {
    const command = hookCommand(payload);
    if (event === 'afterShellExecution' && command && !/\bgit\s+push\b/.test(command)) {
      if (hookMode) emitHook({});
      return;
    }
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
  const label = (argValue('label-file') ? readFileSync(argValue('label-file'), 'utf8') : argValue('label'))
    || (tag === 'prompt' ? labelFromHook(payload) : git(['log', '-1', '--pretty=%s', sha]));

  if (!hookMode && tag === 'prompt' && !hasFlag('manual-prompt')) {
    console.error('Skipped. The stop hook saves the one prompt capture from the user prompt, including its cued location.');
    return;
  }

  let promptLock = false;
  try {
    if (hookMode && tag === 'prompt' && (shouldSkipAskScreenshot(payload) || excludesCounter(label))) {
      clearSkip(conversationId(payload));
      captureLog(`skip ask screenshot (${composerMode(payload) || 'stashed'})`);
      emitHook({});
      return;
    }
    if (process.env.MITWERK_SCREENSHOT_SKIP === '1') {
      if (hookMode) {
        emitHook({});
      }
      return;
    }
    if (tag === 'prompt' && !hasFlag('recapture-last') && !argValue('recapture-prompt') && promptAlreadyCaptured(label)) {
      captureLog('prompt skip: already captured this prompt');
      if (hookMode) emitHook({});
      return;
    }
    if (tag === 'prompt') {
      if (!acquireCaptureLock()) {
        captureLog('prompt skip: capture already running');
        if (hookMode) emitHook({});
        return;
      }
      promptLock = true;
    }
    if (tag === 'push') {
      const resolved = git(['rev-parse', sha]);
      const known = Object.entries(readPushShas()).find(([, value]) => value === resolved);
      if (known && existsSync(screenshotsDir)) {
        const existing = readdirSync(screenshotsDir).find((name) => name.startsWith(`[push #${known[0]}]`));
        if (existing) {
          captureLog(`push skip: #${known[0]} already recorded for ${resolved}`);
          console.log(join(screenshotsDir, existing));
          return;
        }
      }
    }
    const outFile = await takeScreenshot({ tag, label, sha, base });
    if (tag === 'prompt') {
      stampPrompt(label);
      writePromptCounter(outFile);
    }
    publishSavedCapture(outFile);
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
    process.exitCode = 1;
  } finally {
    if (promptLock) releaseCaptureLock();
  }
}

await main();
