// Turns "a URL + a frame name" into an annotation in Figma.
//
// The write goes through the MCP tool `use_figma`, which takes a string of
// JavaScript and runs it against the Figma Plugin API inside the file. That code
// is deterministic — no model is involved anywhere in this path.
import { parseFigmaUrl } from './figmaUrl.mjs';
import { connectFigmaMcp, callTool } from './mcpClient.mjs';

export const SAMPLE_TEXT =
  'Sample annotation from Mitwerk — written programmatically via the Figma MCP server.';

/**
 * Builds the Plugin API script.
 *
 * Constraints this has to respect (they are easy to get wrong):
 *  - the script is auto-wrapped in an async context: use top-level await, no IIFE
 *  - only the `return` value comes back; console.log is invisible
 *  - figma.currentPage resets to the FIRST page on every call
 *  - setCurrentPageAsync may be called at most once per call, and the sync
 *    setter throws
 *  - `annotations` is a read-only array — build a new one and reassign
 */
function buildAnnotationScript({ frameName, text }) {
  // The frame name is interpolated with JSON.stringify, never by string
  // concatenation: a name containing a quote or backtick would otherwise be
  // code injected into the plugin sandbox.
  return `
const TARGET = ${JSON.stringify(frameName)};
const TEXT = ${JSON.stringify(text)};

// Search every page. loadAllPagesAsync is blocked in this sandbox, but
// page.loadAsync() is not — so we load pages one at a time. This avoids relying
// on setCurrentPageAsync (allowed only once per call) just to look around.
const pages = figma.root.children;
for (const page of pages) await page.loadAsync();

function framesOf(page) {
  return page.findAllWithCriteria({ types: ['FRAME'] });
}

// Exact match first.
let hits = [];
for (const page of pages) {
  for (const f of framesOf(page)) if (f.name === TARGET) hits.push({ node: f, page, exact: true });
}

// Then a forgiving pass, so a stray space or capital doesn't read as "missing".
if (hits.length === 0) {
  const loose = TARGET.trim().toLowerCase();
  for (const page of pages) {
    for (const f of framesOf(page)) {
      if (f.name.trim().toLowerCase() === loose) hits.push({ node: f, page, exact: false });
    }
  }
}

if (hits.length === 0) {
  const available = [];
  for (const page of pages) for (const f of framesOf(page)) available.push(page.name + ' / ' + f.name);
  return { ok: false, reason: 'not_found', available: available.slice(0, 25) };
}
if (hits.length > 1) {
  return {
    ok: false,
    reason: 'ambiguous',
    candidates: hits.map(h => ({ id: h.node.id, page: h.page.name, name: h.node.name }))
  };
}

const { node, page, exact } = hits[0];

// Writing to a node on a non-active page is untested; switching first is cheap
// insurance, and this is the one setCurrentPageAsync call we are allowed.
if (page.id !== figma.currentPage.id) await figma.setCurrentPageAsync(page);

// annotations is a ReadonlyArray — build a new array and reassign, like fills.
// Replacing rather than appending keeps re-runs idempotent.
node.annotations = [{ labelMarkdown: TEXT }];

return {
  ok: true,
  page: page.name,
  frameId: node.id,
  frameName: node.name,
  exactMatch: exact,
  mutatedNodeIds: [node.id],
  readBack: node.annotations
};
`.trim();
}

/**
 * @returns {{ok: boolean, message: string, detail?: unknown}}
 */
export async function annotateFrame({ fileUrl, frameName }) {
  const parsed = parseFigmaUrl(fileUrl);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const name = (frameName ?? '').trim();
  if (!name) return { ok: false, message: 'Enter the name of the frame to annotate.' };

  let client;
  try {
    client = await connectFigmaMcp();
  } catch (err) {
    return {
      ok: false,
      message: 'Could not connect to Figma. Sign-in may have expired — try again.',
      detail: String(err?.message ?? err),
    };
  }

  try {
    const result = await callTool(client, 'use_figma', {
      fileKey: parsed.fileKey,
      description: `Write a sample annotation onto the frame named "${name}".`,
      skillNames: 'resource:figma-use',
      code: buildAnnotationScript({ frameName: name, text: SAMPLE_TEXT }),
    });

    // Transport- or permission-level failure (bad file key, no access, seat too low).
    if (result.isError) {
      return {
        ok: false,
        message: "Couldn't open that file — check you have edit access (a View seat can't be annotated).",
        detail: result.text,
      };
    }

    const payload = result.parsed;
    if (!payload) {
      return { ok: false, message: 'Figma returned an unexpected response.', detail: result.text };
    }

    if (payload.ok) {
      // A non-exact hit means we matched despite different case or stray spaces —
      // worth saying, so the user isn't surprised by which frame got annotated.
      const caveat = payload.exactMatch === false
        ? ` (matched "${payload.frameName}", ignoring case and spacing)`
        : '';
      return {
        ok: true,
        message: `Annotated "${payload.frameName}" on page "${payload.page}"${caveat}.`,
        detail: payload,
      };
    }

    if (payload.reason === 'not_found') {
      const available = (payload.available ?? []).join(', ') || 'none';
      return {
        ok: false,
        message: `No frame named "${name}" in that file.`,
        detail: `Frames found (page / frame): ${available}`,
      };
    }
    if (payload.reason === 'ambiguous') {
      const candidates = payload.candidates ?? [];
      return {
        ok: false,
        message: `Found ${candidates.length} frames named "${name}". Rename them so the target is unambiguous.`,
        detail: candidates.map((c) => `${c.page} / ${c.name} (${c.id})`).join(', '),
      };
    }

    return { ok: false, message: 'The annotation was rejected by Figma.', detail: result.text };
  } catch (err) {
    // Surface the raw Plugin API error rather than swallowing it.
    return { ok: false, message: 'The annotation write failed.', detail: String(err?.message ?? err) };
  } finally {
    await client.close().catch(() => {});
  }
}
