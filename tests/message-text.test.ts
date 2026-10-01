import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleMessageText } from '../src/features/workbench/message-text.ts';

test('legacy annotation metadata is hidden while note and following message remain intact', () => {
 const text='[Frame annotation sample-1]\nPrompt #252 · v27\nSaved frame summary\nReference: gallery/very-long-filename.png\n\nFix the task header.\n\nKeep the current spacing.';
 assert.equal(visibleMessageText(text),'Fix the task header.\n\nKeep the current spacing.');
});
test('ordinary user text mentioning reference files stays unchanged', () => {
 const text='Check index.html.\nReference: design.png\n\nKeep this file name in my instructions.';
 assert.equal(visibleMessageText(text),text);
});
