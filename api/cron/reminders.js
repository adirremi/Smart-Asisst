import { serviceClient } from '../_lib/supabase.js';
import { runReminders } from '../_lib/reminders.js';

export default async function handler(req, res) {
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
    // ?resend=1 — force-send tasks+events to everyone, ignoring the daily window/dedup.
    // Used to recover messages that failed before the queue token was configured.
    const resend =
      req.query?.resend === '1' ||
      req.query?.resend === 'true' ||
      (typeof req.body === 'object' && (req.body?.resend === true || req.body?.resend === '1'));

    const results = await runReminders(
      supabase,
      resend ? { force: true, skipDedup: true } : {}
    );
    res.status(200).json({ success: true, resend: !!resend, ...results });
  } catch (err) {
    console.error('reminders cron error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
