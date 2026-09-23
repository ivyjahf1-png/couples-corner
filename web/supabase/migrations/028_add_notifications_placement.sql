-- ============================================================
-- Migration: Add "notifications" to content_placement_check
-- The notifications page renders ContentSlot + AdvertCardGrid with
-- placement="notifications", but the DB check constraint (set in
-- 014) did not include it, causing assertValidPlacement to reject
-- admin-saved content in the notifications slot at runtime.
--
-- Idempotent — safe to rerun.
-- ============================================================

alter table public.content
  drop constraint if exists content_placement_check;

alter table public.content
  add constraint content_placement_check
  check (placement in (
    'hero', 'homepage', 'dashboard', 'discover',
    'feed', 'matches', 'messages', 'events', 'testimonials',
    'notifications'
  ));

notify pgrst, 'reload schema';
