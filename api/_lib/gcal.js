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
