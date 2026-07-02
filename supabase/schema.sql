-- ============================================================================
-- Tasks & Calendar Dashboard — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query) once.
-- It replaces the Base44 "entities" with real Postgres tables + Row Level
-- Security so every user only sees their own rows.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared trigger: keeps updated_date fresh and fills user_id / created_by
-- ---------------------------------------------------------------------------
create or replace function public.set_row_metadata()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    if new.user_id is null then
      new.user_id := auth.uid();
    end if;
    if new.created_by is null then
      new.created_by := (auth.jwt() ->> 'email');
    end if;
    if new.created_date is null then
      new.created_date := now();
    end if;
  end if;
  new.updated_date := now();
  return new;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid default auth.uid() references auth.users(id) on delete cascade,
  created_by      text,
  created_date    timestamptz default now(),
  updated_date    timestamptz default now(),
  title           text not null,
  description     text default '',
  status          text default 'open',        -- open | in_progress | done | canceled
  priority        text default 'medium',      -- low | medium | high | urgent
  due_at          timestamptz,
  tags            text[] default '{}',
  external_source text,
  external_id     text
);

-- ---------------------------------------------------------------------------
-- calendar_events
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid default auth.uid() references auth.users(id) on delete cascade,
  created_by      text,
  created_date    timestamptz default now(),
  updated_date    timestamptz default now(),
  title           text not null,
  description     text default '',
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  location        text default '',
  attendees       text[] default '{}',
  source          text default 'local',       -- local | google | webhook
  google_event_id text,
  all_day         boolean default false
);

-- ---------------------------------------------------------------------------
-- calendar_connections (stores Google OAuth tokens per user)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_connections (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid default auth.uid() references auth.users(id) on delete cascade,
  created_by           text,
  created_date         timestamptz default now(),
  updated_date         timestamptz default now(),
  provider             text default 'google',
  connected_email      text,
  default_calendar_id  text default 'primary',
  sync_enabled         boolean default true,
  two_way_sync         boolean default true,
  last_sync_at         timestamptz,
  google_refresh_token text,
  google_access_token  text,
  token_expiry         timestamptz
);

-- ---------------------------------------------------------------------------
-- webhook_keys
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid default auth.uid() references auth.users(id) on delete cascade,
  created_by    text,
  created_date  timestamptz default now(),
  updated_date  timestamptz default now(),
  name          text not null,
  api_key       text not null,
  is_active     boolean default true,
  permissions   text[] default '{}',
  last_used_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- task_webhook_logs
-- ---------------------------------------------------------------------------
create table if not exists public.task_webhook_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid default auth.uid() references auth.users(id) on delete cascade,
  created_by    text,
  created_date  timestamptz default now(),
  updated_date  timestamptz default now(),
  received_at   timestamptz,
  raw_data      text,
  title         text,
  status        text,              -- success | failed
  error_message text,
  task_id       uuid
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['tasks','calendar_events','calendar_connections','webhook_keys','task_webhook_logs']
  loop
    execute format('drop trigger if exists set_metadata on public.%I', t);
    execute format(
      'create trigger set_metadata before insert or update on public.%I
       for each row execute function public.set_row_metadata()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security: every user only sees / edits their own rows.
-- The service role key (used by the Vercel serverless functions) bypasses RLS.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['tasks','calendar_events','calendar_connections','webhook_keys','task_webhook_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format(
      'create policy "owner_all" on public.%I
         for all
         to authenticated
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Helpful indexes
create index if not exists tasks_user_created_idx on public.tasks (user_id, created_date desc);
create index if not exists events_user_start_idx on public.calendar_events (user_id, start_at desc);
create index if not exists events_google_id_idx on public.calendar_events (google_event_id);

-- ---------------------------------------------------------------------------
-- user_profiles (onboarding + admin approval) — see also supabase/user_profiles.sql
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique not null references auth.users(id) on delete cascade,
  email         text,
  full_name     text not null,
  phone         text not null,
  country       text not null,
  state_code    text,
  timezone      text not null,
  status        text not null default 'pending',
  created_date  timestamptz default now(),
  updated_date  timestamptz default now(),
  approved_at   timestamptz,
  approved_by   text
);

drop trigger if exists set_metadata on public.user_profiles;
create trigger set_metadata
  before insert or update on public.user_profiles
  for each row execute function public.set_row_metadata();

alter table public.user_profiles enable row level security;

drop policy if exists "profile_select_own" on public.user_profiles;
create policy "profile_select_own" on public.user_profiles
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profile_insert_own" on public.user_profiles;
create policy "profile_insert_own" on public.user_profiles
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create index if not exists user_profiles_status_idx on public.user_profiles (status);
create index if not exists user_profiles_user_idx on public.user_profiles (user_id);
