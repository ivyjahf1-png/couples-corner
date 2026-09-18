-- Apply in Supabase SQL Editor after reviewing ownership matches.
-- Discovery uses a service-role server client; do not grant public table access.
begin;

-- Never infer ownership from client-editable email alone. Legacy primary keys
-- may be auth IDs; link only when both identity tables confirm that exact ID.
update public.profiles p
set user_id = u.id, updated_at = now()
from public.users u join auth.users a on a.id = u.id
where p.user_id is null and p.id::text = u.id::text
  and not exists (select 1 from public.profiles other where other.user_id = u.id);

-- Remaining orphans require manual ownership verification, not deletion.
-- Matches the canonical ordered-pair text IDs used by the server services.
create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null,
  to_user_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'canceled')),
  responded_at timestamptz,
  connection_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);
create table if not exists public.connections (
  id text primary key,
  user1_id uuid not null,
  user2_id uuid not null,
  connected_at timestamptz not null default now(),
  source_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user1_id <> user2_id)
);
create table if not exists public.blocks (
  id text primary key,
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  check (blocker_id <> blocked_id)
);

alter table public.connection_requests enable row level security;
alter table public.connections enable row level security;
alter table public.blocks enable row level security;

-- Writes remain server-only, so browsers cannot forge accepted requests,
-- change participants, or manufacture connections by choosing arbitrary IDs.
revoke all on public.connection_requests, public.connections, public.blocks from anon, authenticated;
grant select on public.connection_requests, public.connections, public.blocks to authenticated;
grant all on public.connection_requests, public.connections, public.blocks to service_role;

drop policy if exists discovery_requests_read on public.connection_requests;
create policy discovery_requests_read on public.connection_requests
  for select to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);
drop policy if exists discovery_connections_read on public.connections;
create policy discovery_connections_read on public.connections
  for select to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);
drop policy if exists discovery_blocks_read on public.blocks;
create policy discovery_blocks_read on public.blocks
  for select to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create index if not exists connection_requests_from_status_idx on public.connection_requests (from_user_id, status);
create index if not exists connection_requests_to_status_idx on public.connection_requests (to_user_id, status);
create index if not exists connections_user1_idx on public.connections (user1_id);
create index if not exists connections_user2_idx on public.connections (user2_id);
create index if not exists blocks_blocker_idx on public.blocks (blocker_id);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);
notify pgrst, 'reload schema';
commit;

-- Inspect live RLS (REST service-role queries cannot verify these policies).
-- profiles contains email/role/private fields: do NOT add USING (true).
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
  and tablename in ('profiles', 'users', 'blocks', 'connections', 'connection_requests')
order by tablename, policyname;
select count(*) as profiles_needing_verified_owner from public.profiles where user_id is null;
