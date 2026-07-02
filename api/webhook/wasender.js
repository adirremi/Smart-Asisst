import { serviceClient, readJsonBody } from '../_lib/supabase.js';
import { sendWasenderMessage, phonesMatch } from '../_lib/wasender.js';
import { classifyMessage } from '../_lib/ai.js';
import { zonedTimeToUtc, nowInTimeZone, formatForUser } from '../_lib/datetime.js';
import { createGoogleEvent } from '../_lib/gcal.js';

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

    // Classify with the AI model.
    const result = await classifyMessage({
      message: text,
      timeZone,
      todayFull: today.full,
      weekdayHe: today.weekdayHe,
    });

    // Message that isn't a task or an event — tell the user and alert the admin.
    if (result.type === 'unknown' || (result.type !== 'event' && result.type !== 'task')) {
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

      res.status(200).json({ success: true, type: 'unknown' });
      return;
    }

    if (result.type === 'event' && result.start_datetime) {
      const startUtc = zonedTimeToUtc(result.start_datetime, timeZone);
      const duration = Number(result.duration_minutes) || 30;
      const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);

      const eventRow = {
        user_id: profile.user_id,
        created_by: profile.email,
        title: result.title || text,
        description: '',
        start_at: startUtc.toISOString(),
        end_at: endUtc.toISOString(),
        location: '',
        attendees: [],
        source: 'local',
        all_day: false,
      };

      const { data: inserted } = await supabase
        .from('calendar_events')
        .insert(eventRow)
        .select()
        .single();

      // Push to Google Calendar if connected.
      if (connection) {
        try {
          const googleId = await createGoogleEvent(supabase, connection, {
            title: eventRow.title,
            start_at: eventRow.start_at,
            end_at: eventRow.end_at,
            timeZone,
          });
          if (googleId && inserted) {
            await supabase
              .from('calendar_events')
              .update({ google_event_id: googleId, source: 'google' })
              .eq('id', inserted.id);
          }
        } catch (gErr) {
          console.error('GCal push failed:', gErr);
        }
      }

      const { dateStr, timeStr } = formatForUser(startUtc.toISOString(), timeZone);
      await sendWasenderMessage(
        senderPhone,
        `היי! יצרתי אירוע חדש 📅\n"${eventRow.title}"\nבתאריך ${dateStr} בשעה ${timeStr}`
      );

      res.status(200).json({ success: true, type: 'event' });
      return;
    }

    // Task
    const taskRow = {
      user_id: profile.user_id,
      created_by: profile.email,
      title: result.title || text,
      description: '',
      status: 'open',
      priority: 'medium',
      external_source: 'whatsapp',
    };
    await supabase.from('tasks').insert(taskRow);

    await sendWasenderMessage(
      senderPhone,
      `היי! נוספה מטלה חדשה ✅\n"${taskRow.title}"`
    );

    res.status(200).json({ success: true, type: 'task' });
  } catch (err) {
    console.error('wasender webhook error:', err);
    // Always 200 so the provider doesn't spam retries.
    res.status(200).json({ success: false, error: err.message });
  }
}
