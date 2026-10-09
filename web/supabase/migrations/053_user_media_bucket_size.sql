-- Pin the user-media bucket's per-file limit and re-affirm owner-scoped RLS.
--
-- WHY this migration exists:
--   • migration 014 set `file_size_limit = null` (unlimited). That ACCEPTS large
--     videos, but it does not bound them, so an accidental 2 GB upload would
--     transfer fully before failing. The client now guards at 100 MB
--     (`MAX_MOMENT_VIDEO_BYTES`); pinning the bucket to the SAME 100 MB makes the
--     server enforce that ceiling too, so a >100 MB upload gets a clean 413 the
--     client maps to a real message instead of the old generic "Network error".
--     Client constant and this limit MUST stay in agreement.
--   • It re-affirms the authenticated insert policy, in case an earlier repair
--     (014 mentions prior syntax errors) left the bucket without one — the direct
--     browser upload depends on it.
--
-- Idempotent: safe to run repeatedly in the SQL Editor.

begin;

-- 1) Bucket limit. 104857600 = 100 MB, matching MAX_MOMENT_VIDEO_BYTES exactly.
--    Upsert rather than insert-only, so this also repairs an existing row whose
--    limit is still too low (the root cause of the 1000014866.mp4 failure).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-media',
  'user-media',
  true,
  104857600,
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','image/bmp','image/tiff',
    'video/mp4','video/webm','video/quicktime','video/x-m4v','video/ogg','video/mpeg','video/x-msvideo','video/x-matroska','video/3gpp'
  ]::text[]
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) Owner-scoped write policies for direct browser uploads. Public read; each
--    member may only write under their own uid folder (foldername[1] = auth.uid()).
drop policy if exists "user_media_storage_read" on storage.objects;
create policy "user_media_storage_read"
  on storage.objects for select
  using (bucket_id = 'user-media');

drop policy if exists "user_media_storage_insert" on storage.objects;
create policy "user_media_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "user_media_storage_update" on storage.objects;
create policy "user_media_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "user_media_storage_delete" on storage.objects;
create policy "user_media_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

commit;
