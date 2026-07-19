// Outgoing WhatsApp messages go through the shared message-queue Edge Function.
const DEFAULT_ENQUEUE_URL =
  'https://uresekvgdiqlssovnsgx.supabase.co/functions/v1/enqueue-message';

function enqueueUrl() {
  return (process.env.MESSAGE_QUEUE_URL || DEFAULT_ENQUEUE_URL).trim();
}

function enqueueToken() {
  return (
    process.env.MESSAGE_QUEUE_BEARER_TOKEN ||
    process.env.MESSAGE_QUEUE_TOKEN ||
    ''
  ).trim();
}

// Normalize to E.164 digits only (e.g. 972501234567).
export function normalizePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '972' + digits.slice(1); // Israeli local → international
  }
  return digits;
}

// Compare two phone numbers loosely (last 9 digits match).
export function phonesMatch(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.slice(-9) === nb.slice(-9);
}

export function isMessageQueueConfigured() {
  return !!(enqueueToken() && enqueueUrl());
}

// Enqueue an outgoing WhatsApp message (phone + message_text).
// Auth: MESSAGE_QUEUE_BEARER_TOKEN must be a JWT from the message_queue
// Supabase project (anon or service_role) because enqueue-message has verify_jwt=true.
export async function sendWasenderMessage(to, text) {
  const token = enqueueToken();
  const recipient = normalizePhone(to);
  const messageText = text == null ? '' : String(text);
  const url = enqueueUrl();

  if (!token) {
    console.warn(
      'Message queue missing MESSAGE_QUEUE_BEARER_TOKEN — not sending:',
      messageText.slice(0, 80)
    );
    return { sent: false, reason: 'missing_token' };
  }
  if (!recipient) {
    console.warn('Message queue missing phone — not sending:', messageText.slice(0, 80));
    return { sent: false, reason: 'missing_phone' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: recipient,
      message_text: messageText,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('Message queue enqueue error:', {
      url,
      status: res.status,
      data,
    });
    throw new Error(data.message || data.error || `Message queue enqueue failed (${res.status})`);
  }

  console.info('Message queue enqueued:', {
    phone: recipient,
    message_id: data.message_id || data?.data?.id || null,
    action: data.action || null,
  });
  return { sent: true, queued: true, data };
}
