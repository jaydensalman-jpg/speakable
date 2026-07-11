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
