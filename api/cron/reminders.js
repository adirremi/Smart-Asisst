import { serviceClient } from '../_lib/supabase.js';
import { sendWasenderMessage, phonesMatch } from '../_lib/wasender.js';
import { localMinutesOfDay, formatForUser } from '../_lib/datetime.js';

// Daily WhatsApp reminders, sent per-user in their own local timezone:
//   - 20:15  → upcoming events
//   - 08:45  → today's open tasks
//
// Instead of polling every 30 min, the Vercel Cron (see vercel.json) fires only
// at the exact UTC times that map to 08:45 / 20:15 in the timezones we actually
// serve. Two UTC variants per case cover DST (summer/winter); the local-clock
// check below only sends at the real local target, so the "wrong" DST tick is a
// harmless no-op. Whole-hour offsets make minutesNow land exactly on target.
//
//   Israel  (Asia/Jerusalem, UTC+3/+2):  morning 05:45 / 06:45   evening 17:15 / 18:15
//   California (America/Los_Angeles, -7/-8): morning 15:45 / 16:45  evening 03:15 / 04:15
//
// ADD A TIMEZONE: add primary + backup morning/evening UTC ticks in vercel.json.
// reminder_sent table dedupes so backup ticks never double-send.

const EVENTS_TARGET = 20 * 60 + 15; // 20:15
const TASKS_TARGET = 8 * 60 + 45; // 08:45
// Wider window + backup cron ticks (vercel.json) so a slightly late Vercel run
// still delivers; dedup in reminder_sent prevents double-sends.
const WINDOW = 30;

function inWindow(minutesNow, target) {
  return minutesNow >= target && minutesNow < target + WINDOW;
}

function localDateInTz(timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date()
  );
}

async function alreadySent(supabase, userId, kind, localDate) {
  const { data, error } = await supabase
    .from('reminder_sent')
    .select('user_id')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('local_date', localDate)
    .maybeSingle();
  if (error) {
    console.warn('reminder_sent check failed — run supabase/reminder_sent.sql:', error.message);
    return false;
  }
  return !!data;
}

async function markSent(supabase, userId, kind, localDate) {
  const { error } = await supabase.from('reminder_sent').upsert({
    user_id: userId,
    kind,
    local_date: localDate,
    sent_at: new Date().toISOString(),
  });
  if (error) console.warn('reminder_sent mark failed:', error.message);
}

async function getAdminRecipient(supabase) {
  const phone = (process.env.ADMIN_WHATSAPP_PHONE || '').split(',')[0].trim();
  const adminEmails = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!phone || adminEmails.length === 0) return null;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const match = data.users.find((u) => adminEmails.includes((u.email || '').toLowerCase()));
    if (match) {
      const name =
        match.user_metadata?.full_name || match.user_metadata?.name || 'מנהל';
      return {
        user_id: match.id,
        full_name: name,
        phone,
        timezone: 'Asia/Jerusalem',
      };
    }
    if (data.users.length < 200) break;
  }
  return null;
}

async function sendEventsReminder(supabase, r) {
  const nowIso = new Date().toISOString();
  const { data: events } = await supabase
    .from('calendar_events')
    .select('title, start_at')
    .eq('user_id', r.user_id)
    .gte('start_at', nowIso)
    .order('start_at', { ascending: true })
    .limit(10);

  if (!events || events.length === 0) return false;

  const lines = events.map((ev, i) => {
    const { dateStr, timeStr } = formatForUser(ev.start_at, r.timezone);
    return `${i + 1}. ${ev.title}, ${dateStr} ${timeStr}`;
  });

  const msg = `היי ${r.full_name || ''}! האירועים הקרובים שלך:\n${lines.join('\n')}`;
  await sendWasenderMessage(r.phone, msg);
  return true;
}

async function sendTasksReminder(supabase, r) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, status, created_date')
    .eq('user_id', r.user_id)
    .in('status', ['open', 'in_progress'])
    .order('created_date', { ascending: true });

  if (!tasks || tasks.length === 0) return false;

  const lines = tasks.map((t, i) => `${i + 1}. ${t.title}`);
  const msg = `היי 👋 המשימות שלך להיום הן:\n${lines.join('\n')}`;
  await sendWasenderMessage(r.phone, msg);
  return true;
}

export default async function handler(req, res) {
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    const provided = auth.replace('Bearer ', '') || req.query?.secret;
    if (provided !== secret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  try {
    const supabase = serviceClient();

    // Build the recipient list: every approved user + the admin.
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, phone, timezone')
      .eq('status', 'approved');

    const recipients = [...(profiles || [])];

    const admin = await getAdminRecipient(supabase);
    if (admin && !recipients.some((r) => phonesMatch(r.phone, admin.phone))) {
      recipients.push(admin);
    }

    const results = { events: 0, tasks: 0, checked: recipients.length, skipped: 0, utc: new Date().toISOString() };

    for (const r of recipients) {
      if (!r.phone || !r.timezone || !r.user_id) continue;
      const minutesNow = localMinutesOfDay(r.timezone);
      const localDate = localDateInTz(r.timezone);

      try {
        if (inWindow(minutesNow, EVENTS_TARGET)) {
          if (await alreadySent(supabase, r.user_id, 'events', localDate)) {
            results.skipped += 1;
          } else if (await sendEventsReminder(supabase, r)) {
            await markSent(supabase, r.user_id, 'events', localDate);
            results.events += 1;
          }
        }
        if (inWindow(minutesNow, TASKS_TARGET)) {
          if (await alreadySent(supabase, r.user_id, 'tasks', localDate)) {
            results.skipped += 1;
          } else if (await sendTasksReminder(supabase, r)) {
            await markSent(supabase, r.user_id, 'tasks', localDate);
            results.tasks += 1;
          }
        }
      } catch (err) {
        console.error(`Reminder failed for ${r.user_id}:`, err);
      }
    }

    res.status(200).json({ success: true, ...results });
  } catch (err) {
    console.error('reminders cron error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
