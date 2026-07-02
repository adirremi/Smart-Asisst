import { serviceClient } from '../_lib/supabase.js';
import { runSync } from '../_lib/sync.js';

function decodeBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const idx = credentials.indexOf(':');
  return { username: credentials.slice(0, idx), password: credentials.slice(idx + 1) };
}

function checkAuth(req) {
  const credentials = decodeBasicAuth(req.headers.authorization || req.headers.Authorization);
  return (
    credentials &&
    credentials.username === process.env.TASK_WEBHOOK_USERNAME &&
    credentials.password === process.env.TASK_WEBHOOK_PASSWORD
  );
}

const OWNER_ID = process.env.WEBHOOK_OWNER_USER_ID;

export default async function handler(req, res) {
  try {
    if (!checkAuth(req)) {
      res.status(401).json({ success: false, error: 'Unauthorized - Invalid credentials' });
      return;
    }

    const supabase = serviceClient();

    // GET → return upcoming events (title + start_time) for the next 2 weeks.
    if (req.method === 'GET') {
      const query = supabase.from('calendar_events').select('*').order('start_at', { ascending: false }).limit(50);
      if (OWNER_ID) query.eq('user_id', OWNER_ID);
      const { data: events, error } = await query;
      if (error) throw error;

      const now = new Date();
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const formatted = (events || [])
        .filter((event) => {
          const d = new Date(event.start_at);
          return d >= now && d <= twoWeeksLater;
        })
        .map((event) => {
          const cleanTitle = (event.title || '').replace(/['"״׳]/g, '');
          let startTime = event.start_at;
          if (event.all_day) {
            startTime = `${event.start_at.split('T')[0]}T10:00:00.000Z`;
          }
          return { title: cleanTitle, start_time: startTime };
        });

      res.status(200).json(formatted);
      return;
    }

    // POST → trigger a Google Calendar sync.
    if (req.method === 'POST') {
      if (!OWNER_ID) {
        res.status(400).json({ success: false, error: 'WEBHOOK_OWNER_USER_ID is not configured' });
        return;
      }

      const result = await runSync(supabase, OWNER_ID);
      if (result.ok) {
        const { created = 0, updated = 0 } = result.body;
        res.status(200).json({
          success: true,
          syncedCount: created + updated,
          newCount: created,
          message: `Synced ${created + updated} events from Google Calendar, ${created} new events added`,
        });
      } else {
        res.status(result.status).json({ success: false, error: result.body.error });
      }
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Calendar webhook error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
