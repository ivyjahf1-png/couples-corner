-- Remove the user-media bucket's per-file size limit entirely.
--
-- WHY this migration exists:
--   Moment uploads have NO per-file size ceiling: members may upload media of
--   any size up to their account's storage quota. The client enforces no size
--   guard (web/lib/utils/media-upload.ts carries no limit constant), and every
--   transfer goes over the resumable TUS path
--   (web/lib/utils/direct-upload.ts -> uploadResumableTus), which chunks the
--   file and resumes from the last confirmed byte, so even multi-gigabyte clips
--   survive a flaky mobile uplink.
--
--   `file_size_limit = null` means Supabase Storage accepts any size, so no
--   member ever watches a full transfer complete only to be rejected with a 413
--   afterwards. Previous ceilings (100 MB in 053, 1 GB in 054) are superseded.
--
-- Idempotent: safe to run repeatedly in the SQL Editor.

begin;

update storage.buckets
  set file_size_limit = null
  where id = 'user-media';

commit;
