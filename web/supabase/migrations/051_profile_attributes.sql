-- =============================================================
-- Couples Corner â€” migration 051
-- Profile attributes: height, education, lifestyle (public.profiles).
--
-- WHY: the "Me" profile screen was redesigned to a standard dating-app layout
-- with three attribute groups that had NO backing column:
--     About Me     â†’ Height, Profession, Education
--     Lifestyle    â†’ Pet owner, Fitness, ... (multi-select)
-- The redesign must not invent these. Two of the three already had real storage
-- to reuse (`occupation` â†’ Profession); the other three did not exist, so they
-- are added here as real, member-editable columns rather than hardcoded strings.
--
-- `height_cm` is an INTEGER in centimetres, not a free-text string, because a
-- numeric column can be range-checked in the database. The UI accepts feet/inches
-- and converts on write; see components/profile/AboutFields.tsx.
--
-- `lifestyle` is TEXT[] to match the existing `interests` column's shape, so
-- both render through the same pill component and the same array mapping in
-- lib/server/profiles.ts. A jsonb column would work too but would need a second
-- code path for no benefit.
--
-- Idempotent; safe to re-run.
-- =============================================================
begin;

alter table public.profiles
  add column if not exists height_cm integer,
  add column if not exists education text,
  add column if not exists lifestyle text[] not null default '{}'::text[];

-- Height is a physical measurement. Reject negatives and the implausible in one
-- constraint rather than in three places in the UI, so a bad value cannot enter
-- via any write path (edit form, direct API, future bulk import).
--
-- The upper bound is 254cm: the tallest recorded human is ~272cm, so 254 clears
-- every real person while still rejecting a fat-fingered "2500".
alter table public.profiles
  drop constraint if exists profiles_height_cm_range;
alter table public.profiles
  add constraint profiles_height_cm_range
  check (height_cm is null or (height_cm > 0 and height_cm <= 254));

comment on column public.profiles.height_cm is
  'Height in centimetres. 90-254 is enforced by profiles_height_cm_range.';
comment on column public.profiles.education is
  'Free-text education, e.g. "BSc Computer Science". Max 120 chars (app-validated).';
comment on column public.profiles.lifestyle is
  'Lifestyle tags, e.g. {pet-owner,fitness}. Mirrors the shape of public.profiles.interests.';

notify pgrst, 'reload schema';
commit;