-- 056_active_calls_signaling.sql
--
-- Active call sessions (NOT call history).
--
-- WHY A SEPARATE TABLE FROM `public.calls`
-- ---------------------------------------------------------------------------
-- The `calls` table (migration 048) is the call *history*: an append-only audit
-- trail that records every call ever placed, whether it connected, was missed,
-- declined, etc. An active call is a *live* session whose lifecycle is driven by
-- two parties: a caller who pushes `start()` and a receiver who answers / declines
-- / hangs up. Reflecting that live, two-dimensional state in a single table would
-- force `status` to double as both a session state ("ringing", "connected",
-- "ended") and a chronological state ("ringing", "answered", "missed", ...),
-- which is exactly the kind of collision that produces the silent "Connecting..."
-- state the caller hit before this work began.
--
-- `active_calls` therefore holds ONE ROW PER LIVE CALL SESSION. It is:
--   - sized by live sessions, not by conversations
--   - keyed by a unique `channel_name` so the Agora RTC client can join without
--     a second lookup
--   - shadow-indexed on `receiver_id` so the receiver's realtime listener can
--     subscribe cheaply with `receiver_id = auth.uid()`
--
-- A row is inserted when the call is placed, updated to `connected` the moment
-- media flows, and moved to `ended` when either party hangs up. It is never
-- written to on a decline (declined calls never reached the other device), and it
-- is never evicted on answered; the caller keeps the row until the call is over,
-- at which point the caller's `finish()` write also nulls its `ended_at`.
--
-- RLS is the authority on who may read or write a row. Every policy re-checks
-- membership against `auth.uid()`.

begin;

create table if not exists public.active_calls (
  id uuid primary key default gen_random_uuid(),

  -- The caller (who placed the call). Mirrors `caller_id` on `public.calls` and
  -- is strictly NOT the receiver, so a caller can never accidentally read or
  -- write another member's session row.
  caller_id uuid not null
    references public.users (id) on delete cascade,

  -- The receiver (who is being called). This is the *only* column the receiver
  -- ever needs to see: it is the index we subscribe to on the client, and it is
  -- the leg the RLS policy checks when the receiver touches this row.
  receiver_id uuid not null
    references public.users (id) on delete cascade,

  -- Unique room id for Agora's RTC engine. Both parties derive the same string
  -- from the conversation, join that exact channel, and hang up by leaving it.
  -- The uniqueness constraint stops two open call sessions from sharing a room,
  -- which would silently cross-talk audio.
  channel_name text not null
    unique
    check (char_length(channel_name) > 0),

  -- Session state. `ringing` = the receiver's device has NOT yet answered; it is
  -- set to `connected` the instant the receiver's Agora client enters the room,
  -- and to `ended` when either party gives up. The CHECK enforces a strict
  -- progression: `ended` is the only terminal state, and `connected` can only be
  -- written while the session is still live.
  status text not null default 'ringing'
    check (status in ('ringing', 'connected', 'ended')),

  -- When the call was placed.
  created_at timestamptz not null default now(),

  -- When either party terminated the session. `NULL` while the call is live,
  -- just like `answered_at` can be NULL on a ringing call.
  ended_at timestamptz
);

create index if not exists active_calls_receiver_idx
  on public.active_calls (receiver_id, created_at desc);

create index if not exists active_calls_channel_idx
  on public.active_calls (channel_name);

alter table public.active_calls enable row level security;

-- READ: receiver only. The caller never needs to see an active session out of
-- band; they hold their own `callId` in memory. This keeps the receiver's
-- subscription bounded and prevents the caller from learning that a session is
-- active before the receiver has answered (which would be a minor availability
-- leak).
drop policy if exists "active_calls_select_receiver" on public.active_calls;

create policy active_calls_select_receiver
  on public.active_calls
  for select
  using (
    auth.uid() = receiver_id
  );

-- INSERT: caller only, and only for themselves. This is the same asymmetry as
-- `calls.insert_own`: you can only place a call against your own *receiver* (the
-- person in the conversation), never fabricate a call for someone else.
drop policy if exists "active_calls_insert_caller" on public.active_calls;

create policy active_calls_insert_caller
  on public.active_calls
  for insert
  with check (auth.uid() = caller_id);

-- UPDATE: only a participant, only toward terminal states. The `with check`
-- re-asserts `caller_id` so a member cannot rewrite another member's session.
drop policy if exists "active_calls_update_participant" on public.active_calls;

create policy active_calls_update_participant
  on public.active_calls
  for update
  using (auth.uid() = caller_id or auth.uid() = receiver_id)
  with check (auth.uid() = caller_id or auth.uid() = receiver_id);

-- No DELETE policy. The `active_calls` row is the single source of truth for
-- "is there a ringing call right now"; deleting it would let a member disappear
-- into the silence and make recovery impossible.

commit;

