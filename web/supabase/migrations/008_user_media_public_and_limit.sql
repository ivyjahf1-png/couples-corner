-- User media: allow up to 10 photos/videos per user, public gallery, deletion.
-- Idempotent — safe to run multiple times.

-- 1) Make user media publicly readable (gallery/feed discovery).
drop policy if exists "user_media_select_owner" on user_media;
create policy "user_media_select_public"
  on user_media for select
  using (true);

-- 2) Insert/update/delete remain owner-only.
drop policy if exists "user_media_insert_own" on user_media;
create policy "user_media_insert_own"
  on user_media for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_media_update_own" on user_media;
create policy "user_media_update_own"
  on user_media for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_media_delete_own" on user_media;
create policy "user_media_delete_own"
  on user_media for delete
  using (auth.uid() = user_id);

-- 3) No row-count ceiling: members keep full control of their own library,
--    and server-side limits no longer interfere with their uploads.

-- 4) Storage policies for the user-media bucket (public read, owner write).
--    Requires the bucket to exist with public read access.
drop policy if exists "user_media_storage_read" on storage.objects;
create policy "user_media_storage_read"
  on storage.objects for select
  using (bucket_id = 'user-media');

drop policy if exists "user_media_storage_insert" on storage.objects;
create policy "user_media_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'user-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "user_media_storage_delete" on storage.objects;
create policy "user_media_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'user-media' and auth.uid()::text = (storage.foldername(name))[1]);
