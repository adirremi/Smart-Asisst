-- ============================================================================
-- whatsapp_pending — stores a single "awaiting confirmation" action per user
-- for the WhatsApp assistant (e.g. a delete that needs a yes/no reply).
-- Run this once in the Supabase SQL editor.
-- Only the service role (Vercel functions) touches this table.
-- ============================================================================

create table if not exists public.whatsapp_pending (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  action      jsonb not null,
  created_at  timestamptz default now()
);

alter table public.whatsapp_pending enable row level security;
-- No policies: the service-role key used by the serverless functions bypasses RLS,
-- and no browser client should ever read/write this table directly.
