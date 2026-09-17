// The HTTP surface, kept independent of Vite so the same handler can run under
// `vite dev` today and inside a plain Node server when this is hosted.
//
// Routes:
//   GET  /api/auth/status    is this visitor connected to Figma?
//   GET  /api/auth/login     bounce to Figma's consent screen
//   GET  /api/auth/callback  Figma sends the visitor back here with ?code
//   POST /api/auth/logout    forget this visitor's tokens
//   POST /api/comment        resolve a frame and pin a comment to it
import { buildAuthorizeUrl, exchangeCode, newState, oauthConfigured } from './oauth.mjs';
import {
  destroySession,
  getAccessToken,
  getSession,
  newSessionId,
  readSessionId,
  saveSession,
  setSessionCookie,
} from './sessions.mjs';
import { getMe } from './figmaRest.mjs';
import { commentOnFrame } from './comment.mjs';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // A comment request is tiny; anything large is a mistake or an attack.
      if (body.length > 1e6) reject(new Error('Request body too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Handles an /api request. Returns true when it took the request.
 */
export async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  if (!path.startsWith('/api/')) return false;

  try {
    // --- status ------------------------------------------------------------
    if (path === '/api/auth/status' && req.method === 'GET') {
      const session = getSession(readSessionId(req));
      sendJson(res, 200, {
        oauthConfigured: oauthConfigured(),
        connected: Boolean(session?.tokens?.accessToken),
        user: session?.user ?? null,
      });
      return true;
    }

    // --- start sign-in -----------------------------------------------------
    if (path === '/api/auth/login' && req.method === 'GET') {
      if (!oauthConfigured()) {
        sendJson(res, 500, {
          ok: false,
          message:
            'Figma OAuth is not configured on this server. Set FIGMA_CLIENT_ID and FIGMA_CLIENT_SECRET.',
        });
        return true;
      }
      // A fresh session id per sign-in attempt, carrying the CSRF state.
      const sessionId = readSessionId(req) ?? newSessionId();
      const state = newState();
      saveSession(sessionId, { state });
      setSessionCookie(res, sessionId);
      redirect(res, buildAuthorizeUrl(state));
      return true;
    }

    // --- finish sign-in ----------------------------------------------------
    if (path === '/api/auth/callback' && req.method === 'GET') {
      const sessionId = readSessionId(req);
      const session = getSession(sessionId);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) return finishWithError(res, 'Figma denied the request: ' + error);
      if (!code) return finishWithError(res, 'Figma did not return an authorization code.');
      if (!session) return finishWithError(res, 'Your sign-in session expired. Try again.');
      // The state check is what stops someone else's callback landing in this session.
      if (!state || state !== session.state) {
        return finishWithError(res, 'Sign-in state did not match. Try again.');
      }

      // Authorization codes expire 30 seconds after issue, so exchange immediately.
      const tokens = await exchangeCode(code);
      saveSession(sessionId, { tokens, state: null });

      // Record who connected, for the "connected as" line in the UI.
      const me = await getMe({ type: 'oauth', token: tokens.accessToken });
      if (me.ok && me.parsed) {
        saveSession(sessionId, {
          user: { handle: me.parsed.handle, email: me.parsed.email, imgUrl: me.parsed.img_url },
        });
      }

      redirect(res, '/?connected=1');
      return true;
    }

    // --- sign out ----------------------------------------------------------
    if (path === '/api/auth/logout' && req.method === 'POST') {
      destroySession(readSessionId(req));
      sendJson(res, 200, { ok: true });
      return true;
    }

    // --- the actual job ----------------------------------------------------
    if (path === '/api/comment' && req.method === 'POST') {
      const { fileUrl, frameName } = JSON.parse((await readBody(req)) || '{}');

      // Prefer the visitor's own OAuth token. Fall back to a server-side personal
      // access token only when OAuth isn't configured — that's the local spike.
      let auth;
      const accessToken = await getAccessToken(readSessionId(req));
      if (accessToken) {
        auth = { type: 'oauth', token: accessToken };
      } else if (oauthConfigured()) {
        sendJson(res, 401, { ok: false, message: 'Connect your Figma account first.' });
        return true;
      }

      const result = await commentOnFrame({ fileUrl, frameName, auth });
      sendJson(res, result.ok ? 200 : 400, result);
      return true;
    }

    sendJson(res, 404, { ok: false, message: 'Unknown endpoint.' });
    return true;
  } catch (err) {
    sendJson(res, 500, { ok: false, message: 'Server error.', detail: String(err?.message ?? err) });
    return true;
  }
}

/** Sends the visitor back to the app with a readable reason. */
function finishWithError(res, message) {
  redirect(res, '/?auth_error=' + encodeURIComponent(message));
  return true;
}
