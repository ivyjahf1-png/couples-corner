-- 048_call_logs.sql
--
-- Call history, including MISSED calls.
--
-- WHY THIS TABLE IS NEW RATHER THAN AN EXTENSION OF `messages`
-- ---------------------------------------------------------------------------
-- A call is not a message. The realtime call surface is peer-to-peer over a
-- Supabase Realtime channel (`call:<conversationId>`); the signalling never
-- touches a row, so today a call that nobody answers leaves NO trace anywhere.
-- The two people tap through a ringing screen, nothing connects, and the
-- conversation afterwards is indistinguishable from one where no call was ever
-- attempted.
--
-- Modelling it as a message row was the tempting shortcut — it would have
-- rendered in the existing thread for free. It is wrong for three reasons:
--   • there is no sender/recipient asymmetry to borrow, a call has both;
--   • the thread's ordering key is `created_at` on `messages`, and a call
--     started at a different moment than it was written would sort wrongly; and
--   • a missed call is a RECORD OF AN EVENT, not something anyone said, and
--     putting it in the message list implies the peer wrote it.
--
-- It is a separate timeline, merged by timestamp at render time. See
-- `lib/feature/types.ts` -> `CallLogEntry` and `LiveConversationThread`.
--
-- `missed` is set by the CALLER when the ring-out timer expires unanswered. The
-- callee never writes it: a ringing phone that was never picked up is a fact
-- about the caller's experience, and letting the callee mark it would let
-- someone delete the evidence that they were ignored.

begin;

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),

  -- The call belongs to a conversation. Cascading on the conversation keeps a
  -- deleted thread from leaving orphaned call rows behind forever.
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,

  -- Both participants are stored explicitly rather than derived from the
  -- conversation at read time. A call record must stay readable even if the
  -- conversation row is later altered, and the recipient index below needs a
  -- concrete column to index on.
  caller_id uuid not null references public.users (id) on delete cascade,
  callee_id uuid not null references public.users (id) on delete cascade,

  mode text not null default 'audio' check (mode in ('audio', 'video')),

  -- `ringing`    - placed, not yet connected
  -- `answered`   - media flowed (the call connected at least once)
  -- `missed`     - rang out with no answer
  -- `declined`   - callee hung up while still ringing
  -- `cancelled`  - caller hung up before it connected
  -- `ended`      - finished normally after answering
  status text not null default 'ringing'
    check (status in ('ringing', 'answered', 'missed', 'declined', 'cancelled', 'ended')),

  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,

  -- The caller is never the callee. Enforced in the database rather than in the
  -- client, because the client is the thing that is being trusted least here.
  constraint calls_participants_differ check (caller_id <> callee_id),

  -- `missed` and `declined` imply no answer happened, so an `answered_at` on
  -- either is contradictory. This is what stops a late `answered` write from
  -- quietly rewriting a missed call into a connected one.
  constraint calls_missed_has_no_answer
    check (status not in ('missed', 'declined') or answered_at is null)
);

-- Timeline reads are "calls in this conversation, newest first".
create index if not exists calls_conversation_started_idx
  on public.calls (conversation_id, started_at desc);

-- The "calls" log: everything addressed to this member, newest first.
create index if not exists calls_callee_started_idx
  on public.calls (callee_id, started_at desc);

-- The "missed" badge count. Partial, so it only carries rows that can ever be
-- missed — the index stays small instead of indexing the whole call history.
create index if not exists calls_callee_missed_idx
  on public.calls (callee_id, started_at desc)
  where status = 'missed';

alter table public.calls enable row level security;

-- READ: both participants. Anything else would leak the fact that a call
-- happened, which is itself private information about someone's availability.
drop policy if exists "calls_select_participants" on public.calls;

create policy calls_select_participants
  on public.calls
  for select
  using (
    auth.uid() = caller_id
    or auth.uid() = callee_id
  );

-- INSERT: only as the caller, and only for yourself. Without the
-- `auth.uid() = caller_id` leg, any member could write a row claiming someone
-- else placed a call to them.
drop policy if exists "calls_insert_own" on public.calls;

create policy calls_insert_own
  on public.calls
  for insert
  with check (auth.uid() = caller_id);

-- UPDATE: only a participant, and only to move a call toward a terminal state.
-- The `with check` re-asserts the caller so a participant cannot reassign a row
-- to someone else mid-update.
drop policy if exists "calls_update_participant" on public.calls;

create policy calls_update_participant
  on public.calls
  for update
  using (auth.uid() = caller_id or auth.uid() = callee_id)
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

-- No DELETE policy on purpose. A call record is an audit trail; letting either
-- participant delete it would let a caller erase a missed call. Retention, when
-- it is wanted, is a job for a scheduled cleanup, not for a client DELETE.

commit;
