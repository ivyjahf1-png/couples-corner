-- Couples Corner: pin conversations to the top of the inbox.
--
-- WHY A COLUMN AND NOT A CLIENT-SIDE LIST: pinning is per-CONVERSATION and has to
-- survive across devices and sessions. Storing the set of pinned ids in the
-- browser would mean a member who pins someone on their phone has to pin them
-- again on their laptop, and would silently unpin when storage is cleared.
--
-- WHY `add column if not exists` RATHER THAN A FRESH CREATE TABLE: migration 049
-- documents the exact failure this guards against. Several migrations here open
-- with `create table if not exists`, so the first one to run silently wins and
-- every later definition is a no-op that still leaves policies and queries
-- referencing columns nobody created. This file only ADDS a column to a table
-- that must already exist, and is safe to run twice.
--
-- NO RLS OR GRANT CHANGES: `conversations` already carries participant-only
-- policies, and adding a column to a table does not change who may read rows.
-- The pinned flag is metadata about a thread the viewer is already a
-- participant in, so it leaks nothing the row did not already.

begin;

alter table public.conversations
  add column if not exists is_pinned boolean not null default false;

-- The inbox orders by recency, not by this flag, so a partial index on the
-- pinned rows alone is what keeps "show me pinned" cheap. It stays small even
-- for a member with thousands of threads.
create index if not exists idx_conversations_pinned
  on public.conversations (is_pinned)
  where is_pinned;

commit;