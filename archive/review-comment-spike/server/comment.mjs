// Turns "a URL + a frame name" into a comment pinned to that frame.
//
// Works with either credential: an OAuth access token from a signed-in visitor
// (the hosted path) or a personal access token from .env.local (the local spike).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseFigmaUrl } from './figmaUrl.mjs';
import { resolveFrame, postComment } from './figmaRest.mjs';

const ENV_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.env.local');

export const SAMPLE_TEXT =
  'Sample review comment from Mitwerk — posted programmatically via the Figma REST API.';

/**
 * Personal access token from the environment, for the command-line spike.
 * Resolved from this file rather than the working directory so it is found no
 * matter where the process was started.
 */
export function patAuthFromEnv() {
  if (!process.env.FIGMA_TOKEN) {
    try {
      process.loadEnvFile(ENV_FILE); // Node 21+
    } catch {
      // No .env.local — fall through to the error below.
    }
  }
  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    throw new Error(
      'No FIGMA_TOKEN found. Create a personal access token in Figma ' +
        '(Settings -> Security -> Personal access tokens) and put it in .env.local as FIGMA_TOKEN=...'
    );
  }
  return { type: 'pat', token };
}

/**
 * @param {{fileUrl: string, frameName: string, auth?: {type: string, token: string}}} input
 * @returns {{ok: boolean, message: string, detail?: unknown}}
 */
export async function commentOnFrame({ fileUrl, frameName, auth }) {
  const parsed = parseFigmaUrl(fileUrl);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const name = (frameName ?? '').trim();
  if (!name) return { ok: false, message: 'Enter the name of the frame to comment on.' };

  let credential = auth;
  if (!credential) {
    try {
      credential = patAuthFromEnv();
    } catch (err) {
      return { ok: false, message: String(err.message) };
    }
  }

  // 1. Resolve the frame name to a node id, as cheaply as possible.
  const resolved = await resolveFrame(parsed.fileKey, credential, {
    frameName: name,
    nodeIdHint: parsed.nodeId,
  });

  // How much the lookup cost, so it can be shown rather than guessed at.
  const lookup = summariseTrail(resolved.trail);

  if (!resolved.ok) {
    if (resolved.status === 403) {
      return {
        ok: false,
        message: 'Figma refused that file — your account may not have access to it.',
        detail: resolved.body,
      };
    }
    if (resolved.status === 404) {
      return { ok: false, message: "That file doesn't exist, or your account can't see it.", detail: resolved.body };
    }
    if (resolved.status === 429) {
      return { ok: false, message: 'Figma rate-limited the request. Wait a moment and try again.', detail: resolved.body };
    }
    return { ok: false, message: 'Figma returned ' + resolved.status + ' when reading the file.', detail: resolved.body };
  }

  const hits = resolved.hits ?? [];

  if (hits.length === 0) {
    const available = (resolved.available ?? [])
      .map((f) => f.page + ' / ' + f.name)
      .slice(0, 25)
      .join(', ');
    return {
      ok: false,
      message: 'No frame named "' + name + '" in that file.',
      detail: (available ? 'Frames found (page / frame): ' + available + '. ' : '') + lookup,
    };
  }
  if (hits.length > 1) {
    return {
      ok: false,
      message: 'Found ' + hits.length + ' frames named "' + name + '". Rename them so the target is unambiguous.',
      detail: hits.map((h) => (h.page ? h.page + ' / ' : '') + h.name + ' (' + h.id + ')').join(', '),
    };
  }

  const target = hits[0];

  // 2. Post the comment, pinned to that frame.
  const posted = await postComment(parsed.fileKey, credential, {
    message: SAMPLE_TEXT,
    nodeId: target.id,
  });

  if (!posted.ok) {
    if (posted.status === 403) {
      return {
        ok: false,
        message: "Couldn't comment on that file — the connection needs comment access (file_comments:write).",
        detail: posted.body,
      };
    }
    return { ok: false, message: 'Figma returned ' + posted.status + ' when posting the comment.', detail: posted.body };
  }

  const caveat = target.exact ? '' : ' (matched "' + target.name + '", ignoring case and spacing)';
  const where = target.page ? ' on page "' + target.page + '"' : '';
  return {
    ok: true,
    message: 'Commented on "' + target.name + '"' + where + caveat + '.',
    detail: {
      commentId: posted.parsed?.id,
      nodeId: target.id,
      resolvedBy: resolved.resolvedBy,
      lookup,
      steps: resolved.trail,
    },
  };
}

/** One readable line about what the name lookup cost. */
function summariseTrail(trail = []) {
  if (trail.length === 0) return '';
  const bytes = trail.reduce((sum, step) => sum + (step.cached ? 0 : step.bytes ?? 0), 0);
  const ms = trail.reduce((sum, step) => sum + (step.cached ? 0 : step.ms ?? 0), 0);
  const names = trail.map((s) => s.step + (s.cached ? ' (cached)' : '')).join(' -> ');
  return 'Lookup: ' + names + '; ' + formatBytes(bytes) + ' downloaded in ' + ms + 'ms.';
}

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}
