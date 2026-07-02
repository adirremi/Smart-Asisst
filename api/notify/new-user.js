import { sendWasenderMessage } from '../_lib/wasender.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const { full_name, phone, email, country, state_code, timezone } = body;

    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || '';

    const message =
      `🆕 לקוח חדש ממתין לאישור!\n\n` +
      `שם: ${full_name}\n` +
      `טלפון: ${phone}\n` +
      `אימייל: ${email}\n` +
      `מדינה: ${country}${state_code ? ` / ${state_code}` : ''}\n` +
      `אזור זמן: ${timezone}\n\n` +
      `לאשר: ${appUrl}/Admin`;

    const result = await sendWasenderMessage(adminPhone, message);
    res.status(200).json({ success: true, whatsapp: result });
  } catch (err) {
    console.error('notify/new-user error:', err);
    // Don't block onboarding if WhatsApp fails.
    res.status(200).json({ success: true, whatsapp: { sent: false, error: err.message } });
  }
}
