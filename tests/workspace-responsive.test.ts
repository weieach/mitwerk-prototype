import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultChatWidth } from '../src/features/workbench/workspace-responsive.ts';

test('default chat width widens from 1600px but never exceeds 575px', () => {
  assert.equal(defaultChatWidth(1512), 440);
  assert.equal(defaultChatWidth(1599), 500);
  assert.equal(defaultChatWidth(1600), 575);
  assert.equal(defaultChatWidth(1875), 575);
  assert.equal(defaultChatWidth(2560), 575);
});
