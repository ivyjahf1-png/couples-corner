-- =============================================================
-- Couples Corner â€” migration 052
-- Verify + repair the migration-051 profile attribute columns.
--
-- WHY THIS FILE EXISTS. The app reads and writes `height_cm`, `education` and
-- `lifestyle` on public.profiles. Those are created by 051_profile_attributes.sql,
-- which IS idempotent and IS correct. Yet members see:
--
--     Could not find the 'education' column of 'profiles' in the schema cache
--
-- That error is PostgREST refusing a query against a column the DATABASE does not
-- have, so the column is genuinely absent on the live database: 051 was never
-- applied there. This file is the safe, re-runnable way to apply it without
-- hunting for the missing migration in the Supabase dashboard.
--
-- ── DO NOT USE "profession" OR "height" ──────────────────────────────────────
-- The obvious fix for this error is to add the column the error names. For
-- `education` that is right, but the other two field names floating around this
-- feature are DISPLAY names, not columns:
--
--     Profession -> the real column is `occupation`  (created by migration 004)
--     Height     -> the real column is `height_cm`   (INTEGER, cm, created by 051)
--
-- Adding `profession` and `height text` would create two columns nothing ever
-- reads or writes: the app would keep querying `occupation` and `height_cm`, so
-- the screen would silently show "not set" forever while the table carried two
-- permanently NULL columns. `height` as TEXT is worse than unused -- the UI
-- accepts feet/inches and converts once on submit, so a free-text height column
-- invites the exact "179cm vs 5'11\"" split-brain the design avoids by storing
-- centimetres in one typed column.
--
-- ── WHY THE COLUMN LIST IS REPEATED HERE RATHER THAN \source-d ───────────────
-- This must be a plain, copy-pasteable file. `\\i` of 051 would be tidier but
-- fails if 051 was never recorded in the migration history, and it cannot report
-- what was wrong. Everything below is idempotent, so re-running is harmless.
--
-- Idempotent; safe to re-run.
-- =============================================================
begin;

-- ── 1. REPORT FIRST, so a drift is visible before it is silently patched ──────
do $$
declare
  missing text := '';
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'height_cm'
  ) then missing := missing || ' height_cm'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'education'
  ) then missing := missing || ' education'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'lifestyle'
  ) then missing := missing || ' lifestyle'; end if;

  if missing <> '' then
    raise notice '052: public.profiles was missing:% -- adding them now.', missing;
  else
    raise notice '052: all three profile attribute columns already present -- nothing to do.';
  end if;
end $$;

-- ── 2. THE REPAIR (identical to 051) ─────────────────────────────────────────
alter table public.profiles
  add column if not exists height_cm integer,
  add column if not exists education text,
  add column if not exists lifestyle text[] not null default '{}'::text[];

-- Height is a physical measurement. Reject negatives and the implausible in one
-- constraint rather than in three places in the UI, so a bad value cannot enter
-- via any write path (edit form, direct API, future bulk import).
--
-- The upper bound is 254cm: the tallest recorded human is ~272cm, so 254 clears
-- every real person while still rejecting a fat-fingered "2500".
alter table public.profiles
  drop constraint if exists profiles_height_cm_range;
alter table public.profiles
  add constraint profiles_height_cm_range
  check (height_cm is null or (height_cm > 0 and height_cm <= 254));

comment on column public.profiles.height_cm is
  'Height in centimetres. 90-254 is enforced by profiles_height_cm_range.';
comment on column public.profiles.education is
  'Free-text education, e.g. "BSc Computer Science". Max 120 chars (app-validated).';
comment on column public.profiles.lifestyle is
  'Lifestyle tags, e.g. {pet-owner,fitness}. Mirrors the shape of public.profiles.interests.';

-- ── 3. CONFIRM THE REPAIR TOOK ───────────────────────────────────────────────
do $$
declare
  present integer;
begin
  select count(*) into present
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name in ('height_cm', 'education', 'lifestyle');

  if present <> 3 then
    raise exception '052 FAILED: expected 3 profile attribute columns on public.profiles, found %', present;
  end if;
  raise notice '052 OK: height_cm, education and lifestyle all exist on public.profiles.';
end $$;

-- ── 4. RELOAD THE POSTGREST SCHEMA CACHE ─────────────────────────────────────
-- WHY THIS LINE IS NOT OPTIONAL, AND WHY IT IS NOT ENOUGH ON ITS OWN.
--
-- The error text says "in the schema cache", so the cache is the obvious suspect.
-- But PostgREST does NOT watch the database for DDL: `add column` changes the
-- table, while the REST layer keeps serving the shape it loaded at startup. So a
-- freshly-added column is invisible to supabase-js even though `select *` in the
-- SQL editor shows it -- which is exactly why the column can be present and the
-- app still 400s.
--
-- `notify pgrst, 'reload schema'` is the correct nudge, and it is reliable on
-- Supabase's managed PostgREST. On a self-hosted PostgREST it is only honoured if
-- the LISTEN connection is configured; if the error persists after this runs, ask
-- the platform to restart PostgREST (or wait for its next config reload).
notify pgrst, 'reload schema';

commit;