import { serviceClient } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/supabase.js';
import { sendWasenderMessage } from '../_lib/wasender.js';

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
    const { action, userId, status } =
      typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');

    // GET — list users (default: pending)
    if (req.method === 'GET') {
      const filter = req.query.status || 'pending';
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('status', filter)
        .order('created_date', { ascending: false });
      if (error) throw error;
      res.status(200).json({ users: data || [] });
      return;
    }

    // POST — approve or reject
    if (req.method === 'POST') {
      if (!userId || !['approved', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'userId and status (approved|rejected) required' });
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          status,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
          approved_by: admin.email,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Send welcome WhatsApp to the client when approved.
      if (status === 'approved' && data?.phone) {
        const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || '';
        const welcomeMessage =
          `שלום ${data.full_name}! 🎉\n\n` +
          `החשבון שלך אושר בהצלחה.\n` +
          `אפשר להיכנס לאפליקציה ולהתחיל לנהל משימות ויומן.\n\n` +
          `👉 ${appUrl}`;

        try {
          await sendWasenderMessage(data.phone, welcomeMessage);
        } catch (whatsappErr) {
          console.error('Welcome WhatsApp failed:', whatsappErr);
          // Approval still succeeds even if WhatsApp fails.
        }
      }

      res.status(200).json({ success: true, profile: data });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin/users error:', err);
    res.status(500).json({ error: err.message });
  }
}
