-- Per-user contacts ("friends") that can be tagged as attendees on events.
-- Run this in the Supabase SQL editor after schema.sql / user_profiles.sql.

create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  email         text,                    -- required to actually send a Google invite
  phone         text,
  created_date  timestamptz default now(),
  updated_date  timestamptz default now()
);

create or replace function public.set_contact_metadata()
returns trigger as $$
begin
  if tg_op = 'INSERT' and new.created_date is null then
    new.created_date := now();
  end if;
  new.updated_date := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_contact_metadata on public.contacts;
create trigger set_contact_metadata
  before insert or update on public.contacts
  for each row execute function public.set_contact_metadata();

alter table public.contacts enable row level security;

drop policy if exists "contacts_select_own" on public.contacts;
create policy "contacts_select_own" on public.contacts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "contacts_insert_own" on public.contacts;
create policy "contacts_insert_own" on public.contacts
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "contacts_update_own" on public.contacts;
create policy "contacts_update_own" on public.contacts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "contacts_delete_own" on public.contacts;
create policy "contacts_delete_own" on public.contacts
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists contacts_user_idx on public.contacts (user_id);
