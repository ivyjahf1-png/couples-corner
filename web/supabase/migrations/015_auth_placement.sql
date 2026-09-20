-- 015_auth_placement.sql
-- Adds the "auth" placement so the admin panel can manage the illustration
-- image shown at the top of the Login / Sign Up cards.

ALTER TABLE public.content DROP CONSTRAINT IF EXISTS content_placement_check;

ALTER TABLE public.content ADD CONSTRAINT content_placement_check
  CHECK (placement IN (
    'auth', 'hero', 'homepage', 'dashboard', 'discover',
    'feed', 'matches', 'messages', 'events', 'testimonials'
  ));