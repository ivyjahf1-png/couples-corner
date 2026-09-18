-- 017_messages_content_legacy_repair.sql
--
-- REPAIR: `public.messages.content` is a legacy column that is NOT NULL with no
-- default, but no code path in the app reads or writes it — every read/write
-- uses `body` instead (lib/server/messaging.ts, lib/server/outbox.ts, and
-- app/chat/page.tsx). Because the column is NOT NULL and unsatisfied, EVERY
-- message insert failed with:
--
--   23502  null value in column "content" of relation "messages"
--          violates not-null constraint
--
-- which is the database exception behind the Matches page error state
-- ("Couldn't load your chats...") and failed message sends.
--
-- This migration makes `content` non-blocking:
--   1. backfills existing NULLs from `body` (no data loss, legacy column stays
--      useful for anything that may still read it),
--   2. drops the NOT NULL constraint so inserts that only supply `body` succeed.
--
-- Idempotent and transactional — safe to run more than once.
-- Note: the application ALSO mirrors `body` into `content` on write (see the
-- compat bridge in messaging.ts / outbox.ts / chat page), so sends work even on
-- environments where this migration has not yet been applied.

begin;

-- 1) Backfill any NULL content from body so the column is never blank.
update public.messages
   set content = body
 where content is null
   and body is not null;

-- 2) Remove the NOT NULL constraint that was rejecting every insert.
alter table public.messages
  alter column content drop not null;

-- Document the column's legacy status for future readers.
comment on column public.messages.content is
  'Legacy message text column. Superseded by `body`; nullable and no longer written by the app (body is mirrored here on insert for backward compatibility).';

commit;
