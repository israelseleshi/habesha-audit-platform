-- Habesha Audit Platform - Supabase bootstrap (Page 1-3 scope)
-- Run this in Supabase SQL Editor after creating a new project.

create extension if not exists "pgcrypto";

-- OUTLETS
create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  outlet_type text,
  zone text not null,
  sub_city text,
  woreda text,
  address_text text,
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null,
  owner_name text,
  owner_phone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('enumerator', 'supervisor', 'project_manager', 'client_executive')),
  phone text,
  supervisor_id uuid references public.profiles(id),
  assigned_zone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ENUMERATOR-OUTLET ASSIGNMENTS
create table if not exists public.enumerator_outlet_assignments (
  id uuid primary key default gen_random_uuid(),
  enumerator_id uuid not null references public.profiles(id) on delete cascade,
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  day_of_week text check (day_of_week in ('saturday', 'sunday', 'thursday')),
  effective_from date not null,
  effective_to date,
  unique (enumerator_id, outlet_id, day_of_week, effective_from)
);

-- AUDITS
create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id),
  enumerator_id uuid not null references public.profiles(id),
  supervisor_id uuid references public.profiles(id),
  visit_date date not null,
  visit_day text check (visit_day in ('saturday', 'sunday', 'thursday')),
  visit_timestamp timestamptz not null default now(),
  gps_lat numeric(9, 6),
  gps_lng numeric(9, 6),
  gps_accuracy_meters numeric(6, 2),
  compliance_score numeric(5, 2),
  supervisor_signed boolean default false,
  supervisor_signed_at timestamptz,
  escalation_flag boolean default false,
  outlet_owner_signed boolean default false,
  status text default 'draft' check (status in ('draft', 'submitted', 'signed_off', 'escalated')),
  remarks text,
  created_at timestamptz default now(),
  unique (outlet_id, enumerator_id, visit_date)
);

-- AUDIT RESPONSES
create table if not exists public.audit_responses (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  item_key text not null,
  response_value text,
  photo_url text,
  photo_lat numeric(9, 6),
  photo_lng numeric(9, 6),
  created_at timestamptz default now(),
  unique (audit_id, item_key)
);

-- ESCALATIONS
create table if not exists public.escalations (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id),
  outlet_id uuid not null references public.outlets(id),
  triggered_by text,
  trigger_reason text[],
  assigned_to uuid references public.profiles(id),
  status text default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  resolution_notes text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now(),
  deadline_at timestamptz generated always as (created_at + interval '24 hours') stored
);

create index if not exists audits_visit_date_idx on public.audits (visit_date);
create index if not exists audits_supervisor_signed_idx on public.audits (supervisor_signed, status);
create index if not exists escalations_status_idx on public.escalations (status, deadline_at);
create index if not exists audit_responses_audit_id_idx on public.audit_responses (audit_id);

-- RLS
alter table public.outlets enable row level security;
alter table public.profiles enable row level security;
alter table public.audits enable row level security;
alter table public.audit_responses enable row level security;
alter table public.escalations enable row level security;
alter table public.enumerator_outlet_assignments enable row level security;

create or replace function public.get_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- OUTLETS policies
drop policy if exists outlets_read_all on public.outlets;
create policy outlets_read_all on public.outlets
  for select
  using (auth.role() = 'authenticated');

drop policy if exists outlets_write_pm on public.outlets;
create policy outlets_write_pm on public.outlets
  for all
  using (public.get_user_role() = 'project_manager')
  with check (public.get_user_role() = 'project_manager');

-- PROFILES policies
drop policy if exists profiles_read_authenticated on public.profiles;
create policy profiles_read_authenticated on public.profiles
  for select
  using (auth.role() = 'authenticated');

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- AUDITS policies
drop policy if exists audits_access_policy on public.audits;
create policy audits_access_policy on public.audits
  for select
  using (
    enumerator_id = auth.uid()
    or public.get_user_role() in ('supervisor', 'project_manager', 'client_executive')
  );

drop policy if exists audits_insert_enumerator on public.audits;
create policy audits_insert_enumerator on public.audits
  for insert
  with check (enumerator_id = auth.uid());

drop policy if exists audits_update_supervisor_up on public.audits;
create policy audits_update_supervisor_up on public.audits
  for update
  using (
    enumerator_id = auth.uid()
    or public.get_user_role() in ('supervisor', 'project_manager')
  )
  with check (
    enumerator_id = auth.uid()
    or public.get_user_role() in ('supervisor', 'project_manager')
  );

-- AUDIT RESPONSES policies
drop policy if exists audit_responses_access_policy on public.audit_responses;
create policy audit_responses_access_policy on public.audit_responses
  for all
  using (
    audit_id in (
      select id from public.audits
      where enumerator_id = auth.uid()
      or public.get_user_role() in ('supervisor', 'project_manager', 'client_executive')
    )
  )
  with check (
    audit_id in (
      select id from public.audits
      where enumerator_id = auth.uid()
      or public.get_user_role() in ('supervisor', 'project_manager')
    )
  );

-- ESCALATIONS policies
drop policy if exists escalations_insert_authenticated on public.escalations;
create policy escalations_insert_authenticated on public.escalations
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists escalations_manage_policy on public.escalations;
create policy escalations_manage_policy on public.escalations
  for all
  using (public.get_user_role() in ('supervisor', 'project_manager', 'client_executive'))
  with check (public.get_user_role() in ('supervisor', 'project_manager'));

-- ASSIGNMENTS policies
drop policy if exists assignments_read_authenticated on public.enumerator_outlet_assignments;
create policy assignments_read_authenticated on public.enumerator_outlet_assignments
  for select
  using (auth.role() = 'authenticated');

drop policy if exists assignments_write_supervisor_up on public.enumerator_outlet_assignments;
create policy assignments_write_supervisor_up on public.enumerator_outlet_assignments
  for all
  using (public.get_user_role() in ('supervisor', 'project_manager'))
  with check (public.get_user_role() in ('supervisor', 'project_manager'));

-- Escalation trigger
create or replace function public.auto_escalate_audit()
returns trigger
language plpgsql
as $$
declare
  trigger_reasons text[] := '{}';
  promoter_present_value text;
begin
  select lower(response_value)
  into promoter_present_value
  from public.audit_responses
  where audit_id = new.id and item_key = 'promoter_present'
  limit 1;

  if promoter_present_value in ('no', 'false') then
    trigger_reasons := array_append(trigger_reasons, 'promoter_absent');
  end if;

  if coalesce(new.compliance_score, 0) < 40 then
    trigger_reasons := array_append(trigger_reasons, 'low_compliance_score');
  end if;

  if new.escalation_flag = true then
    trigger_reasons := array_append(trigger_reasons, 'manual_flag');
  end if;

  if array_length(trigger_reasons, 1) > 0 then
    insert into public.escalations (audit_id, outlet_id, triggered_by, trigger_reason)
    values (new.id, new.outlet_id, 'auto', trigger_reasons);

    update public.audits
    set status = 'escalated'
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_auto_escalate on public.audits;
create trigger trigger_auto_escalate
after insert on public.audits
for each row execute function public.auto_escalate_audit();

-- Realtime subscription support
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'audits'
  ) then
    alter publication supabase_realtime add table public.audits;
  end if;
end $$;
