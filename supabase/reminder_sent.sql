-- Tracks which daily reminders were already sent (per user, per local day).
-- Prevents duplicate WhatsApp messages when backup cron ticks fire.
-- Run in Supabase SQL editor after schema.sql.

create table if not exists public.reminder_sent (
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('tasks', 'events')),
  local_date  text not null,  -- YYYY-MM-DD in the user's timezone
  sent_at     timestamptz default now(),
  primary key (user_id, kind, local_date)
);

create index if not exists reminder_sent_date_idx on public.reminder_sent (local_date);

-- Server (cron) uses service role; no RLS needed for end users.
