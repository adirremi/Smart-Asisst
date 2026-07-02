import { serviceClient } from '../../_lib/supabase.js';
import { buildAuthUrl, signState, getRedirectUri, appBaseUrl } from '../../_lib/google.js';

// Kicks off the Google Calendar OAuth flow.
// Called as a top-level browser redirect: /api/auth/google/start?access_token=<supabase token>
export default async function handler(req, res) {
  try {
    const accessToken = req.query.access_token;
    if (!accessToken) {
      res.status(400).send('Missing access_token');
      return;
    }

    const supabase = serviceClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) {
      res.status(401).send('Invalid session');
      return;
    }

    const user = data.user;
    const state = signState({ userId: user.id, email: user.email, ts: Date.now() });
    const redirectUri = getRedirectUri(req);
    const url = buildAuthUrl({ redirectUri, state });

    res.writeHead(302, { Location: url });
    res.end();
  } catch (err) {
    console.error('google/start error:', err);
    const base = appBaseUrl(req);
    res.writeHead(302, { Location: `${base}/Settings?google=error` });
    res.end();
  }
}
