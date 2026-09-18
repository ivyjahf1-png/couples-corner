-- ============================================================
-- 018: Auto-provision users + profiles on signup
--
-- ROOT-CAUSE FIX: new registered users were missing from /discover
-- because profile provisioning depended entirely on the client calling
-- /api/auth/register after Supabase Auth signup. That call is skipped
-- when email confirmation is required (no session yet) and its failures
-- are swallowed by the register page, so no public.users / public.profiles
-- row was ever created and the user could never appear in discovery.
--
-- This trigger guarantees that EVERY new auth user gets:
--   - a public.users row with status = 'active'
--   - a public.profiles row with visibility = 'public'
--     and discoverable = true
--
-- Idempotent + defensive: uses ON CONFLICT DO NOTHING and won't fail
-- signup if provisioning hiccups (EXCEPTION block).
-- Run in the Supabase SQL Editor. Safe to run repeatedly.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1) Account row (id == auth.users.id)
  insert into public.users (id, email, display_name, role, status, email_verified, onboarding_completed)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    'user',
    'active',
    false,
    false
  )
  on conflict (id) do nothing;

  -- 2) Discovery profile row — defaults make the user discoverable
  --    immediately; photos/onboarding state never gate discovery.
  insert into public.profiles (
    id, user_id, display_name, bio, interests, photos,
    visibility, discoverable, preferences
  )
  values (
    new.id,
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    null,
    '{}'::text[],
    '[]'::jsonb,
    'public',
    true,
    '{"notify_on_connection": true, "notify_on_messages": true, "show_online_status": true}'::jsonb
  )
  on conflict do nothing;

  return new;
exception
  when others then
    -- Never block authentication because of a provisioning hiccup.
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create missing account/profile rows for users who signed up
-- before this trigger existed (e.g. the email-confirmation gap).
insert into public.users (id, email, display_name, role, status)
select au.id, au.email,
       coalesce(nullif(trim(au.raw_user_meta_data ->> 'display_name'), ''),
                nullif(trim(au.raw_user_meta_data ->> 'full_name'), ''),
                split_part(au.email, '@', 1)),
       'user', 'active'
from auth.users au
where not exists (select 1 from public.users u where u.id = au.id)
on conflict (id) do nothing;

insert into public.profiles (
  id, user_id, display_name, bio, interests, photos,
  visibility, discoverable, preferences
)
select au.id, au.id,
       coalesce(nullif(trim(au.raw_user_meta_data ->> 'display_name'), ''),
                nullif(trim(au.raw_user_meta_data ->> 'full_name'), ''),
                split_part(au.email, '@', 1)),
       null, '{}'::text[], '[]'::jsonb,
       'public', true,
       '{"notify_on_connection": true, "notify_on_messages": true, "show_online_status": true}'::jsonb
from auth.users au
where not exists (
  select 1 from public.profiles p
  where p.user_id = au.id or p.id = au.id
)
on conflict do nothing;

-- Sanity check: every active account should now be discoverable.
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.users) as account_rows,
  (select count(*) from public.profiles where discoverable = true and visibility = 'public') as discoverable_profiles;