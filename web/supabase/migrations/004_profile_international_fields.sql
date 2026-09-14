-- ============================================================
-- Migration: Profile international & background fields
-- Adds worldwide support by storing the user's country (all
-- countries, not just Africa), plus occupation and genotype.
-- ============================================================

alter table public.profiles
  add column if not exists occupation text,
  add column if not exists genotype   text,
  add column if not exists country    text;

-- GIN index so the country selector can be queried efficiently
-- if we later add "browse by country" filters.
create index if not exists profiles_country_idx on public.profiles (country);
create index if not exists profiles_occupation_idx on public.profiles (lower(occupation));

-- (Optional) mirror select international fields onto the users table so
-- search/feed queries that join on users can use them too.
alter table public.users
  add column if not exists country    text,
  add column if not exists occupation text;