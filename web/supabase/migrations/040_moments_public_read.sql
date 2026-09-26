-- 040: Guarantee the moments feed is publicly readable.
--
-- WHY: the home feed is a PUBLIC surface — it renders for signed-out visitors
-- too — so `moments` must be selectable by anyone. Migration 034 already creates
-- "moments public read", but this project has a history of deployed databases
-- predating a given migration, and a table with RLS enabled but NO select policy
-- returns zero rows *with no error*. That failure is indistinguishable from
-- "nobody has posted yet" and presents as an empty feed.
--
-- Re-asserts the policy and the index idempotently, so the feed cannot be
-- silently empty on a database where 034 was only partially applied. No-op on a
-- correct database.
--
-- It deliberately does NOT add a foreign key from moments.user_id to
-- profiles.user_id. The application resolves author names with a second query
-- (see lib/server/profile-lookup.ts) precisely so it does not depend on such a
-- relationship; adding one would also start rejecting inserts for members whose
-- profile row has not been provisioned yet.
begin;

alter table public.moments enable row level security;

drop policy if exists "moments public read" on public.moments;
create policy "moments public read" on public.moments for select using (true);

create index if not exists moments_created_idx on public.moments(created_at desc);

notify pgrst, 'reload schema';
commit;