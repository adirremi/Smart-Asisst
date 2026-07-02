// Send WhatsApp message via Twilio.
async function sendWhatsApp(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

  if (!sid || !token || !from || !to) {
    console.warn('WhatsApp not configured — logging notification instead:', body);
    return { sent: false, reason: 'not_configured' };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Twilio WhatsApp error:', err);
    throw new Error('Failed to send WhatsApp notification');
  }
  return { sent: true };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const { full_name, phone, email, country, state_code, timezone } = body;

    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE; // e.g. whatsapp:+972501234567
    const message =
      `🆕 לקוח חדש ממתין לאישור!\n\n` +
      `שם: ${full_name}\n` +
      `טלפון: ${phone}\n` +
      `אימייל: ${email}\n` +
      `מדינה: ${country}${state_code ? ` / ${state_code}` : ''}\n` +
      `אזור זמן: ${timezone}\n\n` +
      `לאשר: ${process.env.APP_URL || process.env.VITE_APP_URL || ''}/Admin`;

    const result = await sendWhatsApp(adminPhone, message);
    res.status(200).json({ success: true, whatsapp: result });
  } catch (err) {
    console.error('notify/new-user error:', err);
    // Don't block onboarding if WhatsApp fails.
    res.status(200).json({ success: true, whatsapp: { sent: false, error: err.message } });
  }
}
