import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'חסרים משתני סביבה: VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY. הוסף אותם ב-Vercel ועשה Redeploy.'
    : null;

// Avoid crashing the whole app at import time if env vars are missing at build time.
export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
