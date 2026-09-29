-- 046: Aristocracy tier expansion — six tiers, Monarch folded into King.
--
-- WHY THIS IS A DATA MIGRATION AND NOT JUST A CODE CHANGE
-- `aristocracy_activations.tier` is a free-text column with no CHECK constraint,
-- and the application matches on the exact string. Renaming a tier in code
-- without updating the stored rows silently downgrades every affected member:
-- `isVipTier('Monarch')` would return false, the lookup would fall through, and
-- the member would appear to have no tier at all while still having paid for
-- one. So the rows move WITH the code, in the same change.
--
-- WHAT CHANGES
--   • The ladder grows from five tiers to six: a `Marquis` rank is inserted
--     between Viscount and Duke.
--   • The top rank is renamed `Monarch` -> `King`. Monarch was a REGAL title
--     sitting under a rank the product already calls "Duke"; King is the
--     natural apex and reads correctly next to the new Marquis.
--
-- MONARCH -> KING, NOT A DELETE
-- Existing Monarch rows are RETARGETED, never dropped. A member who bought a
-- 30-day Monarch plan keeps that plan and keeps its `expires_at`; only the
-- label changes. Dropping the row would revoke a paid membership with no
-- refund, and there is no way to reconstruct the purchase afterwards.
--
-- The old string is kept as a grandfathered alias in `legacy_tier` so the
-- ledger trail and any external references remain resolvable, rather than
-- being overwritten in place.
--
-- LEDGER
-- `game_ledger.reward_id` stores `aristocracy:<tier>`. Historical rows are left
-- EXACTLY as they are: a ledger is an immutable audit record, and rewriting
-- history to match a rename would destroy the evidence of what was actually
-- sold and at what price. New activations write `aristocracy:King`.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fold Monarch rows into King, preserving the original label.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.aristocracy_activations
  add column if not exists legacy_tier text;

update public.aristocracy_activations
   set legacy_tier = 'Monarch',
       tier       = 'King'
 where tier = 'Monarch'
   and legacy_tier is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Guard against the exact mistake this migration exists to prevent.
--    A CHECK constraint makes an unknown tier a write error rather than a
--    silently-invisible membership. Adding tiers later means a new migration
--    that widens the list — which is the point: it forces the change to be
--    deliberate and reviewed.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.aristocracy_activations
  drop constraint if exists aristocracy_activations_tier_check;

alter table public.aristocracy_activations
  add constraint aristocracy_activations_tier_check
  check (tier in ('Knight', 'Baron', 'Viscount', 'Marquis', 'Duke', 'King'));

-- Any row left holding a removed value would now violate the constraint, so
-- surface them loudly rather than letting the ALTER fail on someone's data.
do $$
declare
  orphans text;
begin
  select string_agg(distinct tier, ', ') into orphans
    from public.aristocracy_activations
   where tier not in ('Knight', 'Baron', 'Viscount', 'Marquis', 'Duke', 'King');

  if orphans is not null then
    raise exception
      'aristocracy_activations holds unrecognised tier value(s): % — resolve before applying this migration', orphans;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Report the outcome so the operator can see what actually moved.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  moved int;
begin
  select count(*) into moved
    from public.aristocracy_activations
   where legacy_tier = 'Monarch';

  raise notice 'Aristocracy: folded % Monarch membership row(s) into King. Their expiry dates are unchanged.', moved;
end $$;
