-- Migration: ludo seed customization
-- ============================================================
-- Stores each member's customized Ludo seed (animal + colour) on the
-- profiles table so the choice persists and renders live during matches.
--
-- Idempotent; safe to re-run.
begin;

alter table public.profiles
  add column if not exists ludo_seed text,
  add column if not exists ludo_seed_color text;

comment on column public.profiles.ludo_seed is
  'Custom Ludo seed animal key chosen by the member in the seed customizer (e.g. lion, tiger, dragon).';
comment on column public.profiles.ludo_seed_color is
  'Custom Ludo seed colour hex chosen by the member in the seed customizer (e.g. #E11D48).';

notify pgrst, 'reload schema';
commit;
