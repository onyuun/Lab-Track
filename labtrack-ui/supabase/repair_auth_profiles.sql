-- Run this idempotent repair in Supabase SQL Editor if new Auth users are missing from public.profiles.
-- It repairs future signups and backfills existing Auth users without changing existing profile rows.
create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''), 'Student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_labtrack on auth.users;
create trigger on_auth_user_created_labtrack
after insert on auth.users
for each row execute procedure public.create_profile_for_user();

alter table public.profiles enable row level security;
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert to authenticated
with check (id = auth.uid() and role = 'Student');

insert into public.profiles (id, display_name, role)
select u.id, coalesce(u.raw_user_meta_data->>'display_name', ''), 'Student'
from auth.users u
on conflict (id) do nothing;
