// Pulls the file key and the optional node-id out of a pasted Figma URL.

/**
 * @returns {{ok: true, fileKey: string, nodeId: string|null, kind: 'design'}}
 *        | {ok: false, code: string, message: string}
 */
export function parseFigmaUrl(input) {
  const raw = (input ?? '').trim();
  if (!raw) {
    return { ok: false, code: 'empty', message: 'Paste a Figma file URL first.' };
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, code: 'unparseable', message: "That doesn't look like a Figma file URL." };
  }

  if (!/(^|\.)figma\.com$/i.test(url.hostname)) {
    return { ok: false, code: 'unparseable', message: "That doesn't look like a Figma file URL." };
  }

  // /design/:fileKey/:name — also /file/ for older links.
  const segments = url.pathname.split('/').filter(Boolean);
  const kind = segments[0];
  const fileKey = segments[1];

  if (kind === 'board') {
    return {
      ok: false,
      code: 'figjam',
      message: 'Comments can only be pinned to frames in Figma design files, not FigJam boards.',
    };
  }
  if (kind === 'slides') {
    return {
      ok: false,
      code: 'slides',
      message: 'Comments can only be pinned to frames in Figma design files, not Slides.',
    };
  }
  if ((kind !== 'design' && kind !== 'file') || !fileKey) {
    return { ok: false, code: 'unparseable', message: "That doesn't look like a Figma file URL." };
  }

  // Figma writes node ids as 1-2 in URLs but the Plugin API wants 1:2.
  const rawNode = url.searchParams.get('node-id');
  const nodeId = rawNode ? rawNode.replace(/-/g, ':') : null;

  return { ok: true, fileKey, nodeId, kind: 'design' };
}
