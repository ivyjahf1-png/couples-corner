-- ============================================================
-- Seed: test profiles for the Discover feed (DEV ONLY)
-- Creates 6 test accounts (5 individuals + 1 couple)
-- with discoverable = true so /discover has cards to render.
--
-- Idempotent: fixed UUIDs + `on conflict do nothing` â€” safe to
-- run repeatedly. Test password for every account: Test1234!
--
-- Run in the Supabase SQL editor (SQL that touches auth.users
-- requires service-role privileges, so the SQL editor is the
-- right place rather than the app).
-- ============================================================

-- 1) Auth identities (email_confirmed_at set = verified login)
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-4111-8111-111111111101',
   'authenticated', 'authenticated', 'ada.test@example.com',
   crypt('Test1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-4111-8111-111111111102',
   'authenticated', 'authenticated', 'ben.test@example.com',
   crypt('Test1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-4111-8111-111111111103',
   'authenticated', 'authenticated', 'chloe.test@example.com',
   crypt('Test1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-4111-8111-111111111104',
   'authenticated', 'authenticated', 'dami.test@example.com',
   crypt('Test1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-4111-8111-111111111105',
   'authenticated', 'authenticated', 'esi.test@example.com',
   crypt('Test1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-4111-8111-111111111106',
   'authenticated', 'authenticated', 'femi.test@example.com',
   crypt('Test1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}')
on conflict (id) do nothing;

-- 2) App user rows (public.users â€” discovery/status fields live here)
insert into public.users (
  id, email, display_name, role, status, is_demo,
  email_verified, onboarding_completed, gender, date_of_birth,
  country, last_active_at
) values
  ('11111111-1111-4111-8111-111111111101', 'ada.test@example.com', 'Ada Obi',      'user', 'active', false, true,  true,  'female', '1994-03-12', 'Nigeria', now()),
  ('11111111-1111-4111-8111-111111111102', 'ben.test@example.com', 'Ben Ade',      'user', 'active', false, true,  true,  'male',   '1992-08-04', 'Nigeria', now()),
  ('11111111-1111-4111-8111-111111111103', 'chloe.test@example.com','Chloe Umeh',  'user', 'active', false, true,  true,  'female', '1996-11-23', 'Ghana',   now()),
  ('11111111-1111-4111-8111-111111111104', 'dami.test@example.com', 'Dami & Kemi', 'user', 'active', false, true,  true,  'male',   '1990-05-19', 'Nigeria', now()),
  ('11111111-1111-4111-8111-111111111105', 'esi.test@example.com',  'Esi Mensah',  'user', 'active', false, true,  true,  'female', '1993-01-30', 'Ghana',   now()),
  ('11111111-1111-4111-8111-111111111106', 'femi.test@example.com', 'Femi Bello',  'user', 'active', false, true,  true,  'male',   '1995-07-08', 'Nigeria', now())
on conflict (id) do nothing;

-- 3) Discoverable profiles (public.profiles â€” what /discover queries)
insert into public.profiles (
  user_id, display_name, bio, interests, location, country,
  gender, date_of_birth, relationship_status, profile_type,
  visibility, discoverable, photos
) values
  ('11111111-1111-4111-8111-111111111101',
   'Ada Obi',
   'Designer who loves long walks and deep conversations. Looking for someone who laughs easily.',
   ARRAY['design','hiking','jazz'], 'Lagos, NG', 'Nigeria',
   'female', '1994-03-12', 'single', 'single',
   'public', true, '[]'::jsonb),
  ('11111111-1111-4111-8111-111111111102',
   'Ben Ade',
   'Software engineer, part-time chef. Sunday jollof is my love language.',
   ARRAY['cooking','tech','football'], 'Abuja, NG', 'Nigeria',
   'male', '1992-08-04', 'single', 'single',
   'public', true, '[]'::jsonb),
  ('11111111-1111-4111-8111-111111111103',
   'Chloe Umeh',
   'Nurse and amateur photographer. I believe in slow mornings and honest talks.',
   ARRAY['photography','travel','reading'], 'Accra, GH', 'Ghana',
   'female', '1996-11-23', 'single', 'single',
   'public', true, '[]'::jsonb),
  ('11111111-1111-4111-8111-111111111104',
   'Dami & Kemi',
   'Married 3 years, hosting game nights and mentoring newlyweds.',
   ARRAY['game nights','mentoring','movies'], 'Ibadan, NG', 'Nigeria',
   'male', '1990-05-19', 'coupled', 'coupled',
   'public', true, '[]'::jsonb),
  ('11111111-1111-4111-8111-111111111105',
   'Esi Mensah',
   'Teacher who loves beach weekends and trying new restaurants.',
   ARRAY['teaching','beach','food'], 'Tema, GH', 'Ghana',
   'female', '1993-01-30', 'single', 'single',
   'public', true, '[]'::jsonb),
  ('11111111-1111-4111-8111-111111111106',
   'Femi Bello',
   'Fitness trainer. Looking for a partner to run (and rest) with.',
   ARRAY['fitness','running','podcasts'], 'Lagos, NG', 'Nigeria',
   'male', '1995-07-08', 'single', 'single',
   'public', true, '[]'::jsonb)
on conflict (user_id) do nothing;

-- 4) Verify what the Discover feed will see
select count(*) as discoverable_profiles
from public.profiles
where discoverable = true;
