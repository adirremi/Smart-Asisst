import { serviceClient } from '../../_lib/supabase.js';
import {
  verifyState,
  exchangeCodeForTokens,
  fetchGoogleEmail,
  getRedirectUri,
  appBaseUrl,
} from '../../_lib/google.js';

// Google redirects here after the user grants access.
export default async function handler(req, res) {
  const base = appBaseUrl(req);

  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      res.writeHead(302, { Location: `${base}/Settings?google=denied` });
      res.end();
      return;
    }

    const parsed = verifyState(state);
    if (!parsed?.userId || !code) {
      res.writeHead(302, { Location: `${base}/Settings?google=error` });
      res.end();
      return;
    }

    const redirectUri = getRedirectUri(req);
    const tokens = await exchangeCodeForTokens({ code, redirectUri });
    const connectedEmail = (await fetchGoogleEmail(tokens.access_token)) || parsed.email;
    const tokenExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    const supabase = serviceClient();

    const { data: existing } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', parsed.userId)
      .limit(1);

    const connectionData = {
      user_id: parsed.userId,
      created_by: parsed.email,
      provider: 'google',
      connected_email: connectedEmail,
      default_calendar_id: 'primary',
      sync_enabled: true,
      two_way_sync: true,
      last_sync_at: new Date().toISOString(),
      google_access_token: tokens.access_token,
      token_expiry: tokenExpiry,
    };

    // Only overwrite the refresh token when Google actually returns a new one.
    if (tokens.refresh_token) {
      connectionData.google_refresh_token = tokens.refresh_token;
    }

    if (existing && existing.length > 0) {
      await supabase
        .from('calendar_connections')
        .update(connectionData)
        .eq('id', existing[0].id);
    } else {
      await supabase.from('calendar_connections').insert(connectionData);
    }

    res.writeHead(302, { Location: `${base}/Settings?google=connected` });
    res.end();
  } catch (err) {
    console.error('google/callback error:', err);
    res.writeHead(302, { Location: `${base}/Settings?google=error` });
    res.end();
  }
}
