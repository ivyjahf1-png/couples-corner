-- ============================================================
-- Migration: Storage — profile photos bucket + RLS policies
-- Bucket `photos` stores profile images at `profiles/{uid}/{file}`.
-- Uploads go through the service-role server client (which bypasses RLS),
-- but these policies also allow authenticated users to upload/read/update/
-- delete their own folder directly should any flow use the anon client.
-- All statements are idempotent — safe to run multiple times.
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- Authenticated users may upload into their own folder only.
drop policy if exists "photos: owner can upload" on storage.objects;
create policy "photos: owner can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Anyone may read photos (bucket is public; matches GET /api/photos proxy).
drop policy if exists "photos: public read" on storage.objects;
create policy "photos: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'photos');

-- Owners may overwrite their own files.
drop policy if exists "photos: owner can update" on storage.objects;
create policy "photos: owner can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Owners may delete their own files.
drop policy if exists "photos: owner can delete" on storage.objects;
create policy "photos: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );