-- 022_events_location.sql
-- Events/meetups data connection (admin → user events page).
--
--   1. Adds public.content.location — the meetup venue the admin enters in
--      the ContentForm and the user-facing EventsBoard displays.
--   2. Reloads PostgREST's schema cache so the new column is exposed to both
--      codebases immediately.
--
-- Idempotent and transactional — safe to run more than once.
begin;

alter table public.content
  add column if not exists location text;

notify pgrst, 'reload schema';

commit;

-- Verification helper:
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'content'
--     and column_name = 'location';