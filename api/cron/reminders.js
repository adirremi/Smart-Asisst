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
    const results = await runReminders(supabase);
    res.status(200).json({ success: true, ...results });
  } catch (err) {
    console.error('reminders cron error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
