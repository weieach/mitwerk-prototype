// Connects to a Figma MCP server and exposes a single callTool helper.
// This is the only module that knows MCP is a protocol.
//
// TWO TRANSPORTS, and the choice is forced by Figma's access policy:
//
//   local  (default) — http://127.0.0.1:3845/mcp, served by the Figma desktop
//                      app when "Enable local MCP server" is on in preferences.
//                      No authentication at all.
//
//   remote           — https://mcp.figma.com/mcp with OAuth. Currently BLOCKED
//                      for custom clients: Figma's docs state "Only clients
//                      listed in the Figma MCP Catalog can connect to the Figma
//                      MCP Server", and the advertised dynamic-registration
//                      endpoint answers 403 Forbidden. The OAuth code is kept
//                      intact and working for when catalog access is granted.
//
// Select with MITWERK_MCP=local|remote.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { createFigmaAuthProvider, startCallbackServer } from './figmaAuth.mjs';

export const LOCAL_URL = new URL('http://127.0.0.1:3845/mcp');
export const REMOTE_URL = new URL('https://mcp.figma.com/mcp');

export function selectedMode() {
  return process.env.MITWERK_MCP === 'remote' ? 'remote' : 'local';
}

/** The local desktop server needs no auth — one transport, one connect. */
async function connectLocal() {
  const client = new Client({ name: 'mitwerk-prototype', version: '0.1.0' }, { capabilities: {} });
  try {
    await client.connect(new StreamableHTTPClientTransport(LOCAL_URL));
  } catch (err) {
    const hint =
      'Could not reach the Figma desktop MCP server at http://127.0.0.1:3845/mcp. ' +
      'Open the Figma desktop app, then enable the local MCP server in its preferences.';
    throw new Error(`${hint} (${err?.message ?? err})`);
  }
  return client;
}

/** OAuth flow for the remote server. Kept ready; blocked by the catalog allowlist today. */
async function connectRemote() {
  const authProvider = createFigmaAuthProvider();
  const client = new Client({ name: 'mitwerk-prototype', version: '0.1.0' }, { capabilities: {} });
  const transport = () => new StreamableHTTPClientTransport(REMOTE_URL, { authProvider });

  // The loopback listener must be up before connect(), because the failed
  // connect is what opens the browser and the redirect can arrive immediately.
  const callback = authProvider.tokens() ? null : startCallbackServer();
  try {
    try {
      await client.connect(transport());
      return client;
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) throw err;
      const listener = callback ?? startCallbackServer();
      try {
        const code = await listener.waitForCode();
        await transport().finishAuth(code);
      } finally {
        if (!callback) listener.close();
      }
      await client.connect(transport()); // a consumed transport won't reconnect
      return client;
    }
  } finally {
    callback?.close();
  }
}

export async function connectFigmaMcp() {
  return selectedMode() === 'remote' ? connectRemote() : connectLocal();
}

/**
 * Calls an MCP tool and returns its parsed result.
 * MCP answers with content blocks; the Figma tools reply with one text block of JSON.
 */
export async function callTool(client, name, args) {
  const result = await client.callTool({ name, arguments: args });

  const text = (result.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }

  return { isError: result.isError === true, text, parsed };
}
