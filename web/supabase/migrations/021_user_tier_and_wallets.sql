-- 021_user_tier_and_wallets.sql
-- Uniform subscription tiers + coin wallet views across web & web-admin.
--
-- What this does:
--   1. Adds public.users.subscription_tier ('free' | 'premium' | 'vip'),
--      the canonical tier both apps display and admins can edit.
--   2. Creates public.user_wallets — a stable view over game_wallets with
--      the consistent (user_id, coin_balance, total_earned) shape shared by
--      both codebases.
--   3. Extends game_ledger.kind with 'purchase' (coin packs / tier upgrades).
--
-- Idempotent and transactional — safe to run more than once.
begin;

-- 1. Canonical subscription tier on the account record.
alter table public.users
  add column if not exists subscription_tier text not null default 'free';

-- CHECK constraint (added only when no legacy row violates it).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_subscription_tier_check'
  ) then
    if not exists (
      select 1 from public.users
      where subscription_tier not in ('free', 'premium', 'vip')
    ) then
      alter table public.users
        add constraint users_subscription_tier_check
        check (subscription_tier in ('free', 'premium', 'vip'));
    end if;
  end if;
end $$;

-- 2. user_wallets view — consistent wallet shape for web + web-admin.
drop view if exists public.user_wallets;
create view public.user_wallets as
  select user_id, coin_balance, total_earned, created_at, updated_at
  from public.game_wallets;

-- Read through the invoker's RLS (owners see only their row, like the table).
do $$
begin
  if exists (select 1 from pg_views where viewname = 'user_wallets') then
    execute 'alter view public.user_wallets security_invoker = true';
  end if;
exception
  when undefined_feature then null; -- pre-PG15: view stays owner-scoped
end $$;

-- 3. Allow 'purchase' ledger rows (coin packs / tier upgrades).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'game_ledger_kind_check'
      and conrelid = 'public.game_ledger'::regclass
  ) then
    alter table public.game_ledger drop constraint game_ledger_kind_check;
  end if;

  if not exists (
    select 1 from public.game_ledger
    where kind not in ('claim', 'stake', 'payout', 'purchase')
  ) then
    alter table public.game_ledger
      add constraint game_ledger_kind_check
      check (kind in ('claim', 'stake', 'payout', 'purchase'));
  end if;
end $$;

notify pgrst, 'reload schema';

commit;

-- Verification helpers (run in the Supabase SQL editor):
--   select column_name, data_type, column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'users'
--     and column_name = 'subscription_tier';
--   select * from public.user_wallets limit 5;
--   select conname from pg_constraint
--     where conrelid = 'public.game_ledger'::regclass and conname like '%kind%';