-- Fixes the connection-requests schema cache error (PGRST204):
-- the server inserts `note` into public.connection_requests, but the table
-- created by 013_discovery_schema_repair.sql has no such column, so PostgREST
-- rejected the payload ("Could not find the 'note' column of
-- 'connection_requests' in the schema cache").
--
-- Idempotent and transactional — safe to run more than once.
begin;

-- 1. Add the optional personal note column (plain text, no length cap chosen
--    deliberately: short UI-level validation lives in the app, and unbounded
--    text keeps legacy payloads from failing).
alter table public.connection_requests
  add column if not exists note text;

-- 2. Force PostgREST to re-read the schema so the new column is exposed
--    immediately (otherwise the REST layer keeps serving the cached shape).
notify pgrst, 'reload schema';

commit;

-- Verification helpers (run in the Supabase SQL editor):
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'connection_requests'
--   order by ordinal_position;
--   select pg_notify('pgrst', 'reload schema');  -- manual re-run if ever needed