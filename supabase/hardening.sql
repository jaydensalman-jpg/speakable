-- Speakable — abuse hardening. Run in the Supabase SQL editor AFTER schema.sql.
-- Safe to re-run. Additive only: no table is dropped, no row is modified, and
-- schema.sql stays the record of the base schema.
--
-- WHY THIS EXISTS
-- The app is client-only, so the publishable Supabase key ships in the JS bundle
-- (by design — RLS is the security boundary, not key secrecy). That means anyone
-- can read the key and call the REST API directly. RLS already stops them from
-- reading anyone's data. What it did NOT stop is unbounded WRITES:
--   1. `metrics` allowed unlimited anonymous inserts (`with check (true)`).
--   2. `sessions.results` had no size ceiling, so one account could push
--      arbitrarily large JSON.
-- Either could fill the 500 MB free-tier database and force a paid upgrade.


-- ============================================================================
-- 1. Per-device insert quota on `metrics`
-- ============================================================================
-- SECURITY DEFINER is required: RLS denies SELECT on `metrics`, so a plain
-- (invoker) function would always count 0 rows and the quota would never fire.
-- The function is safe to run as owner — it takes a uuid, returns a boolean,
-- and exposes no row contents. search_path is pinned so it can't be hijacked.

create or replace function public.metrics_under_quota(p_anon uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select count(*) < 30
  from public.metrics
  where anon_id = p_anon
    and created_at > now() - interval '1 hour';
$$;

revoke all on function public.metrics_under_quota(uuid) from public;
grant execute on function public.metrics_under_quota(uuid) to anon, authenticated;

-- Replace the unconditional insert policy with the quota-checked one.
-- 30 sessions/hour/device is far above real use (a session takes minutes) and
-- well below what could fill the database.
drop policy if exists "metrics: anon insert" on public.metrics;
drop policy if exists "metrics: rate-limited anon insert" on public.metrics;
create policy "metrics: rate-limited anon insert" on public.metrics
  for insert with check ( public.metrics_under_quota(anon_id) );


-- ============================================================================
-- 2. Value-range sanity constraints on `metrics`
-- ============================================================================
-- Stops garbage/overflow values from being stored at all. NOT VALID skips
-- checking pre-existing rows, so this cannot fail on live data; it applies to
-- every new insert from here on.

alter table public.metrics drop constraint if exists metrics_sane_values;
alter table public.metrics add constraint metrics_sane_values check (
      ordinal       between 1 and 100000
  and (overall_score is null or overall_score between 0 and 10)
  and (filler_pct    is null or filler_pct    between 0 and 100)
  and (wpm           is null or wpm           between 0 and 1000)
  and (eye_pct       is null or eye_pct       between 0 and 100)
) not valid;


-- ============================================================================
-- 3. Size ceiling on `sessions.results`
-- ============================================================================
-- A real session report (transcript + scores) is roughly 18 KB. 256 KB is
-- generous headroom for a long talk while blocking a storage-exhaustion push.
-- If a legitimate long session ever trips this, raise the number — don't drop
-- the constraint.

alter table public.sessions drop constraint if exists sessions_results_size;
alter table public.sessions add constraint sessions_results_size
  check ( pg_column_size(results) < 262144 ) not valid;


-- ============================================================================
-- VERIFY (run these after; every table should report rls_enabled = true)
-- ============================================================================
-- select tablename, rowsecurity as rls_enabled
--   from pg_tables where schemaname = 'public';
--
-- select tablename, policyname, cmd, qual, with_check
--   from pg_policies where schemaname = 'public' order by tablename, cmd;
--
-- Confirm the quota fires (31st insert in an hour should fail):
--   select public.metrics_under_quota('00000000-0000-0000-0000-000000000000');
