-- =============================================================
-- Couples Corner — migration 041
-- Follow graph (public.user_follows).
--
-- WHY: `lib/server/profile-stats.ts` has ALWAYS read this table to populate the
-- profile page's Following and Followers stats, but no migration ever created
-- it. `countRows()` swallows the query error and returns 0, so both stats have
-- been permanently "0" and were indistinguishable from a genuinely empty graph.
--
-- That swallow is also why this went unnoticed: a missing table produces the
-- same output as a real zero. This migration creates the table the application
-- has been querying all along, matching the column semantics the code already
-- assumes:
--
--     follower_id  = the member doing the following (the actor)
--     following_id = the member being followed (the target)
--
-- so `following = count where follower_id = me` and
-- `followers  = count where following_id = me`.
--
-- Deliberately does NOT touch `public.friends` (migration 008), which is the
-- separate mutual-connections graph used by Matches. Following is one-directional
-- and must not imply a connection.
--
-- Idempotent; safe to re-run.
-- =============================================================
begin;

create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One row per ordered pair: re-following is an upsert, never a duplicate.
  constraint user_follows_pair_key unique (follower_id, following_id),
  -- No self-follows. Without this the UI would offer a button that creates a
  -- row nobody can see.
  constraint user_follows_no_self check (follower_id <> following_id)
);

-- Reverse lookup: "who follows this member".
create index if not exists user_follows_following_idx
  on public.user_follows (following_id);
-- Forward lookup: "who does this member follow".
create index if not exists user_follows_follower_idx
  on public.user_follows (follower_id, created_at desc);

alter table public.user_follows enable row level security;

-- Counts are rendered on public profile cards, so reads are open.
drop policy if exists "user_follows public read" on public.user_follows;
create policy "user_follows public read"
  on public.user_follows for select
  using (true);

-- A member may only ever create a row where THEY are the follower. This is what
-- stops an unfollowed member from inflating someone else's follower count.
drop policy if exists "user_follows own insert" on public.user_follows;
create policy "user_follows own insert"
  on public.user_follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "user_follows own delete" on public.user_follows;
create policy "user_follows own delete"
  on public.user_follows for delete
  using (auth.uid() = follower_id);

notify pgrst, 'reload schema';
commit;