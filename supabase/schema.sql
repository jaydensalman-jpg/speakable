-- Speakable cloud reports — run in the Supabase SQL editor. Safe to re-run.
-- One row per practice session REPORT. Media blobs are never stored here;
-- they stay in IndexedDB on the device that recorded them.

create table if not exists public.sessions (
  id text primary key,                                   -- client-generated session id
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at bigint not null,                            -- ms epoch, matches local records
  media_type text not null default 'audio',
  results jsonb not null                                 -- scores, stats, transcript, eye contact
);

create index if not exists sessions_user_created on public.sessions (user_id, created_at desc);

-- Row-level security: each user can only touch their own rows.
alter table public.sessions enable row level security;

drop policy if exists "own rows: select" on public.sessions;
create policy "own rows: select" on public.sessions
  for select using (auth.uid() = user_id);

drop policy if exists "own rows: insert" on public.sessions;
create policy "own rows: insert" on public.sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows: update" on public.sessions;
create policy "own rows: update" on public.sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows: delete" on public.sessions;
create policy "own rows: delete" on public.sessions
  for delete using (auth.uid() = user_id);


-- ============================================================================
-- Anonymous, aggregate-only usage metrics (impact measurement).
-- Stores ONLY numbers: no transcript, no audio, no email, no personal content.
-- `anon_id` is a random token from the browser's localStorage, NOT the auth
-- user or email. The table is WRITE-ONLY from the browser (insert allowed,
-- select denied) — read aggregates as the project owner in the dashboard.
-- ============================================================================

create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  anon_id uuid not null,          -- random per-device token, not tied to identity
  ordinal int not null,           -- this device's session number (1st, 2nd, …)
  overall_score int,              -- 1–10
  filler_pct numeric,             -- % of words that were fillers
  wpm int,                        -- words per minute
  eye_pct int,                    -- % of talk on camera (null for audio takes)
  created_at timestamptz not null default now()
);

create index if not exists metrics_anon_ordinal on public.metrics (anon_id, ordinal);

alter table public.metrics enable row level security;

-- Anyone may INSERT their own anonymous numbers; NO select policy exists, so the
-- API cannot read the table back. (The owner reads it in the dashboard, which
-- bypasses RLS.) This is what makes it write-only and safe with the public key.
drop policy if exists "metrics: anon insert" on public.metrics;
create policy "metrics: anon insert" on public.metrics
  for insert with check (true);

-- ---- Impact queries (run these in the SQL editor as the owner) --------------
-- Total sessions recorded across all users:
--   select count(*) from public.metrics;
-- Unique devices (rough user count):
--   select count(distinct anon_id) from public.metrics;
-- Average filler rate on take 1 vs take 5 (the improvement number):
--   select ordinal, round(avg(filler_pct), 1) as avg_filler_pct, count(*)
--   from public.metrics where ordinal in (1, 5) group by ordinal order by ordinal;
-- Per-device improvement, first vs latest overall score:
--   select anon_id,
--          (array_agg(overall_score order by ordinal))[1] as first_score,
--          (array_agg(overall_score order by ordinal desc))[1] as latest_score
--   from public.metrics group by anon_id having count(*) >= 2;
