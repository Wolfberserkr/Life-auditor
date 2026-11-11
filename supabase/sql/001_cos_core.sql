-- ═══════════════════════════════════════════════════════════════════════════
-- 001_cos_core.sql — Life-auditor / Chief of Staff core schema.
--
-- Lives in the SAME Supabase project as Project Viking, so every table is
-- prefixed `cos_`. This file is deliberately NOT a Supabase migration: the
-- Viking repo owns that project's migration history and runs `supabase db
-- push` in CI, which fails if the remote history contains versions it does
-- not have locally. Apply this file by hand instead (SQL editor or psql). It
-- is idempotent, so re-running it is safe.
--
-- Security: RLS is ON with NO policies on every table, and anon/authenticated
-- get no grants, so only the service role (the edge functions and the Garmin
-- worker) can read or write. The public anon key that ships in Viking's web
-- bundle can't reach any of this.
-- ═══════════════════════════════════════════════════════════════════════════

-- Key/value settings (user name, timezone, roster names, location, …).
create table if not exists public.cos_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Secrets the system rotates itself (Garmin session tokens).
create table if not exists public.cos_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Ephemeral bot state (e.g. "awaiting a correction for import X").
create table if not exists public.cos_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Known shift types; new ones are learned on schedule import.
create table if not exists public.cos_shift_types (
  name       text primary key,             -- e.g. 'Blue'
  emoji      text not null default '⚪',
  color_id   text not null default '8',     -- Google Calendar event colorId
  start_time text not null check (start_time ~ '^\d{2}:\d{2}$'),
  end_time   text not null check (end_time ~ '^\d{2}:\d{2}$'),
  aliases    text[] not null default '{}', -- roster codes, e.g. {'B','BL'}
  created_at timestamptz not null default now()
);

insert into public.cos_shift_types (name, emoji, color_id, start_time, end_time, aliases) values
  ('Blue',  '🔵', '9',  '05:00', '14:00', '{B}'),
  ('Green', '🟢', '10', '13:00', '22:00', '{G}')
on conflict (name) do nothing;

-- Tasks, notes, ideas and reminders captured from chat, tagged by life area.
create table if not exists public.cos_items (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'task' check (kind in ('task','note','idea','reminder')),
  area         text not null default 'general'
               check (area in ('training','work','home_family','relationships','general')),
  title        text not null check (char_length(title) between 1 and 500),
  details      text,
  status       text not null default 'open' check (status in ('open','done','dropped')),
  due_at       timestamptz,
  remind_at    timestamptz,
  reminded_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists cos_items_open_idx on public.cos_items (status, area, due_at);
create index if not exists cos_items_remind_idx on public.cos_items (remind_at) where reminded_at is null;

-- Long-term facts the Chief of Staff should remember (preferences, people, …).
create table if not exists public.cos_memory (
  id         uuid primary key default gen_random_uuid(),
  fact       text not null check (char_length(fact) between 1 and 1000),
  area       text not null default 'general',
  pinned     boolean not null default false, -- pinned facts go into every chat
  created_at timestamptz not null default now()
);

-- Plain-text chat history (user text and final assistant replies only).
create table if not exists public.cos_messages (
  id         bigint generated always as identity primary key,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- Actions waiting for a tap in Telegram (schedule imports).
create table if not exists public.cos_pending (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,
  payload       jsonb not null,
  status        text not null default 'pending'
                check (status in ('pending','applied','cancelled','failed')),
  tg_message_id bigint,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One row per proactive message already sent (briefings, debriefs) so the
-- 5-minute scheduler never sends the same thing twice.
create table if not exists public.cos_sent_log (
  key     text primary key,
  sent_at timestamptz not null default now()
);

-- Quick-reply check-ins (energy after a shift, trained today, …).
create table if not exists public.cos_checkins (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  value      text not null,
  local_date date not null,
  created_at timestamptz not null default now()
);

-- Daily Garmin snapshot, written by workers/garmin/sync.py.
create table if not exists public.cos_health_daily (
  date               date primary key,
  sleep_seconds      integer,
  sleep_score        integer,
  hrv_last_night     integer,
  hrv_status         text,
  body_battery_high  integer,
  body_battery_low   integer,
  body_battery_now   integer,
  training_readiness integer,
  readiness_level    text,
  resting_hr         integer,
  steps              integer,
  stress_avg         integer,
  raw                jsonb not null default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);

-- Telegram update ids already handled (Telegram retries on slow responses).
create table if not exists public.cos_tg_updates (
  update_id   bigint primary key,
  received_at timestamptz not null default now()
);

-- Lock everything down to the service role.
do $$
declare t text;
begin
  foreach t in array array['cos_settings','cos_secrets','cos_state','cos_shift_types','cos_items',
    'cos_memory','cos_messages','cos_pending','cos_sent_log','cos_checkins','cos_health_daily','cos_tg_updates']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
