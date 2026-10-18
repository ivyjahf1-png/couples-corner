-- Migration: profile_photos table
-- ============================================================
-- Migration: profile_photos table for unlimited photo gallery

-- Create the profile_photos table if it does not exist
create table if not exists public.profile_photos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  photo_url       text not null,
  storage_path    text,
  display_order   integer default 0 not null,
  is_primary      boolean default false not null,
  created_at      timestamptz default now() not null
);

-- Indexes for efficient querying
create index if not exists idx_profile_photos_user_id on public.profile_photos (user_id);
create index if not exists idx_profile_photos_display_order on public.profile_photos (user_id, display_order);
create unique index if not exists idx_profile_photos_unique_order on public.profile_photos (user_id, display_order) where display_order >= 0;

-- RLS policies
alter table public.profile_photos enable row level security;
drop policy if exists profile_photos_select on public.profile_photos;
create policy profile_photos_select on public.profile_photos for select to authenticated using (true);
drop policy if exists profile_photos_insert on public.profile_photos;
create policy profile_photos_insert on public.profile_photos for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists profile_photos_update on public.profile_photos;
create policy profile_photos_update on public.profile_photos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists profile_photos_delete on public.profile_photos;
create policy profile_photos_delete on public.profile_photos for delete to authenticated using (auth.uid() = user_id);

-- Helper function to get ordered photos for a user
create or replace function public.get_profile_photos_ordered(target_uid uuid)
returns setof public.profile_photos
language sql
stable
as $$
  select *
  from public.profile_photos
  where user_id = target_uid
  order by display_order asc, created_at asc;
$$;

-- Helper to count photos per user.
-- NOTE: an earlier migration (006_posts_and_media.sql) already defines
-- public.count_profile_photos(target_uid) against the legacy jsonb column on
-- profiles. This file intentionally does NOT redefine it: a second
-- CREATE OR REPLACE with different logic would silently change what existing
-- callers count. Callers needing the new table should query
-- public.profile_photos directly (or use get_profile_photos_ordered above).

-- Force PostgREST to reload schema cache
notify pgrst, 'reload schema';
