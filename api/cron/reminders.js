import { serviceClient } from '../_lib/supabase.js';
import { sendWasenderMessage, phonesMatch } from '../_lib/wasender.js';
import { localMinutesOfDay, formatForUser } from '../_lib/datetime.js';

// Daily WhatsApp reminders, sent per-user in their own local timezone:
//   - 20:15  → upcoming events
//   - 08:45  → today's open tasks
// Triggered by a Vercel Cron at :15 and :45 past every hour (see vercel.json).
// Checking each user's local clock lets it cover every timezone with just two
// ticks per hour, and new users are picked up automatically.

const EVENTS_TARGET = 20 * 60 + 15; // 20:15
const TASKS_TARGET = 8 * 60 + 45; // 08:45
const WINDOW = 15; // one cron tick lands exactly on each target minute

function inWindow(minutesNow, target) {
  return minutesNow >= target && minutesNow < target + WINDOW;
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

    const results = { events: 0, tasks: 0, checked: recipients.length };

    for (const r of recipients) {
      if (!r.phone || !r.timezone || !r.user_id) continue;
      const minutesNow = localMinutesOfDay(r.timezone);

      try {
        if (inWindow(minutesNow, EVENTS_TARGET)) {
          if (await sendEventsReminder(supabase, r)) results.events += 1;
        }
        if (inWindow(minutesNow, TASKS_TARGET)) {
          if (await sendTasksReminder(supabase, r)) results.tasks += 1;
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
