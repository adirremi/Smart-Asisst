import { serviceClient, readJsonBody } from '../_lib/supabase.js';
import { sendWasenderMessage, phonesMatch } from '../_lib/wasender.js';
import { interpretMessage } from '../_lib/ai.js';
import { zonedTimeToUtc, nowInTimeZone, formatForUser, viewRange } from '../_lib/datetime.js';
import { createGoogleEvent, deleteGoogleEvent, updateGoogleEvent } from '../_lib/gcal.js';
import { findBestMatch } from '../_lib/match.js';

const AFFIRMATIVE = ['כן', 'כ', 'אישור', 'אשר', 'מאשר', 'בטח', 'בסדר', 'אוקי', 'אוקיי', 'yes', 'y', 'ok', 'okay', 'sure', 'confirm'];
const NEGATIVE = ['לא', 'ביטול', 'בטל', 'עזוב', 'no', 'n', 'cancel', 'stop'];

function isAffirmative(normalized) {
  return AFFIRMATIVE.includes(normalized);
}
function isNegative(normalized) {
  return NEGATIVE.includes(normalized);
}

// A note about who was invited / who had no email, for confirmed invite actions.
function inviteNote(action) {
  let note = '';
  if (action.invitedNames?.length) note += `\n👥 הוזמנו: ${action.invitedNames.join(', ')}`;
  if (action.noEmail?.length) note += `\n⚠️ אין אימייל ל: ${action.noEmail.join(', ')} (נוספו בלי הזמנה)`;
  if (action.notFound?.length) note += `\n❓ לא מצאתי באנשי הקשר: ${action.notFound.join(', ')}`;
  return note;
}

// Execute a previously-confirmed action. Returns a confirmation message.
async function executePending(supabase, connection, action, timeZone, profile) {
  if (action.type === 'cancel_task') {
    await supabase.from('tasks').delete().eq('id', action.id);
    return `בוצע! מחקתי את המשימה 🗑️\n"${action.title}"`;
  }

  if (action.type === 'cancel_event') {
    if (action.google_event_id) {
      await deleteGoogleEvent(supabase, connection, action.google_event_id).catch(() => {});
    }
    await supabase.from('calendar_events').delete().eq('id', action.id);
    if (action.start_at) {
      const { dateStr, timeStr } = formatForUser(action.start_at, timeZone);
      return `בוצע! ביטלתי את האירוע 🗑️\n"${action.title}" (${dateStr} ${timeStr})`;
    }
    return `בוצע! ביטלתי את האירוע 🗑️\n"${action.title}"`;
  }

  if (action.type === 'create_event') {
    const allNames = [...(action.names || []), ...(action.noEmail || [])];
    const { data: inserted } = await supabase
      .from('calendar_events')
      .insert({
        user_id: profile.user_id,
        created_by: profile.email,
        title: action.title,
        description: '',
        start_at: action.start_at,
        end_at: action.end_at,
        location: '',
        attendees: Array.from(new Set(allNames)),
        source: 'local',
        all_day: false,
      })
      .select()
      .single();

    let htmlLink = null;
    try {
      const gEvent = await createGoogleEvent(supabase, connection, {
        title: action.title,
        start_at: action.start_at,
        end_at: action.end_at,
        timeZone: action.timeZone || timeZone,
        attendees: action.attendees || [],
      });
      if (gEvent?.id && inserted) {
        htmlLink = gEvent.htmlLink;
        await supabase
          .from('calendar_events')
          .update({ google_event_id: gEvent.id, source: 'google' })
          .eq('id', inserted.id);
      }
    } catch (err) {
      console.error('GCal push (confirmed create) failed:', err);
    }

    const { dateStr, timeStr } = formatForUser(action.start_at, timeZone);
    let msg = `בוצע! יצרתי אירוע חדש 📅\n"${action.title}"\nבתאריך ${dateStr} בשעה ${timeStr}`;
    msg += inviteNote(action);
    if (htmlLink) msg += `\n\n🔗 לצפייה ביומן:\n${htmlLink}`;
    return msg;
  }

  if (action.type === 'update_event') {
    const patch = action.patch || {};
    if (Object.keys(patch).length) {
      await supabase.from('calendar_events').update(patch).eq('id', action.id);
    }
    if (action.google_event_id) {
      await updateGoogleEvent(supabase, connection, action.google_event_id, {
        title: patch.title,
        start_at: patch.start_at,
        end_at: patch.end_at,
        addAttendees: action.invited || [],
        timeZone,
      }).catch(() => {});
    }
    let msg = `בוצע! עדכנתי את האירוע ✏️\n"${action.title}"`;
    msg += inviteNote(action);
    return msg;
  }

  if (action.type === 'convert_task_to_event') {
    await supabase.from('tasks').delete().eq('id', action.taskId);

    const { data: inserted } = await supabase
      .from('calendar_events')
      .insert({
        user_id: profile.user_id,
        created_by: profile.email,
        title: action.title,
        description: '',
        start_at: action.start_at,
        end_at: action.end_at,
        location: '',
        attendees: [],
        source: 'local',
        all_day: false,
      })
      .select()
      .single();

    let htmlLink = null;
    try {
      const gEvent = await createGoogleEvent(supabase, connection, {
        title: action.title,
        start_at: action.start_at,
        end_at: action.end_at,
        timeZone: action.timeZone || timeZone,
      });
      if (gEvent?.id && inserted) {
        htmlLink = gEvent.htmlLink;
        await supabase
          .from('calendar_events')
          .update({ google_event_id: gEvent.id, source: 'google' })
          .eq('id', inserted.id);
      }
    } catch (err) {
      console.error('GCal push (convert task) failed:', err);
    }

    const { dateStr, timeStr } = formatForUser(action.start_at, timeZone);
    let msg = `בוצע! הפכתי את המשימה לאירוע 📅\n"${action.title}"\n${dateStr} ${timeStr}`;
    if (htmlLink) msg += `\n\n🔗 לצפייה ביומן:\n${htmlLink}`;
    return msg;
  }

  return 'בוצע 👍';
}

// Resolve the admin as a virtual user when the sender matches ADMIN_WHATSAPP_PHONE.
// The admin skips onboarding (no user_profiles row), so we look up their auth user
// by ADMIN_EMAIL and force the Jerusalem timezone.
async function resolveAdminProfile(supabase, senderPhone) {
  const adminPhones = (process.env.ADMIN_WHATSAPP_PHONE || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const adminEmails = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminPhones.some((p) => phonesMatch(p, senderPhone)) || adminEmails.length === 0) {
    return null;
  }

  // Find the admin's auth user by email (paginate through users).
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const match = data.users.find((u) => adminEmails.includes((u.email || '').toLowerCase()));
    if (match) {
      return {
        user_id: match.id,
        email: match.email,
        timezone: 'Asia/Jerusalem',
      };
    }
    if (data.users.length < 200) break;
  }
  return null;
}

// Incoming WhatsApp messages from Wasender.
// Configure this URL as your webhook in the Wasender dashboard.
export default async function handler(req, res) {
  // Respond fast so Wasender doesn't retry; do the work, then 200.
  try {
    // Optional shared-secret protection.
    const secret = process.env.WASENDER_WEBHOOK_SECRET;
    if (secret) {
      const provided =
        req.headers['x-webhook-signature'] ||
        req.headers['x-webhook-secret'] ||
        req.query?.secret;
      if (provided !== secret) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    }

    const payload = await readJsonBody(req);
    const event = payload.event;

    // Only handle incoming (received) text messages.
    if (event && event !== 'messages.received' && event !== 'messages.upsert') {
      res.status(200).json({ ignored: true, reason: 'event' });
      return;
    }

    const msg = payload?.data?.messages;
    if (!msg || msg.key?.fromMe) {
      res.status(200).json({ ignored: true, reason: 'no-incoming-message' });
      return;
    }

    const text = (msg.messageBody || msg.message?.conversation || '').trim();
    const senderPhone =
      msg.key?.cleanedSenderPn || msg.key?.cleanedParticipantPn || msg.key?.remoteJid;

    if (!text || !senderPhone) {
      res.status(200).json({ ignored: true, reason: 'empty' });
      return;
    }

    const supabase = serviceClient();

    // Match the sender phone to an approved user.
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('status', 'approved');

    let profile = (profiles || []).find((p) => phonesMatch(p.phone, senderPhone));

    // Fallback: the admin skips onboarding, so match them by ADMIN_WHATSAPP_PHONE.
    if (!profile) {
      profile = await resolveAdminProfile(supabase, senderPhone);
    }

    if (!profile) {
      // Unknown / unapproved sender — ignore silently.
      res.status(200).json({ ignored: true, reason: 'no-approved-user' });
      return;
    }

    const siteUrl =
      process.env.APP_URL || process.env.VITE_APP_URL || `https://${req.headers.host}`;

    // Fetch the user's Google Calendar connection.
    const { data: connections } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', profile.user_id)
      .limit(1);
    const connection = connections?.[0];

    // CRITICAL GATE: the client must connect their Google Calendar first.
    if (!connection) {
      await sendWasenderMessage(
        senderPhone,
        `היי ${profile.full_name || ''}! 👋\nלפני שמתחילים צריך לחבר את יומן ה-Google שלך.\nהיכנס לכאן, התחבר עם Gmail וחבר את היומן:\n${siteUrl}\n\nאחרי החיבור פשוט שלח לי משימה או אירוע ואטפל בזה 🙂`
      );
      res.status(200).json({ success: true, type: 'needs-connection' });
      return;
    }

    const normalizedEarly = text.trim().toLowerCase().replace(/[!?.,"'`~׃׀|]/g, '');

    // --- Pending confirmation (e.g. a delete awaiting yes/no) ---
    const { data: pendingRow } = await supabase
      .from('whatsapp_pending')
      .select('*')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    const pendingFresh =
      pendingRow &&
      Date.now() - new Date(pendingRow.created_at).getTime() < 15 * 60 * 1000;

    if (pendingFresh) {
      const tz = profile.timezone || 'Asia/Jerusalem';
      if (isAffirmative(normalizedEarly)) {
        const msg = await executePending(supabase, connection, pendingRow.action, tz, profile);
        await supabase.from('whatsapp_pending').delete().eq('user_id', profile.user_id);
        await sendWasenderMessage(senderPhone, msg);
        res.status(200).json({ success: true, type: 'confirmed' });
        return;
      }
      if (isNegative(normalizedEarly)) {
        await supabase.from('whatsapp_pending').delete().eq('user_id', profile.user_id);
        await sendWasenderMessage(senderPhone, 'בסדר, ביטלתי את הפעולה 👍');
        res.status(200).json({ success: true, type: 'declined' });
        return;
      }
      // Any other message discards the stale pending action and continues normally.
      await supabase.from('whatsapp_pending').delete().eq('user_id', profile.user_id);
    }

    // --- Special cases handled before the AI ---
    const normalized = text.trim().toLowerCase().replace(/[!?.,"'`~׃׀|]/g, '');
    const words = normalized.split(/\s+/).filter(Boolean);

    const GREETING_WORDS = [
      'היי', 'הי', 'שלום', 'אהלן', 'הלו', 'אלו', 'hey', 'hello', 'hi', 'yo', 'hola',
    ];
    const GREETING_PHRASES = ['בוקר טוב', 'ערב טוב', 'מה קורה', 'מה נשמע', 'מה המצב'];
    const SITE_WORDS = [
      'אתר', 'קישור', 'לינק', 'site', 'link', 'website', 'דשבורד', 'dashboard', 'אפליקציה', 'app',
    ];

    const isGreeting =
      GREETING_PHRASES.includes(normalized) ||
      GREETING_WORDS.includes(normalized) ||
      (words.length <= 2 && words.some((w) => GREETING_WORDS.includes(w)));
    const isSiteRequest = SITE_WORDS.some((k) => words.includes(k));

    if (isGreeting || isSiteRequest) {
      await sendWasenderMessage(
        senderPhone,
        `היי ${profile.full_name || ''}! 👋\nהנה הקישור לאתר שלך:\n${siteUrl}\n\nאפשר גם לשלוח לי כאן משימה או אירוע ואוסיף אותם עבורך אוטומטית.`
      );
      res.status(200).json({ success: true, type: 'greeting' });
      return;
    }

    // Require at least two words so there's enough context to understand.
    if (words.length < 2) {
      await sendWasenderMessage(
        senderPhone,
        `היי! כדי שאבין אותך צריך לפחות שתי מילים 🙂\nלמשל: "מחר בעשר פגישה עם דנה" או "לשלם חשבונות".`
      );
      res.status(200).json({ success: true, type: 'too-short' });
      return;
    }

    const timeZone = profile.timezone || 'Asia/Jerusalem';
    const today = nowInTimeZone(timeZone);

    // Lazily-loaded, cached contacts list for the user (for attendee tagging).
    let contactsCache = null;
    const getContacts = async () => {
      if (contactsCache) return contactsCache;
      const { data } = await supabase
        .from('contacts')
        .select('name, email')
        .eq('user_id', profile.user_id);
      contactsCache = data || [];
      return contactsCache;
    };

    // Resolve AI-extracted attendee NAMES to contacts.
    // Returns { invited: [{email, displayName}], names: [matched names],
    //           notFound: [names], noEmail: [names] }.
    const resolveAttendees = async (names) => {
      const out = { invited: [], names: [], notFound: [], noEmail: [] };
      const list = (names || []).map((n) => String(n || '').trim()).filter(Boolean);
      if (!list.length) return out;
      const contacts = await getContacts();
      for (const name of list) {
        const match = findBestMatch(contacts, name, 'name');
        if (!match) {
          out.notFound.push(name);
          continue;
        }
        out.names.push(match.name);
        if (match.email) {
          out.invited.push({ email: match.email, displayName: match.name });
        } else {
          out.noEmail.push(match.name);
        }
      }
      return out;
    };

    // Short line about who was invited / who couldn't be. Accepts a result whose
    // `invited` may be strings (names) or {displayName} objects.
    const attendeeNote = (r) => {
      const nameOf = (a) => (typeof a === 'string' ? a : a?.displayName || '');
      const invited = (r?.invited || []).map(nameOf).filter(Boolean);
      let note = '';
      if (invited.length) note += `\n👥 הוזמנו: ${invited.join(', ')}`;
      if (r?.noEmail?.length) note += `\n⚠️ אין אימייל ל: ${r.noEmail.join(', ')} (נוספו בלי הזמנה)`;
      if (r?.notFound?.length) note += `\n❓ לא מצאתי באנשי הקשר: ${r.notFound.join(', ')}`;
      return note;
    };

    // Ground the AI in the user's real contact names so it only tags people who exist.
    const contactNames = (await getContacts()).map((c) => c.name).filter(Boolean);

    // Understand the user's intent.
    const result = await interpretMessage({
      message: text,
      timeZone,
      todayFull: today.full,
      weekdayHe: today.weekdayHe,
      contactNames,
    });
    const intent = result.intent;

    // ---- LOW CONFIDENCE: ask a clarifying question instead of acting ----
    // Only gate actionable intents; view/unknown fall through to their own handling.
    const ACTIONABLE = ['create_event', 'create_task', 'create_multi', 'cancel', 'update', 'complete', 'convert_task_to_event'];
    const confidence = typeof result.confidence === 'number' ? result.confidence : 1;
    if (ACTIONABLE.includes(intent) && confidence < 0.5) {
      const clarify =
        (result.clarify && String(result.clarify).trim()) ||
        'לא הייתי בטוח שהבנתי. אפשר לנסח מחדש בצורה מדויקת יותר? 🙂';
      await sendWasenderMessage(senderPhone, clarify);
      res.status(200).json({ success: true, intent, lowConfidence: true });
      return;
    }

    // ---- VIEW: list upcoming events / open tasks ----
    if (intent === 'view') {
      const scope = result.scope || 'events';
      const range = result.range || 'today';
      const { startUtc, endUtc } = viewRange(range, result.date, timeZone);
      const rangeLabels = { today: 'להיום', tomorrow: 'למחר', week: 'לשבוע הקרוב', all: 'הקרובים' };
      const rangeLabel =
        range === 'date' && result.date
          ? `לתאריך ${result.date.split('-').reverse().join('.')}`
          : rangeLabels[range] || '';
      const parts = [];

      if (scope === 'events' || scope === 'both') {
        const { data: events } = await supabase
          .from('calendar_events')
          .select('title, start_at')
          .eq('user_id', profile.user_id)
          .gte('start_at', startUtc.toISOString())
          .lte('start_at', endUtc.toISOString())
          .order('start_at', { ascending: true })
          .limit(20);
        if (events && events.length) {
          const lines = events.map((ev, i) => {
            const { dateStr, timeStr } = formatForUser(ev.start_at, timeZone);
            return `${i + 1}. ${ev.title}, ${dateStr} ${timeStr}`;
          });
          parts.push(`📅 אירועים ${rangeLabel}:\n${lines.join('\n')}`);
        } else if (scope === 'events') {
          parts.push(`📅 אין לך אירועים ${rangeLabel} 🎉`);
        }
      }

      if (scope === 'tasks' || scope === 'both') {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('title')
          .eq('user_id', profile.user_id)
          .in('status', ['open', 'in_progress'])
          .order('created_date', { ascending: true });
        if (tasks && tasks.length) {
          const lines = tasks.map((t, i) => `${i + 1}. ${t.title}`);
          parts.push(`✅ משימות פתוחות:\n${lines.join('\n')}`);
        } else if (scope === 'tasks') {
          parts.push('✅ אין לך משימות פתוחות. כל הכבוד!');
        }
      }

      const body = parts.length ? parts.join('\n\n') : 'אין לך אירועים או משימות בטווח המבוקש 🙂';
      await sendWasenderMessage(senderPhone, `היי ${profile.full_name || ''}!\n${body}`);
      res.status(200).json({ success: true, intent });
      return;
    }

    // ---- COMPLETE: mark a task as done ----
    if (intent === 'complete') {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', profile.user_id)
        .in('status', ['open', 'in_progress']);
      const match = findBestMatch(tasks || [], result.query || text);
      if (!match) {
        await sendWasenderMessage(senderPhone, `לא מצאתי משימה פתוחה שמתאימה ל"${result.query || text}" 🤔`);
        res.status(200).json({ success: true, intent, matched: false });
        return;
      }
      await supabase.from('tasks').update({ status: 'done' }).eq('id', match.id);
      await sendWasenderMessage(senderPhone, `מעולה! סימנתי כבוצע ✅\n"${match.title}"`);
      res.status(200).json({ success: true, intent, matched: true });
      return;
    }

    // ---- CONVERT: turn an open task into a calendar event (confirm first) ----
    if (intent === 'convert_task_to_event') {
      if (!result.start_datetime) {
        await sendWasenderMessage(
          senderPhone,
          'לאיזה זמן להעביר את המשימה ליומן? 🤔\nלמשל: "תשנה את המשימה להתקשר לאמא לאירוע היום בערב".'
        );
        res.status(200).json({ success: true, intent, matched: false, reason: 'no_time' });
        return;
      }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', profile.user_id)
        .in('status', ['open', 'in_progress']);

      const match = findBestMatch(tasks || [], result.query || text);
      if (!match) {
        await sendWasenderMessage(
          senderPhone,
          `לא מצאתי משימה פתוחה שמתאימה ל"${result.query || text}" 🤔\nנסה לכתוב חלק מהשם המדויק.`
        );
        res.status(200).json({ success: true, intent, matched: false });
        return;
      }

      const title = (result.new_title && String(result.new_title).trim()) || match.title;
      const startUtc = zonedTimeToUtc(result.start_datetime, timeZone);
      const duration = Number(result.duration_minutes) || 30;
      const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);
      const { dateStr, timeStr } = formatForUser(startUtc.toISOString(), timeZone);

      await supabase.from('whatsapp_pending').upsert({
        user_id: profile.user_id,
        action: {
          type: 'convert_task_to_event',
          taskId: match.id,
          title,
          start_at: startUtc.toISOString(),
          end_at: endUtc.toISOString(),
          timeZone,
        },
        created_at: new Date().toISOString(),
      });

      await sendWasenderMessage(
        senderPhone,
        `להפוך את המשימה לאירוע?\n"${match.title}" → אירוע ב-${dateStr} ${timeStr}\n(המשימה תימחק מהרשימה)\n\nהשב "כן" לאישור או "לא" לביטול.`
      );
      res.status(200).json({ success: true, intent, awaitingConfirm: true });
      return;
    }

    // ---- CANCEL: ask for confirmation, then delete on "כן" ----
    // Search BOTH events and tasks so a wrong target_type guess can't cause a miss.
    if (intent === 'cancel') {
      const query = result.query || text;
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', profile.user_id)
        .gte('start_at', dayAgo)
        .order('start_at', { ascending: true });

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', profile.user_id)
        .in('status', ['open', 'in_progress']);

      // Bias by the AI hint: check the hinted type first, then fall back to both.
      const hinted = result.target_type === 'task' ? tasks : events;
      const other = result.target_type === 'task' ? events : tasks;
      const combined = [
        ...(events || []).map((e) => ({ ...e, _kind: 'event' })),
        ...(tasks || []).map((t) => ({ ...t, _kind: 'task' })),
      ];

      const match =
        findBestMatch(hinted || [], query) ||
        findBestMatch(other || [], query) ||
        findBestMatch(combined, query);

      if (!match) {
        await sendWasenderMessage(
          senderPhone,
          `לא מצאתי אירוע או משימה שמתאימים ל"${query}" 🤔\nנסה לכתוב חלק מהשם המדויק.`
        );
        res.status(200).json({ success: true, intent, matched: false });
        return;
      }

      // Decide kind: prefer explicit _kind (from combined) else infer from source list.
      const isTask = match._kind === 'task' || (match.status !== undefined && match.start_at === undefined);

      if (isTask) {
        await supabase.from('whatsapp_pending').upsert({
          user_id: profile.user_id,
          action: { type: 'cancel_task', id: match.id, title: match.title },
          created_at: new Date().toISOString(),
        });
        await sendWasenderMessage(
          senderPhone,
          `בטוח שברצונך למחוק את המשימה?\n"${match.title}"\n\nהשב "כן" לאישור או "לא" לביטול.`
        );
        res.status(200).json({ success: true, intent, awaitingConfirm: true, kind: 'task' });
        return;
      }

      await supabase.from('whatsapp_pending').upsert({
        user_id: profile.user_id,
        action: {
          type: 'cancel_event',
          id: match.id,
          title: match.title,
          google_event_id: match.google_event_id || null,
          start_at: match.start_at,
        },
        created_at: new Date().toISOString(),
      });
      const { dateStr, timeStr } = formatForUser(match.start_at, timeZone);
      await sendWasenderMessage(
        senderPhone,
        `בטוח שברצונך לבטל את האירוע?\n"${match.title}" (${dateStr} ${timeStr})\n\nהשב "כן" לאישור או "לא" לביטול.`
      );
      res.status(200).json({ success: true, intent, awaitingConfirm: true, kind: 'event' });
      return;
    }

    // ---- UPDATE: move/rename an event ----
    if (intent === 'update') {
      const dayAgoU = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', profile.user_id)
        .gte('start_at', dayAgoU)
        .order('start_at', { ascending: true });
      const match = findBestMatch(events || [], result.query || text);
      if (!match) {
        await sendWasenderMessage(senderPhone, `לא מצאתי אירוע שמתאים ל"${result.query || text}" 🤔`);
        res.status(200).json({ success: true, intent, matched: false });
        return;
      }

      const patch = {};
      if (result.new_title) patch.title = result.new_title;
      if (result.new_start_datetime) {
        const newStart = zonedTimeToUtc(result.new_start_datetime, timeZone);
        const oldDuration = new Date(match.end_at).getTime() - new Date(match.start_at).getTime();
        const newEnd = new Date(newStart.getTime() + (oldDuration > 0 ? oldDuration : 30 * 60 * 1000));
        patch.start_at = newStart.toISOString();
        patch.end_at = newEnd.toISOString();
      }

      // Attendees to add to the existing event (e.g. "תוסיף את דנה לפגישה מחר").
      const att = await resolveAttendees(result.add_attendees);
      const addingAttendees = att.names.length > 0 || att.notFound.length > 0;

      if (Object.keys(patch).length === 0 && !addingAttendees) {
        await sendWasenderMessage(senderPhone, `לא הבנתי מה לעדכן באירוע "${match.title}". נסה למשל: "תעביר את ${match.title} למחר בשמונה בערב".`);
        res.status(200).json({ success: true, intent, matched: true, changed: false });
        return;
      }

      // Merge new attendee names into the event's stored list (dedupe).
      const existingNames = Array.isArray(match.attendees) ? match.attendees : [];
      if (att.names.length) {
        patch.attendees = Array.from(new Set([...existingNames, ...att.names]));
      }

      // Sending real invites? Confirm first (avoid pinging someone's calendar by mistake).
      if (att.invited.length > 0) {
        await supabase.from('whatsapp_pending').upsert({
          user_id: profile.user_id,
          action: {
            type: 'update_event',
            id: match.id,
            title: patch.title || match.title,
            google_event_id: match.google_event_id || null,
            patch,
            invited: att.invited,
            invitedNames: att.invited.map((a) => a.displayName),
            noEmail: att.noEmail,
            notFound: att.notFound,
          },
          created_at: new Date().toISOString(),
        });
        const who = att.invited.map((a) => a.displayName).join(', ');
        await sendWasenderMessage(
          senderPhone,
          `להוסיף את ${who} לאירוע "${match.title}" ולשלוח להם הזמנה ליומן?\n\nהשב "כן" לאישור או "לא" לביטול.`
        );
        res.status(200).json({ success: true, intent, awaitingConfirm: true, kind: 'invite' });
        return;
      }

      if (Object.keys(patch).length) {
        await supabase.from('calendar_events').update(patch).eq('id', match.id);
      }

      const rescheduled = !!patch.start_at;
      let msg = `עודכן! ✏️\n"${patch.title || match.title}"`;
      if (rescheduled) {
        const { dateStr, timeStr } = formatForUser(patch.start_at, timeZone);
        msg += `\nעכשיו ב-${dateStr} ${timeStr}`;
      }
      msg += attendeeNote(att);
      await sendWasenderMessage(senderPhone, msg);
      res.status(200).json({ success: true, intent, matched: true, changed: true });
      return;
    }

    // ---- UNKNOWN: not actionable — tell the user and alert the admin ----
    if (!['create_event', 'create_task', 'create_multi'].includes(intent)) {
      await sendWasenderMessage(
        senderPhone,
        `היי! לא הצלחתי לזהות את הבקשה שלך 🤔\nנסה לנסח מחדש - למשל משימה ("לשלם חשבונות") או אירוע עם זמן ("מחר בעשר פגישה עם דנה").`
      );

      const adminPhone = (process.env.ADMIN_WHATSAPP_PHONE || '').split(',')[0].trim();
      if (adminPhone && !phonesMatch(adminPhone, senderPhone)) {
        await sendWasenderMessage(
          adminPhone,
          `⚠️ הודעה מלקוח לא זוהתה\nלקוח: ${profile.full_name || ''} (${profile.phone || senderPhone})\nההודעה: "${text}"\nלא זוהתה כמשימה או אירוע.`
        ).catch(() => {});
      }

      res.status(200).json({ success: true, intent: 'unknown' });
      return;
    }

    const normalizeTitle = (s) =>
      String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

    // Create one task; returns a summary object.
    const createTaskItem = async (item) => {
      const title = item.title || text;
      await supabase.from('tasks').insert({
        user_id: profile.user_id,
        created_by: profile.email,
        title,
        description: '',
        status: 'open',
        priority: 'medium',
        external_source: 'whatsapp',
      });
      return { type: 'task', title };
    };

    // Create one event (with duplicate guard + Google push); returns a summary object.
    const createEventItem = async (item) => {
      if (!item.start_datetime) return createTaskItem(item);

      const startUtc = zonedTimeToUtc(item.start_datetime, timeZone);
      const duration = Number(item.duration_minutes) || 30;
      const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);
      const title = item.title || text;
      const { dateStr, timeStr } = formatForUser(startUtc.toISOString(), timeZone);

      // Duplicate guard: same title within a minute of the same start time.
      const winStart = new Date(startUtc.getTime() - 60 * 1000).toISOString();
      const winEnd = new Date(startUtc.getTime() + 60 * 1000).toISOString();
      const { data: near } = await supabase
        .from('calendar_events')
        .select('title, start_at')
        .eq('user_id', profile.user_id)
        .gte('start_at', winStart)
        .lte('start_at', winEnd);
      if ((near || []).some((e) => normalizeTitle(e.title) === normalizeTitle(title))) {
        return { type: 'event', duplicate: true, title, dateStr, timeStr };
      }

      const att = await resolveAttendees(item.attendees);

      const { data: inserted } = await supabase
        .from('calendar_events')
        .insert({
          user_id: profile.user_id,
          created_by: profile.email,
          title,
          description: '',
          start_at: startUtc.toISOString(),
          end_at: endUtc.toISOString(),
          location: '',
          attendees: att.names,
          source: 'local',
          all_day: false,
        })
        .select()
        .single();

      let htmlLink = null;
      try {
        const gEvent = await createGoogleEvent(supabase, connection, {
          title,
          start_at: startUtc.toISOString(),
          end_at: endUtc.toISOString(),
          timeZone,
          attendees: att.invited,
        });
        if (gEvent?.id && inserted) {
          htmlLink = gEvent.htmlLink;
          await supabase
            .from('calendar_events')
            .update({ google_event_id: gEvent.id, source: 'google' })
            .eq('id', inserted.id);
        }
      } catch (gErr) {
        console.error('GCal push failed:', gErr);
      }

      return {
        type: 'event',
        duplicate: false,
        title,
        dateStr,
        timeStr,
        htmlLink,
        invited: att.invited.map((a) => a.displayName),
        notFound: att.notFound,
        noEmail: att.noEmail,
      };
    };

    // ---- CREATE MULTI: several items in one message ----
    if (intent === 'create_multi' && Array.isArray(result.items) && result.items.length) {
      const results = [];
      for (const it of result.items) {
        const r =
          it.intent === 'create_event' || it.start_datetime
            ? await createEventItem(it)
            : await createTaskItem(it);
        results.push(r);
      }
      const lines = results.map((r) => {
        if (r.type === 'event') {
          return r.duplicate
            ? `⚠️ "${r.title}" כבר קיים (${r.dateStr} ${r.timeStr})`
            : `🕒 ${r.timeStr} — ${r.title}${attendeeNote(r)}`;
        }
        return `✅ ${r.title}`;
      });
      // For a multi-item message (e.g. a daily schedule) send one clean summary
      // without per-event calendar links, per product preference.
      const allEvents = results.every((r) => r.type === 'event');
      const header = allEvents
        ? 'היי! הכנסתי את האירועים הבאים ליומן:'
        : 'היי! הוספתי עבורך:';
      const msg = `${header}\n${lines.join('\n')}`;
      await sendWasenderMessage(senderPhone, msg);
      res.status(200).json({ success: true, intent, count: results.length });
      return;
    }

    // ---- CREATE EVENT ----
    if (intent === 'create_event' && result.start_datetime) {
      // Sending real invites? Confirm before creating + inviting.
      const attCreate = await resolveAttendees(result.attendees);
      if (attCreate.invited.length > 0) {
        const startUtc = zonedTimeToUtc(result.start_datetime, timeZone);
        const duration = Number(result.duration_minutes) || 30;
        const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);
        const title = result.title || text;
        const { dateStr, timeStr } = formatForUser(startUtc.toISOString(), timeZone);
        await supabase.from('whatsapp_pending').upsert({
          user_id: profile.user_id,
          action: {
            type: 'create_event',
            title,
            start_at: startUtc.toISOString(),
            end_at: endUtc.toISOString(),
            timeZone,
            attendees: attCreate.invited,
            names: attCreate.names,
            invitedNames: attCreate.invited.map((a) => a.displayName),
            noEmail: attCreate.noEmail,
            notFound: attCreate.notFound,
          },
          created_at: new Date().toISOString(),
        });
        const who = attCreate.invited.map((a) => a.displayName).join(', ');
        await sendWasenderMessage(
          senderPhone,
          `ליצור את האירוע "${title}" ב-${dateStr} בשעה ${timeStr} ולהזמין את ${who}?\n\nהשב "כן" לאישור או "לא" לביטול.`
        );
        res.status(200).json({ success: true, intent, awaitingConfirm: true, kind: 'invite' });
        return;
      }

      const r = await createEventItem(result);
      if (r.duplicate) {
        await sendWasenderMessage(
          senderPhone,
          `כבר קיים אירוע "${r.title}" ב-${r.dateStr} ${r.timeStr}, אז לא הוספתי שוב 🙂`
        );
      } else {
        let msg = `היי! יצרתי אירוע חדש 📅\n"${r.title}"\nבתאריך ${r.dateStr} בשעה ${r.timeStr}`;
        msg += attendeeNote(r);
        if (r.htmlLink) msg += `\n\n🔗 לצפייה ביומן:\n${r.htmlLink}`;
        await sendWasenderMessage(senderPhone, msg);
      }
      res.status(200).json({ success: true, intent: 'create_event' });
      return;
    }

    // ---- CREATE TASK (default) ----
    const created = await createTaskItem(result);
    await sendWasenderMessage(senderPhone, `היי! נוספה מטלה חדשה ✅\n"${created.title}"`);
    res.status(200).json({ success: true, intent: 'create_task' });
  } catch (err) {
    console.error('wasender webhook error:', err);
    // Always 200 so the provider doesn't spam retries.
    res.status(200).json({ success: false, error: err.message });
  }
}
