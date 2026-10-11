-- 058_active_calls_mode.sql
--
-- Call type on the live session row.
--
-- WHY THIS COLUMN EXISTS: `active_calls` (056) tracks session state
-- (`ringing` / `connected` / `ended`) but never recorded WHAT KIND of call
-- was placed. The global incoming-call modal must route both parties to the
-- same surface — `/call/<conversationId>/audio` or `/video` — and without a
-- stored mode the receiver's Accept button cannot know which URL to push.
-- Deriving it client-side (e.g. from the channel name) would be guessing;
-- the caller states it once at insert and every reader trusts the row.
--
-- `video` is the default so rows written before this migration (or by a
-- caller that omits the field) still route somewhere real.

begin;

alter table public.active_calls
  add column if not exists mode text not null default 'video'
    check (mode in ('audio', 'video'));

commit;
