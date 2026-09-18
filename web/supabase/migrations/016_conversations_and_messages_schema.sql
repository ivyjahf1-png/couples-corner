-- =============================================================
-- Couples Corner — migration 016
-- Conversations & messages schema + participant RLS.
--
-- ROOT CAUSE FIXED: the app (matches page, messages inbox, accept-
-- connection flow, /chat) reads and writes `conversations` and
-- `messages`, but no migration ever created them. Live result:
-- PGRST205 "Could not find the table 'public.conversations'", which
-- surfaced on /matches as "Couldn't load your chats".
--
-- Fully idempotent and safe to re-run. Matches the exact columns the
-- app writes: messaging.ts, outbox.ts (status), connections.ts
-- (created_by_id, participant_user_ids), chat/page.tsx (read_at).
-- =============================================================

begin;

-- -------------------------------------------------------------
-- conversations
-- -------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct'
    check (type in ('direct', 'couple', 'group')),
  participant_user_ids uuid[] not null default '{}',
  created_by_id uuid,
  last_message_at timestamptz,
  last_message_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns may be missing if the table was created by hand earlier.
alter table public.conversations
  add column if not exists type text not null default 'direct';
alter table public.conversations
  add column if not exists participant_user_ids uuid[] not null default '{}';
alter table public.conversations
  add column if not exists created_by_id uuid;
alter table public.conversations
  add column if not exists last_message_at timestamptz;
alter table public.conversations
  add column if not exists last_message_id uuid;
alter table public.conversations
  add column if not exists created_at timestamptz not null default now();
alter table public.conversations
  add column if not exists updated_at timestamptz not null default now();

-- Fast-path for `participant_user_ids @> ARRAY[uid]` (contains filters).
create index if not exists conversations_participants_gin
  on public.conversations using gin (participant_user_ids);
create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc nulls last);

-- -------------------------------------------------------------
-- messages
-- -------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  sender_id uuid not null,
  type text not null default 'text',
  body text,
  -- Legacy column kept for backward compatibility (nullable; `body` is the
  -- source of truth). Guaranteed to exist so the write bridge in
  -- lib/utils/message-payload.ts is safe on every environment.
  content text,
  status text not null default 'sent',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table public.messages
  add column if not exists conversation_id uuid;
alter table public.messages
  add column if not exists sender_id uuid;
alter table public.messages
  add column if not exists type text not null default 'text';
alter table public.messages
  add column if not exists body text;
alter table public.messages
  add column if not exists content text;
alter table public.messages
  add column if not exists status text not null default 'sent';
alter table public.messages
  add column if not exists read_at timestamptz;
alter table public.messages
  add column if not exists created_at timestamptz not null default now();
alter table public.messages
  add column if not exists updated_at timestamptz not null default now();

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- -------------------------------------------------------------
-- Row-Level Security — participants may read and write their threads
-- (needed for any browser-client access, e.g. web/app/chat/page.tsx;
-- server routes use the service role and bypass RLS).
-- -------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Idempotent policy replacement (drop + create; policies are per-table named).
drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant
  on public.conversations
  for select to authenticated
  using (participant_user_ids @> array[(select auth.uid())]);

drop policy if exists conversations_insert_participant on public.conversations;
create policy conversations_insert_participant
  on public.conversations
  for insert to authenticated
  with check (
    (select auth.uid()) = any (participant_user_ids)
    or created_by_id = (select auth.uid())
  );

drop policy if exists conversations_update_participant on public.conversations;
create policy conversations_update_participant
  on public.conversations
  for update to authenticated
  using (participant_user_ids @> array[(select auth.uid())])
  with check (participant_user_ids @> array[(select auth.uid())]);

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant
  on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.participant_user_ids @> array[(select auth.uid())]
    )
  );

drop policy if exists messages_insert_participant on public.messages;
create policy messages_insert_participant
  on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.participant_user_ids @> array[(select auth.uid())]
    )
  );

-- -------------------------------------------------------------
-- Grants (explicit write surface for authenticated users)
-- -------------------------------------------------------------
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;

commit;
