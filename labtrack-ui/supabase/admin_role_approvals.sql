-- Additive LabTrack migration for Faculty/Laboratory Personnel role requests and Admin approvals.
-- Run once in Supabase SQL Editor. It does not create another table or alter existing approved roles.
begin;

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists requested_role text;
alter table public.profiles add column if not exists approval_status text not null default 'Not requested';

do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_requested_role_check' and conrelid='public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_requested_role_check
      check (requested_role is null or requested_role in ('Faculty','Laboratory Personnel'));
  end if;
  if not exists (select 1 from pg_constraint where conname='profiles_approval_status_check' and conrelid='public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_approval_status_check
      check (approval_status in ('Not requested','Pending','Approved','Rejected'));
  end if;
end $$;

create or replace function public.is_lab_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='Admin');
$$;

-- Remove self-update capability so applicants cannot mark their own requests approved.
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_admin_manage_role_requests on public.profiles;
create policy profiles_admin_manage_role_requests on public.profiles
  for update to authenticated using (public.is_lab_admin()) with check (public.is_lab_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id=auth.uid() and role='Student');

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare requested text;
begin
  requested := new.raw_user_meta_data->>'requested_role';
  if requested not in ('Faculty','Laboratory Personnel') then requested := null; end if;
  insert into public.profiles(id,display_name,email,role,requested_role,approval_status)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''),new.email,'Student',requested,
         case when requested is null then 'Not requested' else 'Pending' end)
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_labtrack on auth.users;
create trigger on_auth_user_created_labtrack after insert on auth.users
  for each row execute procedure public.create_profile_for_user();

-- Keep existing profiles intact; backfill email only and add missing Auth-user profiles as Students.
update public.profiles p set email=u.email from auth.users u where p.id=u.id and p.email is null;
insert into public.profiles(id,display_name,email,role,requested_role,approval_status)
select u.id,coalesce(u.raw_user_meta_data->>'display_name',''),u.email,'Student',
       case when u.raw_user_meta_data->>'requested_role' in ('Faculty','Laboratory Personnel') then u.raw_user_meta_data->>'requested_role' else null end,
       case when u.raw_user_meta_data->>'requested_role' in ('Faculty','Laboratory Personnel') then 'Pending' else 'Not requested' end
from auth.users u on conflict(id) do nothing;

commit;
