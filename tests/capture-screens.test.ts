import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVersions, parseCaptureName, versionsForScreen } from '../src/features/iteration-gallery/model.ts';

const capture = (filename: string) => ({ ...parseCaptureName(filename)!, id:filename, filename, url:filename, width:100, height:100 });
test('explicit landing metadata separates captures without changing their version identity', () => {
  const home = capture('[prompt #1] home-2026-10-17-010000.png');
  const landing = capture('[prompt #2] idea-stream · +1-0 · [screen landing] c landing-2026-10-17-010100.png');
  const push = capture('[push #7] saved-2026-10-17-010200.png');
  assert.equal(home.screen, 'homescreen');
  assert.equal(landing.screen, 'landing');
  assert.equal(landing.branch, 'idea-stream');
  assert.equal(landing.summary, 'c landing');
  const versions = buildVersions([home, landing, push]);
  const homeVersions = versionsForScreen(versions, 'homescreen');
  const landingVersions = versionsForScreen(versions, 'landing');
  assert.equal(homeVersions[0].number, 7);
  assert.equal(landingVersions[0].number, 7);
  assert.deepEqual(landingVersions[0].frames.map(frame => frame.id), [landing.id]);
  assert.equal(homeVersions[0].frames.find(frame => frame.kind === 'push')?.url, home.url);
  assert.equal(landingVersions[0].frames[0].position, .5);
  assert.deepEqual(versionsForScreen(buildVersions([home]), 'landing'), []);
});
