// Comma-separated list in VITE_ADMIN_EMAIL, e.g. "adirremi54@gmail.com"
export function getAdminEmails() {
  const raw = import.meta.env.VITE_ADMIN_EMAIL || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
