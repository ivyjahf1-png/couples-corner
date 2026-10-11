-- Raise the user-media bucket's per-file limit from 100 MB to 1 GB.
--
-- WHY this migration exists:
--   Uploads moved from a single POST/XHR to the resumable TUS protocol
--   (web/lib/utils/direct-upload.ts -> uploadResumableTus). TUS chunks the file
--   and resumes from the last confirmed byte, so a large clip no longer dies the
--   moment the connection blips. That reliability is what makes a 1 GB upload
--   viable, so the ceiling is raised to match.
--
--   The client constant `MAX_MOMENT_VIDEO_BYTES` (web/lib/utils/media-upload.ts)
--   and this bucket `file_size_limit` MUST stay in agreement: if the client
--   allows more than the bucket accepts, the member watches a full transfer and
--   only then gets a server 413 - the exact "Network error" this pairing exists
--   to prevent. Both are now 1 GB.
--
--   1073741824 bytes = 1 GiB.
--
-- Idempotent: safe to run repeatedly in the SQL Editor.

begin;

update storage.buckets
  set file_size_limit = 1073741824
  where id = 'user-media';

commit;
