-- Run after supabase-schema.sql in Supabase Dashboard → SQL Editor.
-- Configure email and SMS providers in Supabase Auth before enabling these flows.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9._-]{3,30}$'),
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text not null check (phone ~ '^[+][1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
grant select on public.user_profiles to authenticated;
drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile" on public.user_profiles
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.create_nirogya_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  profile_name text := coalesce(new.raw_user_meta_data ->> 'full_name', 'Nirogya User');
  profile_phone text := coalesce(new.raw_user_meta_data ->> 'phone', '');
begin
  if normalized_username !~ '^[a-z0-9._-]{3,30}$' or profile_phone !~ '^[+][1-9][0-9]{7,14}$' then
    raise exception 'A valid username and international phone number are required';
  end if;
  insert into public.user_profiles (user_id, username, full_name, phone)
  values (new.id, normalized_username, profile_name, profile_phone);
  return new;
end;
$$;

drop trigger if exists nirogya_create_user_profile on auth.users;
create trigger nirogya_create_user_profile
  after insert on auth.users
  for each row execute function public.create_nirogya_user_profile();

create table if not exists public.doctor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  specialty text not null,
  clinic_name text not null default '',
  years_experience integer not null default 0 check (years_experience between 0 and 80),
  is_female boolean not null default false,
  accepting_patients boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.doctor_profiles enable row level security;
grant select on public.doctor_profiles to authenticated;
drop policy if exists "Signed-in users can see accepting doctors" on public.doctor_profiles;
create policy "Signed-in users can see accepting doctors" on public.doctor_profiles
  for select to authenticated using (accepting_patients = true);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles(user_id) on delete restrict,
  consultation_type text not null check (consultation_type in ('general', 'women_care')),
  mode text not null default 'video' check (mode in ('video')),
  reason text not null check (char_length(reason) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'cancelled', 'completed')),
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists appointments_patient_created_idx
  on public.appointments (patient_id, created_at desc);
create index if not exists appointments_doctor_created_idx
  on public.appointments (doctor_id, created_at desc);

alter table public.appointments enable row level security;
grant select, insert, update on public.appointments to authenticated;

drop policy if exists "Participants can read their appointments" on public.appointments;
create policy "Participants can read their appointments" on public.appointments
  for select to authenticated using ((select auth.uid()) in (patient_id, doctor_id));

drop policy if exists "Patients can request care from active doctors" on public.appointments;
create policy "Patients can request care from active doctors" on public.appointments
  for insert to authenticated
  with check (
    patient_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.doctor_profiles d
      where d.user_id = doctor_id and d.accepting_patients = true
        and (consultation_type <> 'women_care' or d.is_female = true)
    )
  );

drop policy if exists "Patients can cancel pending appointments" on public.appointments;
create policy "Patients can cancel pending appointments" on public.appointments
  for update to authenticated
  using (patient_id = (select auth.uid()) and status = 'pending')
  with check (patient_id = (select auth.uid()) and status in ('pending', 'cancelled'));

drop policy if exists "Doctors can update their appointments" on public.appointments;
create policy "Doctors can update their appointments" on public.appointments
  for update to authenticated
  using (doctor_id = (select auth.uid()) and status in ('pending', 'scheduled'))
  with check (doctor_id = (select auth.uid()) and status in ('scheduled', 'cancelled', 'completed'));

create or replace function public.prevent_appointment_identity_edits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.patient_id, new.doctor_id, new.consultation_type, new.mode, new.reason, new.created_at)
     is distinct from
     (old.patient_id, old.doctor_id, old.consultation_type, old.mode, old.reason, old.created_at) then
    raise exception 'Appointment participants and private notes cannot be changed after request';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_appointment_identity_edits on public.appointments;
create trigger prevent_appointment_identity_edits
  before update on public.appointments
  for each row execute function public.prevent_appointment_identity_edits();

-- Supabase Realtime must use private channels for call signaling.
-- Add a restrictive policy as well as a permissive policy so an existing broad
-- permissive policy cannot accidentally grant access to another appointment room.
drop policy if exists "Call participants can read private signaling" on realtime.messages;
create policy "Call participants can read private signaling" on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast' and private = true
    and exists (
      select 1 from public.appointments a
      where realtime.topic() = 'call:' || a.id::text
        and a.status = 'scheduled'
        and (a.patient_id = (select auth.uid()) or a.doctor_id = (select auth.uid()))
    )
  );
drop policy if exists "Call participants can send private signaling" on realtime.messages;
create policy "Call participants can send private signaling" on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast' and private = true
    and exists (
      select 1 from public.appointments a
      where realtime.topic() = 'call:' || a.id::text
        and a.status = 'scheduled'
        and (a.patient_id = (select auth.uid()) or a.doctor_id = (select auth.uid()))
    )
  );
drop policy if exists "Restrict call room reads to scheduled appointment members" on realtime.messages;
create policy "Restrict call room reads to scheduled appointment members" on realtime.messages
  as restrictive for select to authenticated
  using (
    extension = 'broadcast' and private = true
    and exists (
      select 1 from public.appointments a
      where realtime.topic() = 'call:' || a.id::text
        and a.status = 'scheduled'
        and (a.patient_id = (select auth.uid()) or a.doctor_id = (select auth.uid()))
    )
  );
drop policy if exists "Restrict call room writes to scheduled appointment members" on realtime.messages;
create policy "Restrict call room writes to scheduled appointment members" on realtime.messages
  as restrictive for insert to authenticated
  with check (
    extension = 'broadcast' and private = true
    and exists (
      select 1 from public.appointments a
      where realtime.topic() = 'call:' || a.id::text
        and a.status = 'scheduled'
        and (a.patient_id = (select auth.uid()) or a.doctor_id = (select auth.uid()))
    )
  );

-- Doctor profiles should be created/updated by a trusted admin, never by a public signup form.
-- Example after a doctor has an Auth user:
-- insert into public.doctor_profiles (user_id, display_name, specialty, clinic_name, years_experience, is_female, accepting_patients)
-- values ('DOCTOR_AUTH_USER_UUID', 'Dr. Asha Rao', 'Women’s health', 'Nirogya Care', 8, true, true);
