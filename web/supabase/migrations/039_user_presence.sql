-- =============================================================
-- Couples Corner — migration 039
-- Live presence for the online/offline indicators.
--
-- WHY A DEDICATED TABLE: `user_sessions` (migration 009) is one row per
-- signed-in DEVICE and is only touched by the server session resolver, so it
-- cannot answer "is this person online right now" cheaply for a whole feed.
-- `user_presence` is one row per member, heartbeated by the client roughly
-- every 30 seconds and treated as offline once `last_seen_at` falls outside
-- the online window. One row per user also keeps the realtime UPDATE stream
-- tiny - only the person whose presence actually changed produces a row.
--
-- Fully idempotent and safe to re-run.
-- =============================================================

begin;

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  -- Denormalised for cheap "is online" reads; kept in sync by the heartbeat.
  is_online boolean not null default true
);

alter table public.user_presence
  add column if not exists last_seen_at timestamptz not null default now();
alter table public.user_presence
  add column if not exists is_online boolean not null default true;

create index if not exists user_presence_online_idx
  on public.user_presence (is_online, last_seen_at desc);

alter table public.user_presence enable row level security;

-- Signed-in members may read presence so the feed/profile dots can render.
drop policy if exists "user_presence read authenticated" on public.user_presence;
create policy "user_presence read authenticated"
  on public.user_presence for select
  using (auth.uid() is not null);

-- A member may only ever write their OWN heartbeat. This is what stops one
-- user faking another user's presence by posting to their row.
drop policy if exists "user_presence own upsert" on public.user_presence;
create policy "user_presence own upsert"
  on public.user_presence for insert
  with check (auth.uid() = user_id);
drop policy if exists "user_presence own update" on public.user_presence;
create policy "user_presence own update"
  on public.user_presence for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "user_presence own delete" on public.user_presence;
create policy "user_presence own delete"
  on public.user_presence for delete
  using (auth.uid() = user_id);

-- Realtime: presence changes must reach other members' open tabs. The
-- publication may not exist on every environment, so guard the ALTER.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.user_presence';
    exception when duplicate_object then
      null;  -- already a member of the publication
    end;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;