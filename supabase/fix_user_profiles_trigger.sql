-- Fix: user_profiles must NOT use set_row_metadata() (no created_by column).
-- Run this once in Supabase SQL Editor.

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
