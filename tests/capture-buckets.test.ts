import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaptureBucketStore, durableCaptureScreen } from '../src/shared/capture-buckets.ts';

test('session buckets notify both selectors once, deduplicate names, and reset in a fresh session', () => {
 const store = createCaptureBucketStore();
 let composerUpdates = 0, readerUpdates = 0;
 const unsubscribe = store.subscribe(() => composerUpdates++);
 store.subscribe(() => readerUpdates++);
 assert.equal(store.add('  Review states  '), 'Review states');
 assert.equal(composerUpdates, 1);
 assert.equal(readerUpdates, 1);
 assert.equal(store.getSnapshot().at(-1)?.value, 'Review states');
 assert.equal(store.add('review STATES'), 'Review states');
 assert.equal(store.add('   '), null);
 assert.equal(composerUpdates, 1);
 assert.equal(store.add('LANDING'), 'landing');
 unsubscribe();
 store.add('Empty bucket');
 assert.equal(composerUpdates, 1);
 assert.equal(readerUpdates, 2);
 assert.deepEqual(createCaptureBucketStore().getSnapshot().map(bucket => bucket.value), ['homescreen', 'landing']);
});

test('temporary selections are not persisted over reload', () => {
 assert.equal(durableCaptureScreen('Review states'), 'homescreen');
 assert.equal(durableCaptureScreen('landing'), 'landing');
 assert.equal(durableCaptureScreen('homescreen'), 'homescreen');
});
