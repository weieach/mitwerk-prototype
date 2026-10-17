import { cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function packageBlobManifest(output, manifestUrl) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const fn = join(output, 'functions/gallery-manifest.func');
  await mkdir(fn, { recursive: true });
  await cp(join(root, 'server/deployed-gallery.cjs'), join(fn, 'handler.cjs'));
  await writeFile(join(fn, 'index.cjs'), `module.exports = require('./handler.cjs').createHandler(${JSON.stringify(manifestUrl)});\n`);
  await writeFile(join(fn, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.cjs', launcherType: 'Nodejs' }));
}
