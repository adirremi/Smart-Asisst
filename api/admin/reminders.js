import { serviceClient, getUserFromRequest } from '../_lib/supabase.js';
import { getRemindersStatus, runReminders } from '../_lib/reminders.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL;

async function requireAdmin(req) {
  const user = await getUserFromRequest(req);
  if (!user || user.email !== ADMIN_EMAIL) return null;
  return user;
}

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const supabase = serviceClient();

    if (req.method === 'GET') {
      const status = await getRemindersStatus(supabase);
      res.status(200).json(status);
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      const { action, userId, kind } = body;

      if (action === 'run_cron') {
        const results = await runReminders(supabase);
        res.status(200).json({ success: true, ...results });
        return;
      }

      if (action === 'test_send') {
        if (!userId || !['tasks', 'events'].includes(kind)) {
          res.status(400).json({ error: 'userId and kind (tasks|events) required' });
          return;
        }
        const results = await runReminders(supabase, {
          force: true,
          userId,
          kind,
          skipDedup: true,
        });
        res.status(200).json({ success: true, ...results });
        return;
      }

      res.status(400).json({ error: 'Unknown action' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin reminders error:', err);
    res.status(500).json({ error: err.message });
  }
}
