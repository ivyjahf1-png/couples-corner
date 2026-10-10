-- ============================================================================
-- 054_message_soft_delete.sql
--
-- Soft delete for chat messages ("Delete for everyone").
--
-- The old chat hard-deleted rows, so "delete" removed the only copy and left
-- the other participant with a silent gap in the thread — they could not tell
-- a deleted message from one that failed to arrive. This migration adds an
-- `is_deleted` flag instead: the row stays, both participants render a
-- "This message was deleted" tombstone, and the history remains coherent.
--
-- Default false keeps every existing row visible; the write path sets the
-- flag, never removes the row. Ownership is enforced by the UPDATE's
-- sender_id filter in lib/server/messaging.ts (service-role bypasses RLS).
-- ============================================================================

alter table public.messages
  add column if not exists is_deleted boolean not null default false;

-- Partial index: the thread query filters is_deleted = false on every open,
-- and this keeps that scan narrow as deleted rows accumulate.
create index if not exists messages_not_deleted_idx
  on public.messages (conversation_id, created_at)
  where is_deleted = false;
