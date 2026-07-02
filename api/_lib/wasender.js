const WASENDER_API_URL = 'https://www.wasenderapi.com/api/send-message';

// Normalize to E.164 digits only (e.g. 972501234567).
export function normalizePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '972' + digits.slice(1); // Israeli local → international
  }
  return digits;
}

export async function sendWasenderMessage(to, text) {
  const apiKey = process.env.WASENDER_API_KEY;
  const recipient = normalizePhone(to);

  if (!apiKey || !recipient) {
    console.warn('Wasender not configured — logging instead:', text);
    return { sent: false, reason: 'not_configured' };
  }

  const res = await fetch(WASENDER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: recipient, text }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('Wasender API error:', data);
    throw new Error(data.message || data.error || 'Wasender send failed');
  }

  return { sent: true, data };
}
