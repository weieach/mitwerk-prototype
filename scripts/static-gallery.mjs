import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { blobImagePath, legacyGalleryRoutes, sha256 } from '../server/blob-gallery.mjs';
import { cachedCaptureEncoding } from '../server/capture-thumbnail.mjs';
import { captureImageInfo } from '../server/capture-image.mjs';

const captureDirectory = '[frame capture] screenshots';
const visualReferenceDirectory = 'visual_ref';

/**
 * Packages the gallery into the deployment itself (no Blob): every capture ships as a
 * `display` WebP plus a `thumb` WebP under content-addressed paths, and references ship
 * re-encoded when they are images. Rows keep their original width/height (the album sizes
 * planes from them); `url`/`thumbUrl` point at the static files.
 */
export async function packageStaticGallery(root, staticDir, local) {
  let bytesWritten = 0, files = 0;
  const store = async (kind, bytes, mimeType) => {
    const path = blobImagePath(kind, bytes, mimeType);
    await mkdir(dirname(join(staticDir, path)), { recursive: true });
    await writeFile(join(staticDir, path), bytes);
    bytesWritten += bytes.length; files++;
    return path;
  };
  const encode = async (source, preset) => {
    try { captureImageInfo(source); } catch { return null; }
    return cachedCaptureEncoding(root, source, preset);
  };
  const frames = new Map(), references = new Map();
  const jobs = [
    ...local.frames.map(frame => async () => {
      const source = join(root, captureDirectory, frame.filename);
      const [full, thumb] = [await encode(source, 'display'), await encode(source, 'thumb')];
      if (!full || !thumb) throw new Error(`Unreadable capture: ${frame.filename}`);
      frames.set(frame.id, { ...frame, url: await store('images', full, 'image/webp'), thumbUrl: await store('thumbs', thumb, 'image/webp'),
        sha256: sha256(full), thumbSha256: sha256(thumb), bytes: full.length, mimeType: 'image/webp' });
    }),
    ...local.references.map(reference => async () => {
      const source = join(root, visualReferenceDirectory, reference.name);
      const encoded = await encode(source, 'display');
      if (encoded) {
        references.set(reference.name, { ...reference, url: await store('references', encoded, 'image/webp'), sha256: sha256(encoded), mimeType: 'image/webp' });
        return;
      }
      // Non-image references (none today) ship as-is under their own name.
      const path = `gallery/references/${reference.name}`;
      await mkdir(dirname(join(staticDir, path)), { recursive: true });
      await copyFile(source, join(staticDir, path));
      references.set(reference.name, reference);
    }),
  ];
  let done = 0;
  const total = jobs.length;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (jobs.length) {
      await jobs.shift()();
      if (++done % 100 === 0 && done < total) console.log(`Packaged ${done}/${total} gallery assets…`);
    }
  }));
  const catalog = { ...local, source: 'static',
    frames: local.frames.map(frame => frames.get(frame.id)),
    references: local.references.map(reference => references.get(reference.name)) };
  await writeFile(join(staticDir, 'gallery/manifest.json'), JSON.stringify(catalog));
  const routes = legacyGalleryRoutes(local, catalog, row => `/${row.url}`);
  console.log(`Static gallery: ${catalog.frames.length} frames, ${catalog.references.length} references, ${files} files, ${(bytesWritten / 1e6).toFixed(1)} MB.`);
  return { catalog, routes };
}
