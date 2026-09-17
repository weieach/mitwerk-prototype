// Per-visitor sessions, so each user's Figma tokens stay theirs.
//
// In-memory on purpose: this is a research prototype, and an in-process Map is
// the smallest thing that correctly separates users. It has two consequences
// worth knowing — everyone is signed out when the server restarts, and it will
// not survive being run as more than one process. Swap in a real store (Redis,
// a database, or signed encrypted cookies) before this holds anything you'd
// mind losing.
import { randomBytes } from 'node:crypto';
import { refreshTokens } from './oauth.mjs';

const COOKIE = 'mitwerk_sid';
const TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const sessions = new Map();

export function newSessionId() {
  return randomBytes(24).toString('hex');
}

export function readSessionId(req) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function setSessionCookie(res, sessionId) {
  // httpOnly keeps the id away from page JavaScript; SameSite=Lax still allows
  // the OAuth redirect back from Figma to carry it.
  const attrs = [
    `${COOKIE}=${encodeURIComponent(sessionId)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.floor(TTL_MS / 1000)}`,
  ];
  // Secure is required in production; omitted locally so http://localhost works.
  if (process.env.NODE_ENV === 'production') attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export function getSession(sessionId) {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

export function saveSession(sessionId, patch) {
  const existing = sessions.get(sessionId) ?? {};
  const session = { ...existing, ...patch, expiresAt: Date.now() + TTL_MS };
  sessions.set(sessionId, session);
  return session;
}

export function destroySession(sessionId) {
  sessions.delete(sessionId);
}

/**
 * Returns a usable access token for the session, refreshing it first if it is
 * close to expiring. Returns null when the session has no Figma connection.
 */
export async function getAccessToken(sessionId) {
  const session = getSession(sessionId);
  if (!session?.tokens?.accessToken) return null;

  const { tokens } = session;
  if (tokens.expiresAt && Date.now() >= tokens.expiresAt && tokens.refreshToken) {
    const renewed = await refreshTokens(tokens.refreshToken);
    saveSession(sessionId, { tokens: renewed });
    return renewed.accessToken;
  }
  return tokens.accessToken;
}
