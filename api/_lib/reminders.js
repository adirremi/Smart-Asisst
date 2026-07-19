import { sendWasenderMessage, phonesMatch, isMessageQueueConfigured } from './wasender.js';
import { localMinutesOfDay, formatForUser } from './datetime.js';
import { findAdminAuthUser } from './adminUser.js';

export const TASKS_TIME = '08:45';
export const EVENTS_TIME = '20:15';
export const TASKS_TARGET = 8 * 60 + 45;
export const EVENTS_TARGET = 20 * 60 + 15;
export const WINDOW = 30;
export const TASKS_REMINDER_LIMIT = 30;

export const CRON_CONFIG = {
  path: '/api/cron/reminders',
  ticksPerDay: 20,
  regions: [
    { label: 'ישראל', timezone: 'Asia/Jerusalem' },
    { label: 'קליפורניה', timezone: 'America/Los_Angeles' },
  ],
};

export function inWindow(minutesNow, target) {
  return minutesNow >= target && minutesNow < target + WINDOW;
}

export function localDateInTz(timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function localTimeInTz(timeZone) {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

async function alreadySent(supabase, userId, kind, localDate) {
  const { data, error } = await supabase
    .from('reminder_sent')
    .select('user_id')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('local_date', localDate)
    .maybeSingle();
  if (error) return { sent: false, tableError: error.message };
  return { sent: !!data, tableError: null };
}

async function markSent(supabase, userId, kind, localDate) {
  const { error } = await supabase.from('reminder_sent').upsert({
    user_id: userId,
    kind,
    local_date: localDate,
    sent_at: new Date().toISOString(),
  });
  return !error;
}

async function getAdminRecipient(supabase) {
  const phone = (process.env.ADMIN_WHATSAPP_PHONE || '').split(',')[0].trim();
  if (!phone) return null;

  const match = await findAdminAuthUser(supabase);
  if (!match) return null;

  return {
    user_id: match.id,
    full_name: match.user_metadata?.full_name || match.user_metadata?.name || 'מנהל',
    phone,
    timezone: 'Asia/Jerusalem',
  };
}

export async function countOpenTasks(supabase, userId) {
  const { count } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['open', 'in_progress']);
  return count || 0;
}

export async function countUpcomingEvents(supabase, userId) {
  const { count } = await supabase
    .from('calendar_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('start_at', new Date().toISOString());
  return count || 0;
}

export const EVENTS_REMINDER_LIMIT = 8;

export async function sendEventsReminder(supabase, r) {
  const nowIso = new Date().toISOString();
  const { data: events } = await supabase
    .from('calendar_events')
    .select('title, start_at')
    .eq('user_id', r.user_id)
    .gte('start_at', nowIso)
    .order('start_at', { ascending: true })
    .limit(EVENTS_REMINDER_LIMIT);

  if (!events?.length) return false;

  const lines = events.map((ev, i) => {
    const { dateStr, timeStr } = formatForUser(ev.start_at, r.timezone);
    return `${i + 1}. ${ev.title}, ${dateStr} ${timeStr}`;
  });

  const msg = `היי ${r.full_name || ''}! האירועים הקרובים שלך:\n${lines.join('\n')}`;
  const result = await sendWasenderMessage(r.phone, msg);
  return !!result?.sent;
}

export async function sendTasksReminder(supabase, r) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title')
    .eq('user_id', r.user_id)
    .in('status', ['open', 'in_progress'])
    .order('created_date', { ascending: true })
    .limit(TASKS_REMINDER_LIMIT);

  if (!tasks?.length) return false;

  const lines = tasks.map((t, i) => `${i + 1}. ${t.title}`);
  const msg = `היי 👋 המשימות שלך להיום הן:\n${lines.join('\n')}`;
  const result = await sendWasenderMessage(r.phone, msg);
  return !!result?.sent;
}

async function buildRecipients(supabase) {
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, phone, timezone')
    .eq('status', 'approved');

  const recipients = [...(profiles || [])];
  const admin = await getAdminRecipient(supabase);
  if (admin && !recipients.some((r) => phonesMatch(r.phone, admin.phone))) {
    recipients.push(admin);
  }
  return recipients;
}

// Run the daily reminder job (same logic as Vercel cron).
export async function runReminders(supabase, { force = false, userId = null, kind = null, skipDedup = false } = {}) {
  const recipients = await buildRecipients(supabase);
  const filtered = userId ? recipients.filter((r) => r.user_id === userId) : recipients;

  const results = {
    events: 0,
    tasks: 0,
    checked: filtered.length,
    skipped: 0,
    failed: 0,
    utc: new Date().toISOString(),
  };

  for (const r of filtered) {
    if (!r.phone || !r.timezone || !r.user_id) continue;
    const minutesNow = localMinutesOfDay(r.timezone);
    const localDate = localDateInTz(r.timezone);

    const tryKind = async (k, target, sendFn) => {
      if (kind && kind !== k) return;
      if (!force && !inWindow(minutesNow, target)) return;

      if (!skipDedup) {
        const { sent } = await alreadySent(supabase, r.user_id, k, localDate);
        if (sent) {
          results.skipped += 1;
          return;
        }
      }

      try {
        if (await sendFn(supabase, r)) {
          if (!skipDedup) await markSent(supabase, r.user_id, k, localDate);
          results[k === 'tasks' ? 'tasks' : 'events'] += 1;
        }
      } catch (err) {
        results.failed += 1;
        console.error(`Reminder ${k} failed for ${r.user_id}:`, err);
      }
    };

    await tryKind('events', EVENTS_TARGET, sendEventsReminder);
    await tryKind('tasks', TASKS_TARGET, sendTasksReminder);
  }

  return results;
}

export async function getRemindersStatus(supabase) {
  const { error: tableError } = await supabase.from('reminder_sent').select('user_id').limit(1);

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, phone, timezone')
    .eq('status', 'approved')
    .order('full_name');

  const todayByUser = {};
  const { data: sentRows } = await supabase
    .from('reminder_sent')
    .select('user_id, kind, local_date, sent_at')
    .order('sent_at', { ascending: false })
    .limit(200);

  for (const row of sentRows || []) {
    const key = `${row.user_id}:${row.local_date}`;
    if (!todayByUser[key]) todayByUser[key] = {};
    todayByUser[key][row.kind] = row.sent_at;
  }

  // Batch counts in 2 queries instead of 2N (was N+1 per user).
  const userIds = (profiles || []).map((u) => u.user_id).filter(Boolean);
  const openTasksByUser = {};
  const upcomingEventsByUser = {};
  if (userIds.length > 0) {
    const nowIso = new Date().toISOString();
    const [{ data: taskRows }, { data: eventRows }] = await Promise.all([
      supabase
        .from('tasks')
        .select('user_id')
        .in('user_id', userIds)
        .in('status', ['open', 'in_progress']),
      supabase
        .from('calendar_events')
        .select('user_id')
        .in('user_id', userIds)
        .gte('start_at', nowIso),
    ]);
    for (const row of taskRows || []) {
      openTasksByUser[row.user_id] = (openTasksByUser[row.user_id] || 0) + 1;
    }
    for (const row of eventRows || []) {
      upcomingEventsByUser[row.user_id] = (upcomingEventsByUser[row.user_id] || 0) + 1;
    }
  }

  const users = [];
  for (const u of profiles || []) {
    const localDate = u.timezone ? localDateInTz(u.timezone) : null;
    const minutesNow = u.timezone ? localMinutesOfDay(u.timezone) : null;
    const sentKey = `${u.user_id}:${localDate}`;
    const sent = todayByUser[sentKey] || {};

    const openTasks = openTasksByUser[u.user_id] || 0;
    const upcomingEvents = upcomingEventsByUser[u.user_id] || 0;

    users.push({
      user_id: u.user_id,
      full_name: u.full_name,
      phone: u.phone,
      timezone: u.timezone,
      localTime: u.timezone ? localTimeInTz(u.timezone) : null,
      localDate,
      openTasks,
      upcomingEvents,
      tasksSentToday: !!sent.tasks,
      eventsSentToday: !!sent.events,
      tasksSentAt: sent.tasks || null,
      eventsSentAt: sent.events || null,
      inTasksWindow: minutesNow != null && inWindow(minutesNow, TASKS_TARGET),
      inEventsWindow: minutesNow != null && inWindow(minutesNow, EVENTS_TARGET),
      canReceiveTasks: !!(u.phone && u.timezone && openTasks > 0),
      canReceiveEvents: !!(u.phone && u.timezone && upcomingEvents > 0),
    });
  }

  const recent = (sentRows || []).slice(0, 30).map((row) => {
    const profile = (profiles || []).find((p) => p.user_id === row.user_id);
    return {
      ...row,
      full_name: profile?.full_name || '—',
    };
  });

  return {
    config: {
      tasksTime: TASKS_TIME,
      eventsTime: EVENTS_TIME,
      windowMinutes: WINDOW,
      ...CRON_CONFIG,
    },
    env: {
      cronSecretSet: !!process.env.CRON_SECRET,
      wasenderSet: isMessageQueueConfigured(),
      reminderTableOk: !tableError,
      reminderTableError: tableError?.message || null,
    },
    utcNow: new Date().toISOString(),
    users,
    recent,
  };
}
