-- LabTrack initial schema. Run in the Supabase SQL editor before using the app.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'Student' check (role in ('Student','Faculty','Laboratory Personnel','Admin')),
  student_id text,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(), name text not null, category text not null default 'Other',
  description text not null default '', total integer not null default 0 check(total >= 0),
  available integer not null default 0 check(available >= 0 and available <= total), condition text not null default 'Good',
  status text not null default 'Available', location text not null default '', symbol text,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.borrow_requests (
  id uuid primary key default gen_random_uuid(), requester_id uuid not null references public.profiles(id),
  purpose text not null, borrow_date date not null, due_date date not null, status text not null default 'Pending'
    check(status in ('Pending','Approved','Rejected','Cancelled','Released','Returned','Overdue')),
  rejection_reason text, reviewer_id uuid references public.profiles(id), reviewer_name text,
  released_at timestamptz, released_by uuid references public.profiles(id), returned_at date,
  returned_condition text, received_by uuid references public.profiles(id), return_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(due_date >= borrow_date)
);
create table if not exists public.request_items (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.borrow_requests(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id), quantity integer not null check(quantity > 0),
  created_at timestamptz not null default now()
);
create table if not exists public.condition_logs (
  id uuid primary key default gen_random_uuid(), equipment_id uuid not null references public.equipment(id),
  request_id uuid references public.borrow_requests(id), condition text not null, status text,
  note text not null default '', updated_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(), equipment_id uuid references public.equipment(id),
  request_id uuid references public.borrow_requests(id), type text not null check(type in ('Damaged','Missing')),
  note text not null, reported_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text not null, type text not null default 'info', read_at timestamptz,
  created_at timestamptz not null default now()
);
-- Add missing client fields to an existing partial LabTrack schema without dropping data.
alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists role text not null default 'Student';
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists student_id text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.equipment add column if not exists name text not null default 'Unnamed equipment';
alter table public.equipment add column if not exists category text not null default 'Other';
alter table public.equipment add column if not exists description text not null default '';
alter table public.equipment add column if not exists total integer not null default 0;
alter table public.equipment add column if not exists available integer not null default 0;
alter table public.equipment add column if not exists condition text not null default 'Good';
alter table public.equipment add column if not exists status text not null default 'Available';
alter table public.equipment add column if not exists location text not null default '';
alter table public.equipment add column if not exists symbol text;
alter table public.equipment add column if not exists archived_at timestamptz;
alter table public.equipment add column if not exists created_at timestamptz not null default now();
alter table public.equipment add column if not exists updated_at timestamptz not null default now();
alter table public.borrow_requests add column if not exists requester_id uuid references public.profiles(id);
alter table public.borrow_requests add column if not exists purpose text not null default '';
alter table public.borrow_requests add column if not exists notes text not null default '';
alter table public.borrow_requests add column if not exists borrow_date date not null default current_date;
alter table public.borrow_requests add column if not exists due_date date not null default current_date;
alter table public.borrow_requests add column if not exists status text not null default 'Pending';
alter table public.borrow_requests add column if not exists rejection_reason text;
alter table public.borrow_requests add column if not exists reviewer_id uuid references public.profiles(id);
alter table public.borrow_requests add column if not exists reviewer_name text;
alter table public.borrow_requests add column if not exists released_at timestamptz;
alter table public.borrow_requests add column if not exists released_by uuid references public.profiles(id);
alter table public.borrow_requests add column if not exists returned_at date;
alter table public.borrow_requests add column if not exists returned_condition text;
alter table public.borrow_requests add column if not exists received_by uuid references public.profiles(id);
alter table public.borrow_requests add column if not exists return_note text;
alter table public.borrow_requests add column if not exists created_at timestamptz not null default now();
alter table public.borrow_requests add column if not exists updated_at timestamptz not null default now();
-- Preserve values from common earlier field names when those fields exist.
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='equipment' and column_name='quantity') then
    execute 'update public.equipment set total=quantity where total=0 and quantity is not null';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='equipment' and column_name='available_quantity') then
    execute 'update public.equipment set available=available_quantity where available=0 and available_quantity is not null';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name') then
    execute $q$update public.profiles set display_name=full_name where display_name='' and full_name is not null$q$;
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='name') then
    execute $q$update public.profiles set display_name=name where display_name='' and name is not null$q$;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='borrow_requests' and column_name='user_id') then
    execute 'update public.borrow_requests set requester_id=user_id where requester_id is null';
  end if;
end $$;

create index if not exists borrow_requests_requester_idx on public.borrow_requests(requester_id,created_at desc);
create index if not exists request_items_request_idx on public.request_items(request_id);
create index if not exists equipment_active_name_idx on public.equipment(name) where archived_at is null;

create or replace function public.is_lab_staff() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('Laboratory Personnel','Admin'));
$$;
create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''),'Student') on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_labtrack on auth.users;
create trigger on_auth_user_created_labtrack after insert on auth.users for each row execute procedure public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.request_items enable row level security;
alter table public.condition_logs enable row level security;
alter table public.incident_reports enable row level security;
alter table public.notifications enable row level security;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_lab_staff());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check(id=auth.uid() and role in ('Student','Faculty'));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid() and role in ('Student','Faculty'));
drop policy if exists equipment_read on public.equipment;
create policy equipment_read on public.equipment for select to authenticated using(archived_at is null or public.is_lab_staff());
drop policy if exists equipment_staff_write on public.equipment;
create policy equipment_staff_write on public.equipment for all to authenticated using(public.is_lab_staff()) with check(public.is_lab_staff());
drop policy if exists requests_read on public.borrow_requests;
create policy requests_read on public.borrow_requests for select to authenticated using(requester_id=auth.uid() or public.is_lab_staff());
drop policy if exists requests_create on public.borrow_requests;
create policy requests_create on public.borrow_requests for insert to authenticated with check(requester_id=auth.uid() and status='Pending');
drop policy if exists requests_cancel on public.borrow_requests;
create policy requests_cancel on public.borrow_requests for update to authenticated using((requester_id=auth.uid() and status='Pending') or public.is_lab_staff()) with check((requester_id=auth.uid() and status in ('Pending','Cancelled')) or public.is_lab_staff());
drop policy if exists request_items_read on public.request_items;
create policy request_items_read on public.request_items for select to authenticated using(exists(select 1 from public.borrow_requests r where r.id=request_id and (r.requester_id=auth.uid() or public.is_lab_staff())));
drop policy if exists request_items_create on public.request_items;
create policy request_items_create on public.request_items for insert to authenticated with check(exists(select 1 from public.borrow_requests r where r.id=request_id and r.requester_id=auth.uid() and r.status='Pending'));
drop policy if exists condition_logs_read on public.condition_logs;
create policy condition_logs_read on public.condition_logs for select to authenticated using(public.is_lab_staff());
drop policy if exists condition_logs_staff_write on public.condition_logs;
create policy condition_logs_staff_write on public.condition_logs for all to authenticated using(public.is_lab_staff()) with check(public.is_lab_staff());
drop policy if exists incidents_read on public.incident_reports;
create policy incidents_read on public.incident_reports for select to authenticated using(public.is_lab_staff() or reported_by=auth.uid());
drop policy if exists incidents_create on public.incident_reports;
create policy incidents_create on public.incident_reports for insert to authenticated with check(reported_by=auth.uid());
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Promote staff by updating profiles.role from the Supabase SQL editor; never trust client signup metadata for roles.

-- Transactional workflows. These functions run as the caller and enforce identity/role explicitly.
create or replace function public.submit_borrow_request(request_payload jsonb, items_payload jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare new_id uuid; item record; requester uuid := auth.uid();
begin
  if requester is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(items_payload) <> 'array' or jsonb_array_length(items_payload)=0 then raise exception 'At least one equipment item is required'; end if;
  insert into public.borrow_requests(requester_id,purpose,notes,borrow_date,due_date,status)
  values(requester,request_payload->>'purpose',coalesce(request_payload->>'notes',''),(request_payload->>'borrow_date')::date,(request_payload->>'due_date')::date,'Pending') returning id into new_id;
  for item in select * from jsonb_to_recordset(items_payload) as x(equipment_id uuid, quantity integer) loop
    if item.quantity is null or item.quantity < 1 then raise exception 'Quantity must be positive'; end if;
    if not exists(select 1 from public.equipment e where e.id=item.equipment_id and e.archived_at is null and e.available>=item.quantity and e.status not in ('Damaged','Missing','Under Maintenance')) then raise exception 'Requested equipment is unavailable'; end if;
    insert into public.request_items(request_id,equipment_id,quantity) values(new_id,item.equipment_id,item.quantity);
  end loop;
  return new_id;
end; $$;
create or replace function public.release_borrow_request(request_uuid uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare item record;
begin
  if not public.is_lab_staff() then raise exception 'Laboratory staff access required'; end if;
  if not exists(select 1 from public.borrow_requests where id=request_uuid and status='Approved') then raise exception 'Request is not approved for release'; end if;
  for item in select equipment_id,quantity from public.request_items where request_id=request_uuid loop
    update public.equipment set available=available-item.quantity,updated_at=now()
      where id=item.equipment_id and available>=item.quantity and status not in ('Damaged','Missing','Under Maintenance');
    if not found then raise exception 'Inventory changed or equipment is unavailable'; end if;
  end loop;
  update public.borrow_requests set status='Released',released_at=now(),released_by=auth.uid(),updated_at=now() where id=request_uuid;
end; $$;
create or replace function public.return_borrow_request(request_uuid uuid, return_date date, return_condition text, checkin_note text default '')
returns void language plpgsql security invoker set search_path=public as $$
declare item record;
begin
  if not public.is_lab_staff() then raise exception 'Laboratory staff access required'; end if;
  if not exists(select 1 from public.borrow_requests where id=request_uuid and status in ('Released','Overdue')) then raise exception 'Request is not currently released'; end if;
  for item in select equipment_id,quantity from public.request_items where request_id=request_uuid loop
    if return_condition in ('Good','Fair') then
      update public.equipment set available=least(total,available+item.quantity),status=case when status in ('Borrowed','Reserved') then 'Available' else status end,condition=return_condition,updated_at=now() where id=item.equipment_id;
    else
      update public.equipment set status=case when return_condition='Damaged' then 'Damaged' else 'Under Maintenance' end,condition=return_condition,updated_at=now() where id=item.equipment_id;
    end if;
    insert into public.condition_logs(equipment_id,request_id,condition,status,note,updated_by)
    values(item.equipment_id,request_uuid,return_condition,case when return_condition='Damaged' then 'Damaged' else 'Available' end,coalesce(checkin_note,''),auth.uid());
  end loop;
  update public.borrow_requests set status='Returned',returned_at=return_date,returned_condition=return_condition,received_by=auth.uid(),return_note=coalesce(checkin_note,''),updated_at=now() where id=request_uuid;
end; $$;
grant execute on function public.submit_borrow_request(jsonb,jsonb) to authenticated;
grant execute on function public.release_borrow_request(uuid) to authenticated;
grant execute on function public.return_borrow_request(uuid,date,text,text) to authenticated;

-- Faculty/Laboratory Personnel approval extension (also available as a separate upgrade script).
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
