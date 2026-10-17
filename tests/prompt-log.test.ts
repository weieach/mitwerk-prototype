import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { appendPromptEntry, parsePromptLog } from '../src/shared/prompt-log.mjs';
import { readCaptureCatalog } from '../server/gallery-catalog.ts';
import { theaterCaption } from '../src/features/iteration-gallery/theater-layout.ts';

test('prompt log round-trips multiline Markdown without truncating or interpreting embedded fences',()=>{
 const text='Keep the full prompt.\n```ts\nconst value = `hello`;\n```\n## Prompt #999\n'+'Long text '.repeat(80)+'\n[reference](https://example.com)';
 const log=appendPromptEntry('# Full prompt log\n',274,text);
 assert.equal(parsePromptLog(log).get(274),text);
 assert.equal(parsePromptLog(log).has(999),false);
 assert.equal(appendPromptEntry(log,274,text),log);
 assert.throws(()=>appendPromptEntry(log,274,'different request'),/already has different text/);
 assert.equal(theaterCaption({kind:'prompt',summary:'short filename',fullPrompt:text}),text);
});

test('capture catalog joins full prompts by counter and preserves legacy summaries',()=>{
 const root=mkdtempSync(join(tmpdir(),'mitwerk-prompt-log-'));
 try {
  mkdirSync(join(root,'docs'));mkdirSync(join(root,'[frame capture] screenshots'));
  writeFileSync(join(root,'docs/prompt-log.md'),appendPromptEntry('# Full prompt log\n',274,'Full request\nwith its second line.'));
  const png=Buffer.alloc(24);png.writeUInt32BE(0x89504e47,0);png.writeUInt32BE(0x0d0a1a0a,4);png.write('IHDR',12);png.writeUInt32BE(1440,16);png.writeUInt32BE(900,20);
  writeFileSync(join(root,'[frame capture] screenshots','[prompt #274] short-2026-10-17-090004.png'),png);
  writeFileSync(join(root,'[frame capture] screenshots','[prompt #273] short-2026-10-17-090003.png'),png);
  const frames=readCaptureCatalog(root).frames;
  assert.equal(frames.find(frame=>frame.number===274)?.fullPrompt,'Full request\nwith its second line.');
  assert.equal(frames.find(frame=>frame.number===273)?.fullPrompt,undefined);
  assert.equal(frames.find(frame=>frame.number===273)?.summary,'short');
 } finally {rmSync(root,{recursive:true,force:true});}
});
