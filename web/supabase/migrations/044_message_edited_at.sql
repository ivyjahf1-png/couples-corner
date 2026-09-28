-- Add an explicit edit marker to messages.
--
-- WHY THIS COLUMN EXISTS: the chat thread used to decide whether a message was
-- edited by comparing `updated_at` against `created_at`. That inference is
-- fundamentally ambiguous, because several unrelated operations move
-- `updated_at` forward:
--
--   * a genuine edit (editMessageAction)
--   * marking a message as read (it stamped `updated_at` alongside `read_at`,
--     which meant simply OPENING a conversation rewrote the edit timestamp on
--     every unread message — the "every message says edited" bug)
--
-- With both operations writing the same column there is no timestamp
-- comparison that can tell them apart, so any heuristic is either too tight
-- (misses real edits) or too loose (labels untouched messages).
--
-- `edited_at` is written ONLY by the edit path, so "is this edited?" becomes a
-- single null check that cannot drift.
--
-- Existing rows are deliberately left NULL rather than backfilled from
-- `updated_at`: a backfill would permanently re-label every message that had
-- been read, which is the exact bug being fixed. Rows edited before this
-- migration lose their (already unreliable) tag; rows not edited gain nothing
-- they did not have.

alter table public.messages
  add column if not exists edited_at timestamptz;

comment on column public.messages.edited_at is
  'Set ONLY when the message body is edited. Null means the message has never been edited.';
