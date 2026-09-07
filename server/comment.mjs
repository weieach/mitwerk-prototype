// Turns "a URL + a frame name" into a comment pinned to that frame in Figma.
//
// Mirrors the {ok, message, detail} contract that server/annotate.mjs uses, so
// the UI does not care which write path is in play.
import { parseFigmaUrl } from './figmaUrl.mjs';
import { getToken, getFile, findFrames, postComment } from './figmaRest.mjs';

export const SAMPLE_TEXT =
  'Sample review comment from Mitwerk — posted programmatically via the Figma REST API.';

/**
 * @returns {{ok: boolean, message: string, detail?: unknown}}
 */
export async function commentOnFrame({ fileUrl, frameName }) {
  const parsed = parseFigmaUrl(fileUrl);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const name = (frameName ?? '').trim();
  if (!name) return { ok: false, message: 'Enter the name of the frame to comment on.' };

  let token;
  try {
    token = getToken();
  } catch (err) {
    return { ok: false, message: String(err.message) };
  }

  // 1. Read the file so we can turn a frame NAME into a node ID.
  const file = await getFile(parsed.fileKey, token);
  if (!file.ok) {
    if (file.status === 403) {
      return {
        ok: false,
        message: "Figma refused that file — the token may lack access, or it may be scoped too narrowly.",
        detail: file.body,
      };
    }
    if (file.status === 404) {
      return { ok: false, message: "That file doesn't exist, or your account can't see it.", detail: file.body };
    }
    if (file.status === 429) {
      return { ok: false, message: 'Figma rate-limited the request. Wait a moment and try again.', detail: file.body };
    }
    return { ok: false, message: `Figma returned ${file.status} when reading the file.`, detail: file.body };
  }

  const document = file.parsed?.document;
  if (!document) {
    return { ok: false, message: 'Figma returned a file with no document tree.', detail: file.body };
  }

  // 2. Resolve the name.
  const { hits, all } = findFrames(document, name);

  if (hits.length === 0) {
    const available = all.map((f) => `${f.page} / ${f.name}`).slice(0, 25).join(', ') || 'none';
    return {
      ok: false,
      message: `No frame named "${name}" in that file.`,
      detail: `Frames found (page / frame): ${available}`,
    };
  }
  if (hits.length > 1) {
    return {
      ok: false,
      message: `Found ${hits.length} frames named "${name}". Rename them so the target is unambiguous.`,
      detail: hits.map((h) => `${h.page} / ${h.name} (${h.id})`).join(', '),
    };
  }

  const target = hits[0];

  // 3. Post the comment, pinned to that frame.
  const posted = await postComment(parsed.fileKey, token, { message: SAMPLE_TEXT, nodeId: target.id });
  if (!posted.ok) {
    if (posted.status === 403) {
      return {
        ok: false,
        message: "Couldn't comment on that file — the token needs comment access (scope file_comments:write).",
        detail: posted.body,
      };
    }
    return { ok: false, message: `Figma returned ${posted.status} when posting the comment.`, detail: posted.body };
  }

  const caveat = target.exact ? '' : ` (matched "${target.name}", ignoring case and spacing)`;
  return {
    ok: true,
    message: `Commented on "${target.name}" on page "${target.page}"${caveat}.`,
    detail: {
      commentId: posted.parsed?.id,
      nodeId: target.id,
      page: target.page,
      message: SAMPLE_TEXT,
    },
  };
}
