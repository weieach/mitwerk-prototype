import test from 'node:test';
import assert from 'node:assert/strict';
import { scriptedReply, chatWidthPrompt } from '../src/features/workbench/scripted-replies.ts';
import type { Capture } from '../src/features/iteration-gallery/model.ts';
import { hydratePromptMessages, seedTasks } from '../src/features/workbench/model.ts';

test('only the exact scripted phrase produces a plain session result with successive version numbers', () => {
  const captures = [
    { kind: 'push', number: 52, timestamp: 1, url: 'push.png' },
    { kind: 'prompt', number: 503, timestamp: 2, url: 'latest.png' },
  ] as Capture[];
  for (const text of ['Increase the max width of chat panel.', chatWidthPrompt.toLowerCase(), 'hello']) assert.equal(scriptedReply(text, captures), null);
  const reply = scriptedReply(chatWidthPrompt, captures)!;
  assert.equal(reply.versionOutput.version, 53);
  assert.equal(reply.versionOutput.prompt, 504);
  assert.equal(reply.versionOutput.imageUrl, 'latest.png');
  assert.equal(reply.versionOutput.inviteMilestone, false);
  assert.equal(reply.demoAction, 'refresh-live');
  const message = { ...reply, id: 'demo', role: 'mit' as const, name: 'Agent', time: 'now', sessionOnly: true };
  const next = scriptedReply(chatWidthPrompt, captures, [message])!;
  assert.equal(next.versionOutput.version, 54);
  assert.equal(next.versionOutput.prompt, 505);
  const task = { ...seedTasks()[0], messages: [message] };
  assert.equal(hydratePromptMessages([task], [{ ...captures[1], number: 504 }])[0].messages[0], message);
});
