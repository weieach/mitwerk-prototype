import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultChatWidth } from '../src/features/workbench/workspace-responsive.ts';

test('default chat width widens from 1600px independently of the content cap', () => {
  assert.equal(defaultChatWidth(1512), 440);
  assert.equal(defaultChatWidth(1599), 500);
  assert.equal(defaultChatWidth(1600), 576);
  assert.equal(defaultChatWidth(1875), 675);
  assert.ok(Math.abs(defaultChatWidth(2560) - 921.6) < .001);
});
