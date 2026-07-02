import { getAccessTokenForConnection } from './google.js';

// Core two-way Google Calendar sync for a single user.
// Shared by the syncGoogleCalendar function and the calendarWebhook.
export async function runSync(supabase, userId) {
  const { data: connections } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .limit(1);

  if (!connections || connections.length === 0) {
    return { ok: false, status: 400, body: { success: false, error: 'לא נמצא חיבור ל-Google Calendar', needsConnection: true } };
  }

  const connection = connections[0];

  if (!connection.sync_enabled) {
    return { ok: false, status: 400, body: { success: false, error: 'Sync is disabled', needsEnable: true } };
  }

  const accessToken = await getAccessTokenForConnection(supabase, connection);
  if (!accessToken) {
    return { ok: false, status: 401, body: { success: false, error: 'Failed to get access token', needsReauth: true } };
  }

  // Use the user's real timezone (so non-Israel users like California sync correctly).
  const { data: profileRows } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('user_id', userId)
    .limit(1);
  const userTimeZone = profileRows?.[0]?.timezone || 'Asia/Jerusalem';

  let calendarId = connection.default_calendar_id || 'primary';
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 1);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 3);

  const fetchEvents = (calId) =>
    fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?` +
        `timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

  let calendarResponse = await fetchEvents(calendarId);

  // A wrong/deleted calendar id returns 404 — fall back to the primary calendar
  // and self-heal the stored value so future syncs work.
  if (calendarResponse.status === 404 && calendarId !== 'primary') {
    calendarId = 'primary';
    await supabase
      .from('calendar_connections')
      .update({ default_calendar_id: 'primary' })
      .eq('id', connection.id);
    calendarResponse = await fetchEvents(calendarId);
  }

  if (!calendarResponse.ok) {
    const details = await calendarResponse.text();
    return { ok: false, status: calendarResponse.status, body: { success: false, error: 'Failed to fetch from Google Calendar', details } };
  }

  const calendarData = await calendarResponse.json();
  const googleEvents = calendarData.items || [];

  const { data: existingEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('source', 'google');

  const existingByGoogleId = {};
  (existingEvents || []).forEach((event) => {
    if (event.google_event_id) existingByGoogleId[event.google_event_id] = event;
  });

  let created = 0;
  let updated = 0;
  let pushFailed = 0;
  let firstPushError = null;

  for (const googleEvent of googleEvents) {
    if (googleEvent.status === 'cancelled') continue;
    // Some Google entries (working location, focus time, etc.) may lack start/end.
    if (!googleEvent.start || !googleEvent.end) continue;

    const startAt = googleEvent.start.dateTime || googleEvent.start.date;
    const endAt = googleEvent.end.dateTime || googleEvent.end.date;
    if (!startAt || !endAt) continue;

    const eventData = {
      title: googleEvent.summary || 'אירוע ללא כותרת',
      description: googleEvent.description || '',
      start_at: startAt,
      end_at: endAt,
      location: googleEvent.location || '',
      attendees: (googleEvent.attendees || []).map((a) => a.email),
      source: 'google',
      google_event_id: googleEvent.id,
      all_day: !googleEvent.start.dateTime,
    };

    const existing = existingByGoogleId[googleEvent.id];
    if (existing) {
      await supabase.from('calendar_events').update(eventData).eq('id', existing.id);
      updated++;
    } else {
      await supabase
        .from('calendar_events')
        .insert({ ...eventData, user_id: userId, created_by: connection.created_by });
      created++;
    }
  }

  if (connection.two_way_sync) {
    const { data: localEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('source', 'local');

    for (const localEvent of localEvents || []) {
      if (!localEvent.start_at || !localEvent.end_at) continue;

      const googleEventData = {
        summary: localEvent.title,
        description: localEvent.description || '',
        start: localEvent.all_day
          ? { date: String(localEvent.start_at).split('T')[0] }
          : { dateTime: localEvent.start_at, timeZone: userTimeZone },
        end: localEvent.all_day
          ? { date: String(localEvent.end_at).split('T')[0] }
          : { dateTime: localEvent.end_at, timeZone: userTimeZone },
        location: localEvent.location || '',
        attendees: (localEvent.attendees || []).map((email) => ({ email })),
      };

      try {
        const createResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(googleEventData),
          }
        );

        if (createResponse.ok) {
          const createdGoogleEvent = await createResponse.json();
          await supabase
            .from('calendar_events')
            .update({ google_event_id: createdGoogleEvent.id, source: 'google' })
            .eq('id', localEvent.id);
          created++;
        } else {
          pushFailed++;
          if (!firstPushError) firstPushError = await createResponse.text();
        }
      } catch (pushErr) {
        pushFailed++;
        if (!firstPushError) firstPushError = pushErr.message;
      }
    }
  }

  await supabase
    .from('calendar_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', connection.id);

  if (pushFailed > 0) {
    console.error(`Two-way push failed for ${pushFailed} event(s). First error:`, firstPushError);
  }

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      created,
      updated,
      pushFailed,
      total: googleEvents.length,
      message:
        `סנכרון הושלם: ${created} נוצרו, ${updated} עודכנו` +
        (pushFailed > 0 ? ` (${pushFailed} אירועים לא נשלחו ל-Google)` : ''),
    },
  };
}
