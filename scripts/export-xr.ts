import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCaptureCatalog, captureDirectory } from '../server/gallery-catalog.ts';
import { createXRManifest } from '../src/features/iteration-gallery/xr-export.ts';
import { ranges, type RangeKey } from '../src/features/iteration-gallery/model.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'xr-export');
const rangeArg = process.argv.indexOf('--range');
const range = (rangeArg < 0 ? 'all' : process.argv[rangeArg + 1]) as RangeKey;
if (!ranges.some(item => item.value === range)) throw new Error('Range must be today, 3, 7, 30 or all.');
const catalog = readCaptureCatalog(root);
if (!catalog.frames.length) throw new Error('No readable screenshot captures to export.');
const manifest = createXRManifest(catalog.frames, range);
for (const frame of manifest.frames) {
  const destination = join(output, frame.image);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(root, captureDirectory, frame.sourceFilename), destination);
}
// Pin the same installed Three.js build and license; this export has no CDN dependency.
for (const [source, destination] of [
  ['build/three.module.js', 'vendor/three.module.js'], ['build/three.core.js', 'vendor/three.core.js'],
  ['examples/jsm/controls/OrbitControls.js', 'vendor/OrbitControls.js'],
  ['examples/jsm/webxr/VRButton.js', 'vendor/VRButton.js'], ['LICENSE', 'vendor/THREE-LICENSE.txt'],
]) {
  mkdirSync(dirname(join(output, destination)), { recursive: true });
  copyFileSync(join(root, 'node_modules/three', source), join(output, destination));
}
const three = JSON.parse(readFileSync(join(root, 'node_modules/three/package.json'), 'utf8'));
writeFileSync(join(output, 'album.json'), `${JSON.stringify({ ...manifest, renderer: { library: 'three', version: three.version }, skippedFiles: catalog.ignored }, null, 2)}\n`);
console.log(`Exported ${manifest.frames.length} screenshots, ${manifest.blocks.length} blocks and ${manifest.axes.labels.length} labels to ${output}`);
