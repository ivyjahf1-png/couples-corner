-- ============================================================================
-- 064_backfill_matches.sql
-- One-time backfill of public.matches from the two sources that predate it:
--
--   1. Mutual likes  - both (A -> B) and (B -> A) rows in public.profile_likes
--      (bot likes excluded: a bot liking a human is not a human match).
--   2. Accepted connections - rows in public.connections (an accepted request
--      has always meant "these two can talk").
--
-- Without this backfill every pre-existing pair would be treated as unmatched
-- and charged 100 coins just to say hello, despite having matched or connected
-- under the old rules.
--
-- Idempotent and transactional - safe to run more than once. Rows are stored
-- as an ordered pair (least/greatest) to agree with the app-side convention
-- in lib/server/matches.ts and the unique (user1_id, user2_id) constraint
-- from migration 063.
-- ============================================================================

begin;

-- 1. Mutual human likes -> matches.
insert into public.matches (user1_id, user2_id)
select distinct
  least(l.liker_id, l.liked_user_id) as user1_id,
  greatest(l.liker_id, l.liked_user_id) as user2_id
from public.profile_likes l
join public.profile_likes r
  on r.liker_id = l.liked_user_id
 and r.liked_user_id = l.liker_id
where l.is_bot = false
  and r.is_bot = false
  and l.liker_id <> l.liked_user_id
on conflict (user1_id, user2_id) do nothing;

-- 2. Accepted connections -> matches.
--    connections rows are only written when a request is accepted (see
--    respondToConnectionRequest), so every row qualifies.
insert into public.matches (user1_id, user2_id)
select
  least(c.user1_id, c.user2_id) as user1_id,
  greatest(c.user1_id, c.user2_id) as user2_id
from public.connections c
where c.user1_id <> c.user2_id
on conflict (user1_id, user2_id) do nothing;

notify pgrst, 'reload schema';

commit;
