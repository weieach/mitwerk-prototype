// Figma OAuth 2 for the REST API.
//
// This is a different system from the MCP OAuth in figmaAuth.mjs. Creating a
// REST OAuth app is self-serve at https://www.figma.com/developers/apps — there
// is no catalog and no allowlist, which is what makes a hosted, multi-user
// version of this app possible at all.
//
// Endpoints (from Figma's OAuth docs):
//   authorize  GET  https://www.figma.com/oauth
//   token      POST https://api.figma.com/v1/oauth/token
//   refresh    POST https://api.figma.com/v1/oauth/refresh
// Both POSTs authenticate the app with HTTP Basic (client_id:client_secret).
import { randomBytes } from 'node:crypto';

const AUTHORIZE_URL = 'https://www.figma.com/oauth';
const TOKEN_URL = 'https://api.figma.com/v1/oauth/token';
const REFRESH_URL = 'https://api.figma.com/v1/oauth/refresh';

// Read the file tree, post comments, and show who is connected.
export const SCOPES = ['file_content:read', 'file_comments:write', 'current_user:read'];

export function oauthConfig() {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;
  // Must match a redirect URL registered on the Figma app, exactly.
  const redirectUri = process.env.FIGMA_REDIRECT_URI ?? 'http://localhost:5173/api/auth/callback';

  if (!clientId || !clientSecret) {
    throw new Error(
      'Figma OAuth is not configured. Create an app at https://www.figma.com/developers/apps ' +
        'and set FIGMA_CLIENT_ID, FIGMA_CLIENT_SECRET and FIGMA_REDIRECT_URI in .env.local.'
    );
  }
  return { clientId, clientSecret, redirectUri };
}

/** True when the server has OAuth credentials, so the UI can offer the right path. */
export function oauthConfigured() {
  return Boolean(process.env.FIGMA_CLIENT_ID && process.env.FIGMA_CLIENT_SECRET);
}

export function newState() {
  return randomBytes(16).toString('hex');
}

export function buildAuthorizeUrl(state) {
  const { clientId, redirectUri } = oauthConfig();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  return url.toString();
}

function basicAuthHeader() {
  const { clientId, clientSecret } = oauthConfig();
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

async function tokenRequest(url, params) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  if (!response.ok) {
    throw new Error(`Figma OAuth ${response.status}: ${text.slice(0, 300)}`);
  }
  return parsed;
}

/**
 * Trades the ?code= for tokens. Authorization codes expire 30 seconds after
 * being issued, so this has to run as soon as the callback lands.
 */
export async function exchangeCode(code) {
  const { redirectUri } = oauthConfig();
  const data = await tokenRequest(TOKEN_URL, {
    redirect_uri: redirectUri,
    code,
    grant_type: 'authorization_code',
  });
  return normalizeTokens(data);
}

export async function refreshTokens(refreshToken) {
  const data = await tokenRequest(REFRESH_URL, { refresh_token: refreshToken });
  return normalizeTokens(data, refreshToken);
}

function normalizeTokens(data, fallbackRefresh) {
  const expiresIn = Number(data.expires_in ?? 0);
  return {
    accessToken: data.access_token,
    // The refresh response may not repeat the refresh token; keep the old one.
    refreshToken: data.refresh_token ?? fallbackRefresh,
    // Renew a minute early so a request never races the expiry.
    expiresAt: expiresIn ? Date.now() + (expiresIn - 60) * 1000 : null,
  };
}
