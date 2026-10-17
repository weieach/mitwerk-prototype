import { closeSync, openSync, readFileSync, readSync } from 'node:fs';

// Some historical captures have JPEG bytes under a .png filename. Keep their
// stable identities and discover dimensions/content type from the actual bytes.
export function captureImageInfo(path) {
  const file = openSync(path, 'r');
  const header = Buffer.alloc(24);
  let length;
  try { length = readSync(file, header, 0, header.length, 0); } finally { closeSync(file); }
  if (length === 24 && header.readUInt32BE(0) === 0x89504e47
    && header.readUInt32BE(4) === 0x0d0a1a0a && header.toString('ascii', 12, 16) === 'IHDR') {
    const width = header.readUInt32BE(16), height = header.readUInt32BE(20);
    if (width && height) return { width, height, mimeType: 'image/png' };
  }
  if (length >= 2 && header.readUInt16BE(0) === 0xffd8) {
    const bytes = readFileSync(path);
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const size = bytes.readUInt16BE(offset);
      if (size < 2 || offset + size > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 8) {
        const height = bytes.readUInt16BE(offset + 3), width = bytes.readUInt16BE(offset + 5);
        if (width && height) return { width, height, mimeType: 'image/jpeg' };
      }
      offset += size;
    }
  }
  throw new Error('Invalid capture image');
}
