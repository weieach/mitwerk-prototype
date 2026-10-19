import test from 'node:test';
import assert from 'node:assert/strict';
import { chatSlide, effectiveProgress, existedAt, isSimulating, simulateCaptures, simulateGitHistory, simulatedCount, workStateStore, workStateTokens } from '../src/shared/work-state.ts';
import type { GitHistory } from '../src/features/version-tree/git-history.ts';

const capture = (id: string, timestamp: number) => ({ id, filename: id, timestamp });

test('work state replays captures chronologically from empty to the current workspace', () => {
  const captures = [capture('c', 30), capture('a', 10), capture('b', 20)];
  assert.equal(simulatedCount(3, 0), 0);
  assert.equal(simulatedCount(3, .5), 2);
  assert.equal(simulatedCount(3, 1), 3);
  const empty = simulateCaptures(captures, 0);
  assert.deepEqual(empty.captures, []);
  assert.equal(empty.cutoff, -Infinity);
  const partial = simulateCaptures(captures, 2);
  assert.deepEqual(partial.captures.map(item => item.id), ['a', 'b']);
  assert.equal(partial.cutoff, 29); // Work done before the next capture belongs to this state.
  assert.equal(partial.now, 20);
  const current = simulateCaptures(captures, 3);
  assert.equal(current.complete, true);
  assert.equal(current.cutoff, Infinity);
});

test('simulated Git history rewinds branch tips to their newest commit before the cutoff', () => {
  const git: GitHistory = { currentBranch: 'main', head: 'c3', merges: [{ branch: 'main', source: 'feature', sha: 'c3', fastForward: false }],
    commits: [{ sha: 'c1', parents: [], subject: 'one', timestamp: 10, branch: null }, { sha: 'c2', parents: ['c1'], subject: 'two', timestamp: 20, branch: null }, { sha: 'c3', parents: ['c2'], subject: 'three', timestamp: 30, branch: null }],
    branches: [{ name: 'main', tip: 'c3', base: null }, { name: 'late', tip: 'c3', base: 'c3' }] };
  const past = simulateGitHistory(git, 25);
  assert.deepEqual(past.commits.map(commit => commit.sha), ['c1', 'c2']);
  assert.equal(past.branches.find(ref => ref.name === 'main')?.tip, 'c2');
  assert.equal(past.head, 'c2');
  assert.deepEqual(past.merges, []);
  assert.deepEqual(simulateGitHistory(git, -Infinity).branches, []);
  assert.equal(simulateGitHistory(git, Infinity), git);
});

test('the chat is a slideshow of short windows, never an accumulation', () => {
  const messages = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'mit' : 'user', id: i }));
  assert.equal(chatSlide(messages, 0).messages.length, 0);
  assert.equal(chatSlide(messages, 1).messages.length, 10);
  const slides = [.1, .3, .6, .9].map(progress => chatSlide(messages, progress));
  assert.equal(new Set(slides.map(slide => slide.key)).size, workStateTokens.chatSlides);
  for (const slide of slides) assert.ok(slide.messages.length <= workStateTokens.chatExchanges * 2);
  assert.equal(slides[0].messages[0].role, 'user');
});

test('dated records exist only up to the cutoff; undated ones only vanish in the empty state', () => {
  assert.equal(existedAt('2026-10-01T00:00:00Z', Infinity), true);
  assert.equal(existedAt(50, 40), false);
  assert.equal(existedAt(30, 40), true);
  assert.equal(existedAt(undefined, 40), true);
  assert.equal(existedAt(undefined, -Infinity), false);
});

test('slider moves apply after the settle delay, and release applies at once', async () => {
  workStateStore.open();
  assert.equal(workStateStore.get().loading, true);
  workStateStore.ready();
  workStateStore.setProgress(.4);
  assert.equal(workStateStore.get().progress, .4);
  assert.equal(workStateStore.get().applied, 1);
  await new Promise(resolve => setTimeout(resolve, workStateTokens.settleMs + 30));
  assert.equal(workStateStore.get().applied, .4);
  workStateStore.setProgress(.2);
  workStateStore.commit();
  assert.equal(workStateStore.get().applied, .2);
  // Closing keeps the simulated state; reopening resumes it without warming images again.
  workStateStore.setProgress(.3);
  workStateStore.close();
  assert.deepEqual(workStateStore.get(), { open: false, hidden: false, progress: .3, applied: .3, loading: false });
  assert.equal(isSimulating(workStateStore.get()), true);
  assert.equal(effectiveProgress(workStateStore.get()), .3);
  workStateStore.open();
  assert.deepEqual(workStateStore.get(), { open: true, hidden: false, progress: .3, applied: .3, loading: false });
  workStateStore.setProgress(1);
  workStateStore.close();
  assert.equal(isSimulating(workStateStore.get()), false);
});

test('a simulated album grows from its far end while its first versions keep their place', async () => {
  const { buildVersions, representativeFrames } = await import('../src/features/iteration-gallery/model.ts');
  const { buildAlbum } = await import('../src/features/iteration-gallery/geometry.ts');
  const frames = Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, filename: `f${i}`, url: `f${i}.png`, width: 1440, height: 900, kind: i % 2 ? 'push' as const : 'prompt' as const,
    number: i % 2 ? (i + 1) / 2 : i, branch: null, timestamp: i * 10, summary: `f${i}`, added: null, removed: null }));
  const full = buildVersions(frames);
  const partial = buildVersions(simulateCaptures(frames, 6).captures);
  const anchored = buildAlbum(partial, 'all', 0, full), complete = buildAlbum(full, 'all', 0);
  assert.equal(anchored.depth, complete.depth);
  assert.deepEqual(anchored.blocks.slice(0, 3).map(block => [block.start, block.end]), complete.blocks.slice(0, 3).map(block => [block.start, block.end]));
  // Start-anchored sampling keeps earlier samples as versions are added.
  const before = representativeFrames(partial, 'all', 0, 'start').map(frame => frame.id);
  const after = representativeFrames(full, 'all', 0, 'start').map(frame => frame.id);
  assert.deepEqual(after.slice(0, before.length - 1), before.slice(0, -1));
});

test('while simulating, the date axis drops the newest prompt and keeps one tick per day', async () => {
  const { dateTicks } = await import('../src/features/iteration-gallery/model.ts');
  const day = (hour: number) => new Date(2026, 9, 1, hour).getTime();
  const frames = [{ id: 'morning', timestamp: day(9), kind: 'prompt' }, { id: 'newest', timestamp: day(17), kind: 'prompt' }]
    .map(frame => ({ ...frame, filename: frame.id, url: '', width: 1, height: 1, number: 1, branch: null, summary: '', added: null, removed: null, version: 1, position: 0 })) as Parameters<typeof dateTicks>[0];
  assert.deepEqual(dateTicks(frames).map(tick => tick.id), ['morning', 'newest']);
  assert.deepEqual(dateTicks(frames, { latestPrompt: false }).map(tick => tick.id), ['morning']);
});

test('hiding the simulator keeps its session active while closing ends it', () => {
  workStateStore.open(); workStateStore.ready();
  workStateStore.setProgress(.6); workStateStore.commit();
  workStateStore.hide();
  assert.equal(workStateStore.get().open, true);
  assert.equal(workStateStore.get().hidden, true);
  assert.equal(workStateStore.get().applied, .6);
  workStateStore.show();
  assert.equal(workStateStore.get().hidden, false);
  workStateStore.hide(); workStateStore.toggle();
  assert.equal(workStateStore.get().open, true);
  assert.equal(workStateStore.get().hidden, false);
  workStateStore.close(); workStateStore.show(); workStateStore.hide();
  assert.equal(workStateStore.get().open, false);
  assert.equal(workStateStore.get().hidden, false);
  assert.equal(workStateStore.get().applied, .6);
});
