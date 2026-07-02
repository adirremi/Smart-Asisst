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

  // Attendees: [{ email, displayName }]. Google emails them a real invite.
  const attendees = (ev.attendees || []).filter((a) => a && a.email);
  if (attendees.length) {
    body.attendees = attendees.map((a) => ({
      email: a.email,
      displayName: a.displayName || undefined,
    }));
  }

  // sendUpdates=all makes Google email invitations to the attendees.
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    (attendees.length ? '?sendUpdates=all' : '');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error('Google event create failed:', await res.text());
    return null;
  }
  const data = await res.json();
  return { id: data.id || null, htmlLink: data.htmlLink || null };
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

// Patch an existing event (time, title, and/or added attendees) in Google Calendar.
export async function updateGoogleEvent(supabase, connection, googleEventId, patch) {
  const accessToken = await getAccessTokenForConnection(supabase, connection);
  if (!accessToken || !googleEventId) return false;
  const calendarId = connection.default_calendar_id || 'primary';
  const timeZone = patch.timeZone || 'Asia/Jerusalem';
  const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`;

  const body = {};
  if (patch.title) body.summary = patch.title;
  if (patch.start_at) body.start = { dateTime: patch.start_at, timeZone };
  if (patch.end_at) body.end = { dateTime: patch.end_at, timeZone };

  // Adding attendees: PATCH replaces the whole list, so fetch current attendees
  // and merge (dedupe by email) before patching.
  const toAdd = (patch.addAttendees || []).filter((a) => a && a.email);
  let sendUpdates = false;
  if (toAdd.length) {
    let existing = [];
    try {
      const getRes = await fetch(eventUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (getRes.ok) {
        const cur = await getRes.json();
        existing = Array.isArray(cur.attendees) ? cur.attendees : [];
      }
    } catch (err) {
      console.error('Fetch event for attendee merge failed:', err);
    }
    const byEmail = new Map();
    for (const a of existing) if (a?.email) byEmail.set(a.email.toLowerCase(), a);
    for (const a of toAdd) {
      byEmail.set(a.email.toLowerCase(), { email: a.email, displayName: a.displayName || undefined });
    }
    body.attendees = Array.from(byEmail.values());
    sendUpdates = true;
  }

  if (Object.keys(body).length === 0) return true;

  const res = await fetch(eventUrl + (sendUpdates ? '?sendUpdates=all' : ''), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok;
}
