import test from 'node:test';
import assert from 'node:assert/strict';
import { blobImagePath, mergeBlobCatalog, blobGalleryRoutes, catalogWriteEtag } from '../server/blob-gallery.mjs';

test('conditional publication uses the strong object ETag behind a weak CDN response', () => {
  assert.equal(catalogWriteEtag('W/"abc"'), '"abc"');
  assert.equal(catalogWriteEtag('"abc"'), '"abc"');
});

test('immutable asset keys deduplicate bytes and preserve image format', () => {
  assert.equal(blobImagePath('images', Buffer.from('a')), blobImagePath('images', Buffer.from('a')));
  assert.notEqual(blobImagePath('images', Buffer.from('a')), blobImagePath('images', Buffer.from('b')));
  assert.match(blobImagePath('images', Buffer.from('jpeg'), 'image/jpeg'), /^gallery\/images\/[a-f0-9]{64}\.jpg$/);
});
test('publishing from an older checkout retains remote captures and reference identities', () => {
  const result = mergeBlobCatalog({ frames: [{ id: 'old' }, { id: 'newer' }], references: [{ name: 'remote' }] },
    { frames: [{ id: 'old', url: 'updated' }], references: [{ name: 'local' }], ignored: 0 });
  assert.equal(result.frames.length, 2);
  assert.equal(result.frames.find(f => f.id === 'old').url, 'updated');
  assert.deepEqual(result.references.map(f => f.name), ['local', 'remote']);
});
test('Blob routes preserve relative gallery URLs and escaped historical filename links', () => {
  const name = '[prompt #1] A+B.png';
  const local = { frames: [{ id: name, url: `gallery/images/${encodeURIComponent(name)}` }], references: [] };
  const published = { frames: [{ id: name, blobUrl: 'https://example.com/gallery/images/hash.png' }], references: [] };
  const routes = blobGalleryRoutes({ origin: 'https://example.com', manifestUrl: 'https://example.com/gallery/manifest.json' }, local, published);
  assert.equal(routes[0].src, '/gallery/manifest.json');
  assert.equal(routes[1].dest, 'https://example.com/gallery/$1/$2');
  for (const path of [local.frames[0].url, decodeURIComponent(local.frames[0].url)]) {
    assert.ok(routes.slice(2).some(route => new RegExp(`^${route.src}$`).test(`/${path}`)));
  }
  assert.throws(() => blobGalleryRoutes({}, local, { frames: [], references: [] }), /Unpublished/);
});
