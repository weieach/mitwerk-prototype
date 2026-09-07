// Figma REST API client.
//
// Why REST rather than MCP: writing a *comment* is reachable with an ordinary
// personal access token, while the MCP server (the only way to write Dev Mode
// annotations) admits only clients listed in Figma's MCP Catalog. REST has no
// annotation write endpoint at all — AnnotationsTrait in Figma's OpenAPI spec is
// an empty object — so the two APIs are strict complements.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://api.figma.com';

// Resolved from this file, not the working directory, so the token is found no
// matter where the process was started from.
const ENV_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');

/**
 * Reads the personal access token from the environment, loading .env.local first.
 * The token never reaches the browser: everything here runs in Node.
 */
export function getToken() {
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
  return token;
}

async function figmaFetch(path, token, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'X-Figma-Token': token,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const body = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = undefined;
  }

  return { status: response.status, ok: response.ok, body, parsed };
}

/** GET the whole document tree. */
export function getFile(fileKey, token) {
  return figmaFetch(`/v1/files/${encodeURIComponent(fileKey)}`, token);
}

/**
 * Walks the document for FRAME nodes whose name matches.
 * Exact matches win; if there are none, we retry ignoring case and stray spaces.
 *
 * Returns { hits, all } where each hit is { id, name, page, exact }.
 */
export function findFrames(document, target) {
  const frames = [];

  function walk(node, pageName) {
    // A document's children are CANVAS nodes (pages); everything below is content.
    const page = node.type === 'CANVAS' ? node.name : pageName;
    if (node.type === 'FRAME') frames.push({ id: node.id, name: node.name, page });
    for (const child of node.children ?? []) walk(child, page);
  }
  walk(document, null);

  const exact = frames.filter((f) => f.name === target).map((f) => ({ ...f, exact: true }));
  if (exact.length > 0) return { hits: exact, all: frames };

  const loose = target.trim().toLowerCase();
  const fuzzy = frames
    .filter((f) => f.name.trim().toLowerCase() === loose)
    .map((f) => ({ ...f, exact: false }));

  return { hits: fuzzy, all: frames };
}

/**
 * Posts a comment anchored to a specific frame.
 *
 * client_meta as a FrameOffset requires both node_id and node_offset; the offset
 * is measured from the frame's top-left, so a small inset keeps the pin visibly
 * inside the frame rather than straddling its corner.
 */
export function postComment(fileKey, token, { message, nodeId }) {
  return figmaFetch(`/v1/files/${encodeURIComponent(fileKey)}/comments`, token, {
    method: 'POST',
    body: JSON.stringify({
      message,
      client_meta: { node_id: nodeId, node_offset: { x: 24, y: 24 } },
    }),
  });
}
