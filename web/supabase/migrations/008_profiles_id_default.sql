-- ============================================================
-- Migration: Profiles — id column auto-generation
-- Fixes the error:
--   "null value in column \"id\" of relation \"profiles\"
--    violates not-null constraint"
--
-- The app inserts/upserts profile rows keyed by `user_id` (and now
-- also sends `id = auth.uid` on insert). If the live `profiles.id`
-- column is NOT NULL without a default, any first-time insert from
-- a code path that omits `id` (or any manual insert via the SQL
-- editor) fails. This gives `id` a sensible auto-generated default.
-- All statements are idempotent — safe to run repeatedly.
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'id'
  ) then
    -- Column exists: give it a default if it lacks one.
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'profiles'
        and column_name  = 'id'
        and column_default is null
    ) then
      alter table public.profiles
        alter column id set default gen_random_uuid();
      raise notice 'profiles.id default set to gen_random_uuid()';
    else
      raise notice 'profiles.id already has a default — nothing to do';
    end if;
  else
    -- Column missing entirely (fresh environments): add it with a default.
    alter table public.profiles
      add column id uuid default gen_random_uuid();
    raise notice 'profiles.id column added with gen_random_uuid() default';
  end if;
end $$;

-- Safety net: backfill any legacy rows that somehow have a NULL id so a
-- future NOT NULL / primary key change cannot fail. Random UUIDs cannot
-- collide. (No-op if there are no NULL ids.)
update public.profiles
set id = gen_random_uuid()
where id is null;

-- Force PostgREST to reload its schema cache.
notify pgrst, 'reload schema';
