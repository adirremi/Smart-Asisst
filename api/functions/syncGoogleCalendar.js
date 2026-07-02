import { serviceClient, getUserFromRequest } from '../_lib/supabase.js';
import { runSync } from '../_lib/sync.js';

// Two-way sync between the user's Google Calendar and our calendar_events table.
export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const supabase = serviceClient();
    const result = await runSync(supabase, user.id);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ success: false, error: 'Sync failed', details: err.message });
  }
}
