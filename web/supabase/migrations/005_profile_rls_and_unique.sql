-- ============================================================
-- Migration: Profiles — upsert support + own-row RLS policies
-- 1) Ensures `profiles.user_id` is UNIQUE so that the server's
--    `.upsert(..., { onConflict: "user_id" })` can resolve the
--    conflict (fixes "Could not save your profile").
-- 2) Allows authenticated users to select/insert/update their
--    OWN profile row (needed so upserts work under RLS too).
-- ============================================================

-- --- 1. Unique constraint on user_id (idempotent) ---
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_user_id_key'
  ) then
    alter table public.profiles
      add constraint profiles_user_id_key unique (user_id);
  end if;
end $$;

-- --- 2. Enable RLS (idempotent) ---
alter table public.profiles enable row level security;

-- --- 3. Policies: authenticated users manage their own row ---
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = user_id);