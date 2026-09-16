-- ============================================================
-- Migration: public.users — base table + `role` column (fixes 42703)
--
-- Symptom this fixes (Supabase SQL Editor):
--   ERROR:  column "role" does not exist           (SQLSTATE 42703)
-- raised by any policy / query that reads public.users.role, e.g.
--   011_content_table.sql:
--     select 1 from public.users where id = auth.uid() and role = 'admin'
--
-- Why it happens
-- --------------
-- `public.users` is the app's source-of-truth account record (see
-- web/lib/server/session.ts and web/lib/auth/authorization.ts). The table was
-- created by hand in the Supabase dashboard and is missing the columns the app
-- reads/writes — `role` in particular. `role` is the ONLY sanctioned source of
-- admin privilege, so every admin policy / session check that references it
-- fails with 42703 until the column exists.
--
-- What this migration does
-- ------------------------
--   1. Creates public.users when a fresh environment does not have it yet.
--   2. Adds every column the app actually reads/writes (role included) with
--      idempotent `add column if not exists` statements.
--   3. Backfills NULLs, then applies defaults + NOT NULL (never fails on
--      legacy rows).
--   4. Adds CHECK constraints only when no existing row violates them.
--   5. Creates public.is_admin() — a SECURITY DEFINER helper for RLS policies.
--   6. Enables RLS on public.users: own-row read; all writes stay service-role.
--   7. Keeps updated_at fresh with the shared trigger.
--   8. Reloads PostgREST's schema cache.
--
-- Every statement is idempotent — safe to run repeatedly in the SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Base table (no-op when it already exists)
-- ------------------------------------------------------------
-- id == auth.users.id (the Supabase Auth uid). No FK to auth.users so the
-- script cannot fail on rows whose auth user was already deleted.
create table if not exists public.users (
  id                   uuid primary key,
  email                text,
  display_name         text,
  username             text,
  avatar_url           text,
  role                 text not null default 'user',
  status               text not null default 'active',
  is_demo              boolean not null default false,
  email_verified       boolean not null default false,
  onboarding_completed boolean not null default false,
  gender               text,
  date_of_birth        date,
  country              text,
  occupation           text,
  last_active_at       timestamptz default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. Add any missing columns to a pre-existing table
-- ------------------------------------------------------------
-- `role` is the column that fixes the reported error. Read/write sites:
--   role                 -> session.ts, authorization.ts, admin.ts, users.ts
--   status               -> session.ts, admin.ts, security.ts
--   is_demo              -> session.ts, demo-guard.ts
--   email_verified       -> users.ts, profiles.ts (dbToUser)
--   onboarding_completed -> onboarding page, profiles.ts
--   display_name/gender/date_of_birth -> profiles.ts completion write
--   country/occupation   -> 004_profile_international_fields.sql
--   last_active_at/created_at/updated_at -> users.ts, dashboards
alter table public.users
  add column if not exists email                text,
  add column if not exists display_name         text,
  add column if not exists username             text,
  add column if not exists avatar_url           text,
  add column if not exists role                 text default 'user',
  add column if not exists status               text default 'active',
  add column if not exists is_demo              boolean default false,
  add column if not exists email_verified       boolean default false,
  add column if not exists onboarding_completed boolean default false,
  add column if not exists gender               text,
  add column if not exists date_of_birth        date,
  add column if not exists country              text,
  add column if not exists occupation           text,
  add column if not exists last_active_at       timestamptz default now(),
  add column if not exists created_at           timestamptz default now(),
  add column if not exists updated_at           timestamptz default now();

-- ------------------------------------------------------------
-- 3. Backfill NULLs, then apply defaults + NOT NULL
-- ------------------------------------------------------------
-- Runs before NOT NULL so legacy rows created while the column was missing
-- (or added as nullable) are healed first — the script can never fail here.
update public.users set role                 = 'user'  where role is null;
update public.users set status               = 'active' where status is null;
update public.users set is_demo              = false    where is_demo is null;
update public.users set email_verified       = false    where email_verified is null;
update public.users set onboarding_completed = false    where onboarding_completed is null;
update public.users set created_at           = now()    where created_at is null;
update public.users set updated_at           = now()    where updated_at is null;

alter table public.users
  alter column role                 set default 'user',
  alter column role                 set not null,
  alter column status               set default 'active',
  alter column status               set not null,
  alter column is_demo              set default false,
  alter column is_demo              set not null,
  alter column email_verified       set default false,
  alter column email_verified       set not null,
  alter column onboarding_completed set default false,
  alter column onboarding_completed set not null;

-- ------------------------------------------------------------
-- 4. CHECK constraints (added only when the current data is clean)
-- ------------------------------------------------------------
-- Guarded so a legacy value can never abort the whole migration.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname  = 'users_role_check'
  ) then
    if exists (
      select 1 from public.users where role is not null and role not in ('user', 'admin')
    ) then
      raise notice 'users_role_check skipped — rows have a role outside (user, admin)';
    else
      alter table public.users
        add constraint users_role_check check (role in ('user', 'admin'));
    end if;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname  = 'users_status_check'
  ) then
    if exists (
      select 1 from public.users
      where status is not null and status not in ('active', 'suspended', 'deactivated')
    ) then
      raise notice 'users_status_check skipped — rows have a status outside the known set';
    else
      alter table public.users
        add constraint users_status_check
        check (status in ('active', 'suspended', 'deactivated'));
    end if;
  end if;
end $$;

-- ------------------------------------------------------------
-- 5. public.is_admin() — reusable admin predicate for RLS policies
-- ------------------------------------------------------------
-- SECURITY DEFINER so policies can read public.users without being subject to
-- that table's own RLS. Fully-qualified + pinned search_path (no injection).
create or replace function public.is_admin(target_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
    from public.users
    where id = target_uid
      and role = 'admin'
  );
$fn$;

comment on function public.is_admin(uuid) is
  'True when public.users.role = ''admin'' for the given uid (defaults to auth.uid()). SECURITY DEFINER helper for RLS policies.';

-- ------------------------------------------------------------
-- 6. RLS: users may read their own row; writes stay service-role only
-- ------------------------------------------------------------
-- Deliberately NO insert/update/delete policy: a client-writable row would
-- let a user grant themselves role = 'admin'. Account writes happen through
-- the service-role server client (web/lib/supabase/server.ts), which bypasses
-- RLS. Nothing in either app touches `users` from a browser client.
alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

-- ------------------------------------------------------------
-- 7. Keep updated_at fresh (shared helper, also defined in 011)
-- ------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.update_updated_at_column();

-- ------------------------------------------------------------
-- 8. Indexes for the admin / moderation queries
-- ------------------------------------------------------------
create index if not exists users_role_idx        on public.users (role);
create index if not exists users_status_idx      on public.users (status);
create index if not exists users_email_lower_idx on public.users (lower(email));
create index if not exists users_created_at_idx  on public.users (created_at desc);

-- ------------------------------------------------------------
-- 9. Promote the platform owner to admin
-- ------------------------------------------------------------
-- Idempotent: matches on email and is a no-op when no such row exists. Mirrors
-- ALLOWED_ADMIN_EMAILS in web/lib/auth/authorization.ts (the owner also gets
-- admin through that allowlist, but the DB role is the production source of
-- truth). Copy the line and change the address to promote anyone else.
update public.users
set role = 'admin', updated_at = now()
where lower(email) = lower('8gregwilliams@gmail.com');

-- ------------------------------------------------------------
-- 10. Reload PostgREST's schema cache so the new column is visible
-- ------------------------------------------------------------
notify pgrst, 'reload schema';
