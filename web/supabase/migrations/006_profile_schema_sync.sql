-- ============================================================
-- Migration: Profiles — full schema sync
-- Ensures every column the app upserts actually exists in the
-- `profiles` table, fixing PostgREST "schema cache" errors
-- (PGRST204) like:
--   "Could not find the 'bio' / 'occupation' / 'genotype' /
--    'country' column of 'profiles' in the schema cache"
-- Run this in the Supabase SQL editor (or `supabase db push`)
-- if profile saves fail with a schema-cache message.
-- All statements are idempotent — safe to run multiple times.
-- ============================================================

alter table public.profiles
  add column if not exists user_id            uuid,
  add column if not exists display_name       text,
  add column if not exists bio                text,
  add column if not exists interests          text[] default '{}',
  add column if not exists location           text,
  add column if not exists country            text,
  add column if not exists gender             text,
  add column if not exists orientation        text,
  add column if not exists date_of_birth      date,
  add column if not exists relationship_status text,
  add column if not exists occupation         text,
  add column if not exists genotype           text,
  add column if not exists profile_type       text,
  add column if not exists looking_for        text,
  add column if not exists visibility         text default 'public',
  add column if not exists discoverable       boolean default true,
  add column if not exists preferences        jsonb default '{}',
  add column if not exists photos             jsonb default '[]',
  add column if not exists created_at         timestamptz default now(),
  add column if not exists updated_at         timestamptz default now();

-- Helpful indexes (idempotent).
create index if not exists profiles_country_idx
  on public.profiles (country);
create index if not exists profiles_occupation_idx
  on public.profiles (lower(occupation));

-- Force PostgREST to reload its schema cache so the new columns
-- are visible immediately without waiting for a restart.
notify pgrst, 'reload schema';
