-- ============================================================================
-- Client Portal schema
-- Run in the Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- users: app-level profile row, one per auth.users row
-- ----------------------------------------------------------------------------
create type user_role as enum ('client', 'coach');

create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        user_role not null default 'client',
  coach_id    uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists users_coach_id_idx on public.users(coach_id);

-- Auto-create a profile row when an auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- programs: a training program assigned by a coach to a client
-- ----------------------------------------------------------------------------
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.users(id) on delete cascade,
  coach_id    uuid not null references public.users(id) on delete restrict,
  title       text not null,
  description text,
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists programs_client_id_idx on public.programs(client_id);
create index if not exists programs_coach_id_idx  on public.programs(coach_id);

-- ----------------------------------------------------------------------------
-- sessions: a workout session within a program
-- ----------------------------------------------------------------------------
create table if not exists public.sessions (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid not null references public.programs(id) on delete cascade,
  title            text not null,
  scheduled_date   date,
  week_number      integer,
  position         integer not null default 0,
  notes            text,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists sessions_program_id_idx on public.sessions(program_id);

-- ----------------------------------------------------------------------------
-- exercises: an exercise prescription within a session
-- ----------------------------------------------------------------------------
create table if not exists public.exercises (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions(id) on delete cascade,
  name           text not null,
  sets           integer,
  reps           text,            -- "8-12", "AMRAP", etc.
  load           text,            -- "70kg", "RPE 8"
  rest_seconds   integer,
  tempo          text,
  video_url      text,
  notes          text,
  position       integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists exercises_session_id_idx on public.exercises(session_id);

-- ----------------------------------------------------------------------------
-- weekly_updates: weekly summary from coach to client (or vice versa)
-- ----------------------------------------------------------------------------
create table if not exists public.weekly_updates (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.users(id) on delete cascade,
  coach_id      uuid not null references public.users(id) on delete restrict,
  week_start    date not null,
  summary       text,
  adjustments   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (client_id, week_start)
);

create index if not exists weekly_updates_client_id_idx on public.weekly_updates(client_id);

-- ----------------------------------------------------------------------------
-- check_ins: client-submitted check-in (weight, photos, mood, notes, etc.)
-- ----------------------------------------------------------------------------
create table if not exists public.check_ins (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.users(id) on delete cascade,
  submitted_at      timestamptz not null default now(),
  week_number       integer,                                -- YYYYWW, e.g. 202617
  energy_rating     integer check (energy_rating between 1 and 5),
  adherence_rating  integer check (adherence_rating between 1 and 5),
  mood_rating       integer check (mood_rating between 1 and 5),
  notes             text,
  weight_kg         numeric(6,2),
  sleep_hours       numeric(4,2),
  nutrition_notes   text,
  training_notes    text,
  photo_urls        text[],
  coach_reply       text,
  replied_at        timestamptz
);

-- Idempotent upgrades for DBs created from the earlier schema revision
alter table public.check_ins add column if not exists week_number       integer;
alter table public.check_ins add column if not exists adherence_rating  integer;
alter table public.check_ins add column if not exists notes             text;

do $$
begin
  alter table public.check_ins drop constraint if exists check_ins_energy_rating_check;
  alter table public.check_ins drop constraint if exists check_ins_mood_rating_check;
  alter table public.check_ins drop constraint if exists check_ins_adherence_rating_check;
  alter table public.check_ins add  constraint check_ins_energy_rating_check    check (energy_rating    between 1 and 5);
  alter table public.check_ins add  constraint check_ins_mood_rating_check      check (mood_rating      between 1 and 5);
  alter table public.check_ins add  constraint check_ins_adherence_rating_check check (adherence_rating between 1 and 5);
end $$;

create index if not exists check_ins_client_id_idx on public.check_ins(client_id);
create unique index if not exists check_ins_client_week_unique on public.check_ins(client_id, week_number);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['users','programs','sessions','weekly_updates']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ============================================================================
-- Row Level Security
-- Clients see only their own rows. Coaches see rows for clients they own.
-- ============================================================================
alter table public.users          enable row level security;
alter table public.programs       enable row level security;
alter table public.sessions       enable row level security;
alter table public.exercises      enable row level security;
alter table public.weekly_updates enable row level security;
alter table public.check_ins      enable row level security;

-- Helper: is the current user a coach?
create or replace function public.is_coach()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'coach'
  );
$$;

-- users
drop policy if exists users_self_select     on public.users;
drop policy if exists users_coach_select    on public.users;
drop policy if exists users_self_update     on public.users;
create policy users_self_select  on public.users for select using (id = auth.uid());
create policy users_coach_select on public.users for select using (public.is_coach());
create policy users_self_update  on public.users for update using (id = auth.uid());

-- programs
drop policy if exists programs_client_select on public.programs;
drop policy if exists programs_coach_all     on public.programs;
create policy programs_client_select on public.programs for select using (client_id = auth.uid());
create policy programs_coach_all     on public.programs for all    using (public.is_coach()) with check (public.is_coach());

-- sessions
drop policy if exists sessions_client_select on public.sessions;
drop policy if exists sessions_coach_all     on public.sessions;
create policy sessions_client_select on public.sessions for select using (
  exists (select 1 from public.programs p where p.id = program_id and p.client_id = auth.uid())
);
create policy sessions_coach_all on public.sessions for all using (public.is_coach()) with check (public.is_coach());

-- exercises
drop policy if exists exercises_client_select on public.exercises;
drop policy if exists exercises_coach_all     on public.exercises;
create policy exercises_client_select on public.exercises for select using (
  exists (
    select 1 from public.sessions s
    join public.programs p on p.id = s.program_id
    where s.id = session_id and p.client_id = auth.uid()
  )
);
create policy exercises_coach_all on public.exercises for all using (public.is_coach()) with check (public.is_coach());

-- weekly_updates
drop policy if exists weekly_updates_client_select on public.weekly_updates;
drop policy if exists weekly_updates_coach_all     on public.weekly_updates;
create policy weekly_updates_client_select on public.weekly_updates for select using (client_id = auth.uid());
create policy weekly_updates_coach_all     on public.weekly_updates for all using (public.is_coach()) with check (public.is_coach());

-- check_ins — clients can insert/select their own; coaches can read/update all
drop policy if exists check_ins_client_select on public.check_ins;
drop policy if exists check_ins_client_insert on public.check_ins;
drop policy if exists check_ins_client_update on public.check_ins;
drop policy if exists check_ins_coach_all     on public.check_ins;
create policy check_ins_client_select on public.check_ins for select using (client_id = auth.uid());
create policy check_ins_client_insert on public.check_ins for insert with check (client_id = auth.uid());
create policy check_ins_client_update on public.check_ins for update using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy check_ins_coach_all     on public.check_ins for all    using (public.is_coach()) with check (public.is_coach());
