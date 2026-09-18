-- ============================================================
-- Migration: Expand content_placement_check
-- Fixes the error:
--   'new row for relation "content" violates check constraint
--    "content_placement_check"'
--
-- The admin ContentForm and the landing page support the
-- "events" and "testimonials" placements (EventsBoard and the
-- testimonial showcase query getPublishedForPlacement with
-- them), but the original constraint in 011_content_table.sql
-- only allowed: hero, homepage, dashboard, discover, feed,
-- matches, messages. Selecting Events/Testimonials in the form
-- therefore violated the check constraint on insert/update.
--
-- This migration recreates the constraint with the full set of
-- placements the app model defines. Idempotent — safe to rerun.
-- ============================================================

alter table public.content
  drop constraint if exists content_placement_check;

alter table public.content
  add constraint content_placement_check
  check (placement in (
    'hero', 'homepage', 'dashboard', 'discover',
    'feed', 'matches', 'messages', 'events', 'testimonials'
  ));

-- Force PostgREST to reload its schema cache so the relaxed
-- constraint is visible immediately.
notify pgrst, 'reload schema';
