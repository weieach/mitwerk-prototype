import { createHash } from 'node:crypto';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
// Public JSON responses use weak ETags for transport encoding; Blob's write API
// expects the corresponding strong object ETag (also returned by head()).
export const catalogWriteEtag = etag => etag.replace(/^W\//, '');
export function blobImagePath(kind, bytes, mimeType = 'image/png') {
  if (!['images', 'references', 'thumbs'].includes(kind)) throw new Error('Invalid gallery asset kind');
  const extension = { 'image/jpeg': 'jpg', 'image/webp': 'webp' }[mimeType] ?? 'png';
  return `gallery/${kind}/${sha256(bytes)}.${extension}`;
}

// A laptop with an older or partial capture directory must never remove history.
export function mergeBlobCatalog(previous, next) {
  const merge = (oldRows, newRows, key) => [...new Map([
    ...(oldRows ?? []).map(row => [row[key], row]),
    ...newRows.map(row => [row[key], row]),
  ]).values()].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  return { ...next, frames: merge(previous?.frames, next.frames, 'id'),
    references: merge(previous?.references, next.references, 'name') };
}

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function blobGalleryRoutes(config, local, published) {
  const routes = [
    { src: '/gallery/manifest.json', dest: '/gallery-manifest' },
    // Same-origin proxying keeps historical WebGL image loaders untainted.
    { src: '/gallery/(images|references|thumbs)/([a-f0-9]{64}\\.(?:png|jpg|webp))', dest: `${config.origin}/gallery/$1/$2` },
  ];
  for (const [oldRows, newRows, key] of [[local.frames, published.frames, 'id'], [local.references, published.references, 'name']]) {
    const byId = new Map(newRows.map(row => [row[key], row]));
    for (const row of oldRows) {
      const target = byId.get(row[key]);
      if (!target) throw new Error(`Unpublished gallery asset: ${row[key]}`);
      // Keep previously saved chat/annotation links to filename-based URLs alive.
      const legacyUrl = key === 'id' && row.filename ? `gallery/images/${encodeURIComponent(row.filename)}`
        : key === 'name' ? `gallery/references/${row.name.split('/').map(encodeURIComponent).join('/')}` : row.url;
      const paths = new Set([legacyUrl, decodeURIComponent(legacyUrl)]);
      routes.push({ src: `/(?:${[...paths].map(escapeRegex).join('|')})`, dest: target.blobUrl });
    }
  }
  return routes;
}
