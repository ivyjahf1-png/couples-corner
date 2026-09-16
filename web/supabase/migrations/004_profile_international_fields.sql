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
-- search/feed queries that join on users can use them too. Guarded so this
-- migration still succeeds when public.users does not exist yet
-- (012_users_roles.sql creates/repairs it).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    alter table public.users
      add column if not exists country    text,
      add column if not exists occupation text;
  else
    raise notice '004: public.users does not exist yet — skipping country/occupation mirror (run 012_users_roles.sql).';
  end if;
end $$;