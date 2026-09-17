// OAuth for the remote Figma MCP server.
//
// Figma advertises everything we need at
// https://api.figma.com/.well-known/oauth-authorization-server :
//   - a registration_endpoint, so the app registers itself dynamically
//     (no app to create by hand in Figma's developer settings)
//   - PKCE with S256
//   - require_state_parameter: true, so state() below is mandatory
//   - scope "mcp:connect"
//
// The MCP SDK drives the whole dance; our job is only to supply storage and to
// get the user's browser to the authorization URL, then catch the redirect.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { authStore } from './authStore.mjs';

// Must stay fixed: this exact URI is what we register with Figma, and the
// authorization server will refuse to redirect anywhere else.
const CALLBACK_PORT = 5199;
export const REDIRECT_URI = `http://127.0.0.1:${CALLBACK_PORT}/callback`;

/** Opens the user's default browser, and always prints the URL as a fallback. */
function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      // The empty "" is cmd's window-title argument — without it, a quoted URL
      // is swallowed as the title and nothing opens.
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {
    // Ignore — the printed URL below is the real fallback.
  }
  console.log(`\nAuthorize Mitwerk in Figma:\n  ${url}\n`);
}

/**
 * Starts a one-shot loopback server that captures the ?code= Figma redirects to.
 * Returns { waitForCode, close }.
 */
export function startCallbackServer() {
  let resolveCode, rejectCode;
  const codePromise = new Promise((res, rej) => { resolveCode = res; rejectCode = rej; });

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${CALLBACK_PORT}`);
    if (url.pathname !== '/callback') {
      res.writeHead(404).end('Not found');
      return;
    }
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (code) {
      res.end('<h2>Figma connected.</h2><p>You can close this tab and return to the app.</p>');
      resolveCode(code);
    } else {
      res.end(`<h2>Authorization failed.</h2><p>${error ?? 'No code returned.'}</p>`);
      rejectCode(new Error(`Figma authorization failed: ${error ?? 'no code returned'}`));
    }
  });

  server.listen(CALLBACK_PORT, '127.0.0.1');

  return {
    waitForCode: () => codePromise,
    close: () => server.close(),
  };
}

/**
 * The OAuthClientProvider the SDK expects. Each method is storage or a redirect;
 * the SDK owns the protocol itself.
 */
export function createFigmaAuthProvider() {
  return {
    get redirectUrl() {
      return REDIRECT_URI;
    },

    get clientMetadata() {
      return {
        client_name: 'Mitwerk prototype',
        redirect_uris: [REDIRECT_URI],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        // Figma supports client_secret_basic and client_secret_post; dynamic
        // registration hands us a secret, and _post is the simpler of the two.
        token_endpoint_auth_method: 'client_secret_post',
        scope: 'mcp:connect',
      };
    },

    // Figma sets require_state_parameter: true, so this is not optional.
    state() {
      return randomBytes(16).toString('hex');
    },

    clientInformation() {
      return authStore.get('clientInformation');
    },
    saveClientInformation(info) {
      authStore.set('clientInformation', info);
    },

    tokens() {
      return authStore.get('tokens');
    },
    saveTokens(tokens) {
      authStore.set('tokens', tokens);
    },

    saveCodeVerifier(verifier) {
      authStore.set('codeVerifier', verifier);
    },
    codeVerifier() {
      const v = authStore.get('codeVerifier');
      if (!v) throw new Error('No PKCE code verifier stored — restart the sign-in.');
      return v;
    },

    redirectToAuthorization(authorizationUrl) {
      openBrowser(authorizationUrl.toString());
    },

    // Lets the SDK recover on its own when Figma says our credentials are stale,
    // instead of failing and leaving a bad cache behind.
    invalidateCredentials(scope) {
      if (scope === 'all') authStore.clear(['clientInformation', 'tokens', 'codeVerifier', 'discoveryState']);
      else if (scope === 'client') authStore.clear(['clientInformation']);
      else if (scope === 'tokens') authStore.clear(['tokens']);
      else if (scope === 'verifier') authStore.clear(['codeVerifier']);
      else if (scope === 'discovery') authStore.clear(['discoveryState']);
    },

    // Caching discovery skips two well-known lookups on every later run.
    saveDiscoveryState(state) {
      authStore.set('discoveryState', state);
    },
    discoveryState() {
      return authStore.get('discoveryState');
    },
  };
}
