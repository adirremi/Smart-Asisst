import crypto from 'crypto';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'change-me';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function getRedirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}/api/auth/google/callback`;
}

export function appBaseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// State = base64(payload).hmac  — lets the callback trust which user started the flow.
export function signState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyState(state) {
  if (!state || !state.includes('.')) return null;
  const [body, sig] = state.split('.');
  const expected = crypto.createHmac('sha256', STATE_SECRET).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function buildAuthUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens({ code, redirectUri }) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

// Returns a valid access token for a connection row, refreshing + persisting if needed.
export async function getAccessTokenForConnection(supabase, connection) {
  const now = Date.now();
  const expiry = connection.token_expiry ? new Date(connection.token_expiry).getTime() : 0;

  if (connection.google_access_token && expiry > now + 60_000) {
    return connection.google_access_token;
  }

  if (!connection.google_refresh_token) return null;

  const tokens = await refreshAccessToken(connection.google_refresh_token);
  const newExpiry = new Date(now + (tokens.expires_in || 3600) * 1000).toISOString();

  await supabase
    .from('calendar_connections')
    .update({ google_access_token: tokens.access_token, token_expiry: newExpiry })
    .eq('id', connection.id);

  return tokens.access_token;
}

export async function fetchGoogleEmail(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email || null;
}
