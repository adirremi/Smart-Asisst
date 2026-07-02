import { getAccessTokenForConnection } from './google.js';

// Create a single event in the user's Google Calendar.
// Returns the Google event id, or null if the user isn't connected.
export async function createGoogleEvent(supabase, connection, ev) {
  const accessToken = await getAccessTokenForConnection(supabase, connection);
  if (!accessToken) return null;

  const calendarId = connection.default_calendar_id || 'primary';
  const timeZone = ev.timeZone || 'Asia/Jerusalem';

  const body = {
    summary: ev.title,
    description: ev.description || '',
    start: { dateTime: ev.start_at, timeZone },
    end: { dateTime: ev.end_at, timeZone },
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    console.error('Google event create failed:', await res.text());
    return null;
  }
  const data = await res.json();
  return data.id || null;
}

// Delete an event from the user's Google Calendar.
export async function deleteGoogleEvent(supabase, connection, googleEventId) {
  const accessToken = await getAccessTokenForConnection(supabase, connection);
  if (!accessToken || !googleEventId) return false;
  const calendarId = connection.default_calendar_id || 'primary';

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
  );
  // 410 = already deleted; treat as success.
  return res.ok || res.status === 410;
}

// Patch an existing event (time and/or title) in the user's Google Calendar.
export async function updateGoogleEvent(supabase, connection, googleEventId, patch) {
  const accessToken = await getAccessTokenForConnection(supabase, connection);
  if (!accessToken || !googleEventId) return false;
  const calendarId = connection.default_calendar_id || 'primary';
  const timeZone = patch.timeZone || 'Asia/Jerusalem';

  const body = {};
  if (patch.title) body.summary = patch.title;
  if (patch.start_at) body.start = { dateTime: patch.start_at, timeZone };
  if (patch.end_at) body.end = { dateTime: patch.end_at, timeZone };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return res.ok;
}
