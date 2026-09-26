-- ============================================================================
-- Permanent, immutable public profile codes.
--
-- The DEFAULT on `user_code` mints a code on insert, but application code
-- explicitly sends `user_code: null` when provisioning a profile. In Postgres
-- an explicit NULL OVERRIDES a column DEFAULT, so the generator never ran and
-- every account created through the app path was left with a NULL code — which
-- is why searching a real member's 6-character ID returned nothing.
--
-- This migration repairs those rows, then makes the code genuinely permanent:
--   1. backfill any NULL / malformed code,
--   2. enforce NOT NULL so a code can never be absent again,
--   3. add a trigger that REJECTS any UPDATE that would change the code.
--
-- The trigger is the actual guarantee. The unique constraint alone only stops
-- collisions; nothing stopped a value being rewritten, which would silently
-- break a member's shared invite / ID link.
-- ============================================================================

-- 1. Backfill missing or malformed codes (no-op when all rows are valid).
do $$
declare
  col text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_code'
  ) then
    return;
  end if;

  if exists (select 1 from pg_proc
             where proname = 'generate_user_code'
               and pronamespace = 'public'::regnamespace) then
    -- Guard the format against drift in the generator itself: a code that does
    -- not match the current pattern is treated as invalid and re-minted.
    update public.profiles
       set user_code = public.generate_user_code()
     where user_code is null
        or user_code !~ '^[0-9]{2}[A-Z]{4}$';

    -- NOT NULL once every row has a code. The check is conditional so this
    -- migration stays re-runnable on a database that still has gaps.
    if not exists (select 1 from public.profiles where user_code is null) then
      alter table public.profiles alter column user_code set not null;
    end if;
  end if;

  select column_name into col from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_code';
end $$;

-- 2. Immutability guard.
--
-- The trigger fires only when the code actually changes, so ordinary profile
-- updates (bio, photos, preferences) are unaffected. It compares with
-- IS DISTINCT FROM so a no-op update that rewrites the same value still passes.
create or replace function public.guard_user_code_immutable()
returns trigger language plpgsql as $$
begin
  if new.user_code is distinct from old.user_code then
    raise exception 'user_code is permanent and cannot be changed (user_id: %)', old.user_id
      using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists profiles_user_code_immutable on public.profiles;
create trigger profiles_user_code_immutable
  before update on public.profiles
  for each row
  execute function public.guard_user_code_immutable();

-- 3. Case-insensitive lookup support.
--
-- Codes are always stored uppercase, but a member pasting "17nrux" must still
-- match. PostgREST `eq` is case-sensitive, so a functional index lets the
-- search fall back to `lower(user_code) = lower($1)` cheaply if needed.
create index if not exists profiles_user_code_lower_idx
  on public.profiles (lower(user_code));
