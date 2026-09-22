-- 025: FK-free bot persona tables (ADDITIVE ONLY — never alters existing tables).
-- Live probes proved public.users.id (users_id_fkey), public.profiles.id
-- (profiles_id_fkey) and public.messages.sender_id
-- (messages_sender_id_fkey) all reference the Auth mirror, so synthetic
-- bot ids can never live in those tables. These two tables carry no such
-- REFERENCES (except persona -> its own messages), so bot seeding always
-- succeeds. Safe to re-run.
begin;
create table if not exists public.bot_personas (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Community member',
  bio text, occupation text, interests text[] not null default '{}',
  location text, avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.bot_messages (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  persona_id uuid not null references public.bot_personas (id) on delete cascade,
  sender text not null default 'bot' check (sender in ('bot', 'user')),
  body text not null default '',
  read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists bot_messages_owner_idx
  on public.bot_messages (owner_user_id, created_at desc);
create index if not exists bot_messages_persona_idx
  on public.bot_messages (persona_id);
alter table public.bot_personas enable row level security;
alter table public.bot_messages enable row level security;
revoke all on public.bot_personas, public.bot_messages from anon, authenticated;
grant select on public.bot_personas, public.bot_messages to authenticated;
grant all on public.bot_personas, public.bot_messages to service_role;
drop policy if exists bot_personas_read on public.bot_personas;
create policy bot_personas_read on public.bot_personas
  for select to authenticated using (true);
drop policy if exists bot_messages_owner_read on public.bot_messages;
create policy bot_messages_owner_read on public.bot_messages
  for select to authenticated using (auth.uid() = owner_user_id);
notify pgrst, 'reload schema';
commit;
