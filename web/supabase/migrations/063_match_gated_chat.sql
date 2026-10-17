-- ============================================================================
-- 063_match_gated_chat.sql
-- Mutual matches table for gated chat / direct intro flow.
--
-- A match exists when two users have mutually liked each other (both rows in
-- public.profile_likes) or have accepted a connection request (row in
-- public.connections). The matches table is the canonical source for "can these
-- two users message each other for free?"
--
-- Idempotent and transactional — safe to run more than once.
-- ============================================================================

begin;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null,
  user2_id uuid not null,
  created_at timestamptz not null default now(),
  check (user1_id <> user2_id),
  unique (user1_id, user2_id)
);

create index if not exists matches_user1_idx on public.matches (user1_id);
create index if not exists matches_user2_idx on public.matches (user2_id);

alter table public.matches enable row level security;

drop policy if exists matches_select_participant on public.matches;
create policy matches_select_participant
  on public.matches
  for select to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

revoke all on public.matches from anon, authenticated;
grant select on public.matches to authenticated;
grant all on public.matches to service_role;

notify pgrst, 'reload schema';

commit;