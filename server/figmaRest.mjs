// Figma REST API client.
//
// Two auth styles: a personal access token goes in X-Figma-Token, an OAuth
// access token goes in Authorization: Bearer. Callers pass {type, token}.
//
// The interesting part is resolveFrame(), which turns a frame NAME into a node
// id without downloading the whole document when it can avoid it. See the
// comment above it for why that matters.
import { createHash } from 'node:crypto';

const API = 'https://api.figma.com';

// ---------------------------------------------------------------------------
// Response cache
//
// Keyed by URL *and* a fingerprint of the caller's token. The fingerprint is
// what stops one user's cached file content being served to another user who
// may have no access to that file.
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function cacheKey(path, auth) {
  const who = createHash('sha256').update(auth.token).digest('hex').slice(0, 16);
  return who + ':' + path;
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCache() {
  cache.clear();
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
function authHeaders(auth) {
  return auth.type === 'oauth'
    ? { Authorization: 'Bearer ' + auth.token }
    : { 'X-Figma-Token': auth.token };
}

/**
 * GET a Figma path. Returns {ok, status, parsed, bytes, ms, cached} — size and
 * timing ride along so callers can report what a lookup actually cost.
 */
async function get(path, auth, { useCache = true } = {}) {
  const key = cacheKey(path, auth);
  if (useCache) {
    const hit = cacheGet(key);
    if (hit) return { ...hit, cached: true };
  }

  const started = Date.now();
  const response = await fetch(API + path, {
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
  });
  const body = await response.text();
  const ms = Date.now() - started;

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = undefined;
  }

  const result = {
    ok: response.ok,
    status: response.status,
    parsed,
    body: response.ok ? undefined : body, // keep error bodies only
    bytes: Buffer.byteLength(body),
    ms,
    cached: false,
  };

  if (response.ok && useCache) cacheSet(key, result);
  return result;
}

export function getMe(auth) {
  return get('/v1/me', auth);
}

// ---------------------------------------------------------------------------
// Frame lookup
// ---------------------------------------------------------------------------

/** Collects FRAME nodes from a node tree, remembering which page each sits on. */
function collectFrames(root, inheritedPage = null) {
  const frames = [];
  (function walk(node, pageName) {
    const page = node.type === 'CANVAS' ? node.name : pageName;
    if (node.type === 'FRAME') frames.push({ id: node.id, name: node.name, page });
    for (const child of node.children ?? []) walk(child, page);
  })(root, inheritedPage);
  return frames;
}

/**
 * Whether a node id from a URL is worth a lookup request.
 *
 * Ids beginning "0:" are the document and its pages — a plain file link carries
 * `node-id=0-1`, which is the first page, never a frame. Skipping those avoids
 * a guaranteed-useless round trip on the most common link shape. It is a
 * heuristic: being wrong costs one small request, nothing more.
 */
function looksLikeNodeId(id) {
  return typeof id === 'string' && !/^0:/.test(id);
}

/** Exact match wins; otherwise retry ignoring case and stray spaces. */
function matchByName(frames, target) {
  const exact = frames.filter((f) => f.name === target).map((f) => ({ ...f, exact: true }));
  if (exact.length > 0) return exact;
  const loose = target.trim().toLowerCase();
  return frames
    .filter((f) => f.name.trim().toLowerCase() === loose)
    .map((f) => ({ ...f, exact: false }));
}

/**
 * Turns a frame name into a node id, escalating only as far as it must.
 *
 * The naive approach — GET /v1/files/{key} and walk everything — pulls the
 * entire document. That is nothing for a test file and many megabytes for a
 * real one, on every submit, just to resolve one name. So instead:
 *
 *   1. the node-id from the pasted URL. If the link was copied with the frame
 *      selected, the answer is already in the URL and costs one small request.
 *      If that id is a page instead, search only that page.
 *   2. depth=2 — every page plus its top-level objects, nothing deeper. Most
 *      frames people name are top-level, so this usually ends here.
 *   3. the full document, only for frames nested inside other frames.
 *
 * Every step records bytes and milliseconds, so the saving is measurable rather
 * than assumed.
 */
export async function resolveFrame(fileKey, auth, { frameName, nodeIdHint }) {
  const key = encodeURIComponent(fileKey);
  const trail = [];

  const note = (step, res) =>
    trail.push({ step, bytes: res.bytes, ms: res.ms, cached: res.cached, status: res.status });

  // --- Step 1: the node id carried by the URL ------------------------------
  //
  // Only worth a request when the id points at a FRAME — that is the "copied
  // the link with the frame selected" case, and it resolves in one small call.
  //
  // An earlier version also handled the id pointing at a PAGE, by re-fetching
  // that page scoped to depth=2. Benchmarking killed it: that branch spent two
  // round trips to obtain what plain depth=2 (step 2) returns in one, and a
  // plain file link carries a page id, so it fired on the common case. It would
  // only pay off on a file with so many pages that depth=2 is itself large —
  // measure with `npm run bench` on a real file before reintroducing it.
  if (nodeIdHint && looksLikeNodeId(nodeIdHint)) {
    const res = await get('/v1/files/' + key + '/nodes?ids=' + encodeURIComponent(nodeIdHint), auth);
    note('node-hint', res);
    if (!res.ok) return { ok: false, status: res.status, body: res.body, trail };

    const doc = res.parsed?.nodes?.[nodeIdHint]?.document;
    if (doc?.type === 'FRAME') {
      const hits = matchByName([{ id: doc.id, name: doc.name, page: null }], frameName);
      if (hits.length === 1) return { ok: true, hits, trail, resolvedBy: 'node-hint' };
    }
  }

  // --- Step 2: all pages, top level only -----------------------------------
  const shallow = await get('/v1/files/' + key + '?depth=2', auth);
  note('depth2', shallow);
  if (!shallow.ok) return { ok: false, status: shallow.status, body: shallow.body, trail };

  const shallowHits = matchByName(collectFrames(shallow.parsed.document), frameName);
  if (shallowHits.length > 0) return { ok: true, hits: shallowHits, trail, resolvedBy: 'depth2' };

  // --- Step 3: the whole document ------------------------------------------
  const full = await get('/v1/files/' + key, auth);
  note('full', full);
  if (!full.ok) return { ok: false, status: full.status, body: full.body, trail };

  const allFrames = collectFrames(full.parsed.document);
  const hits = matchByName(allFrames, frameName);
  return { ok: true, hits, available: allFrames, trail, resolvedBy: 'full' };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/**
 * Posts a comment pinned to a frame. client_meta as a FrameOffset needs both
 * node_id and node_offset; the offset is measured from the frame's top-left, so
 * a small inset keeps the pin inside the frame rather than on its corner.
 */
export async function postComment(fileKey, auth, { message, nodeId }) {
  const response = await fetch(API + '/v1/files/' + encodeURIComponent(fileKey) + '/comments', {
    method: 'POST',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      client_meta: { node_id: nodeId, node_offset: { x: 24, y: 24 } },
    }),
  });

  const body = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = undefined;
  }
  return { ok: response.ok, status: response.status, parsed, body };
}
