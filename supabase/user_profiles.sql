-- Run this in Supabase SQL editor AFTER the main schema.sql (or merge into it).

create table if not exists public.user_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique not null references auth.users(id) on delete cascade,
  email         text,
  full_name     text not null,
  phone         text not null,
  country       text not null,           -- IL | US
  state_code    text,                    -- US state code, null for Israel
  timezone      text not null,           -- IANA e.g. Asia/Jerusalem
  status        text not null default 'pending',  -- pending | approved | rejected
  created_date  timestamptz default now(),
  updated_date  timestamptz default now(),
  approved_at   timestamptz,
  approved_by   text
);

create or replace function public.set_user_profile_metadata()
returns trigger as $$
begin
  if tg_op = 'INSERT' and new.created_date is null then
    new.created_date := now();
  end if;
  new.updated_date := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_metadata on public.user_profiles;
drop trigger if exists set_user_profile_metadata on public.user_profiles;
create trigger set_user_profile_metadata
  before insert or update on public.user_profiles
  for each row execute function public.set_user_profile_metadata();

alter table public.user_profiles enable row level security;

drop policy if exists "profile_select_own" on public.user_profiles;
create policy "profile_select_own" on public.user_profiles
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profile_insert_own" on public.user_profiles;
create policy "profile_insert_own" on public.user_profiles
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
  );

create index if not exists user_profiles_status_idx on public.user_profiles (status);
create index if not exists user_profiles_user_idx on public.user_profiles (user_id);
