import { serviceClient, getUserFromRequest } from '../_lib/supabase.js';
import { getAccessTokenForConnection } from '../_lib/google.js';

// Returns the list of calendars the user can access, so the UI can offer a
// safe dropdown instead of a free-text calendar id.
export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const supabase = serviceClient();
    const { data: connections } = await supabase
      .from('calendar_connections')
      .select(
        'id, user_id, google_access_token, google_refresh_token, token_expiry'
      )
      .eq('user_id', user.id)
      .limit(1);

    if (!connections || connections.length === 0) {
      res.status(400).json({ success: false, error: 'No Google connection' });
      return;
    }

    const accessToken = await getAccessTokenForConnection(supabase, connections[0]);
    if (!accessToken) {
      res.status(401).json({ success: false, error: 'Failed to get access token' });
      return;
    }

    const gRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!gRes.ok) {
      res.status(gRes.status).json({ success: false, error: await gRes.text() });
      return;
    }

    const data = await gRes.json();
    const calendars = (data.items || []).map((c) => ({
      id: c.id,
      summary: c.summaryOverride || c.summary,
      primary: !!c.primary,
    }));

    res.status(200).json({ success: true, calendars });
  } catch (err) {
    console.error('listGoogleCalendars error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
