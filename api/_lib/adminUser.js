// Resolve the admin auth user by email, with a short in-memory cache.
// Avoids paginating Auth Admin users on every WhatsApp / cron hit.

const CACHE_TTL_MS = 10 * 60 * 1000;

let cache = {
  key: '',
  user: null,
  at: 0,
};

function adminEmailsFromEnv() {
  return (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function findAdminAuthUser(supabase) {
  const emails = adminEmailsFromEnv();
  if (emails.length === 0) return null;

  const key = emails.join(',');
  if (cache.user && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.user;
  }

  // Prefer explicit owner id when configured (1 request instead of listUsers pages).
  const ownerId = (process.env.WEBHOOK_OWNER_USER_ID || '').trim();
  if (ownerId) {
    const { data, error } = await supabase.auth.admin.getUserById(ownerId);
    const user = data?.user;
    if (!error && user && emails.includes((user.email || '').toLowerCase())) {
      cache = { key, user, at: Date.now() };
      return user;
    }
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const match = data.users.find((u) => emails.includes((u.email || '').toLowerCase()));
    if (match) {
      cache = { key, user: match, at: Date.now() };
      return match;
    }
    if (data.users.length < 200) break;
  }

  return null;
}
