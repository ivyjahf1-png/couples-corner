-- 019_game_center.sql
-- Game Center: per-user coin wallet + reward/stake ledger.

create table if not exists public.game_wallets (
  user_id uuid primary key references public.users (id) on delete cascade,
  coin_balance integer not null default 0 check (coin_balance >= 0),
  total_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- "claim" (chest/bonus), "stake" (buy-in), "payout" (win)
  kind text not null check (kind in ('claim', 'stake', 'payout')),
  reward_id text,          -- e.g. daily_bonus / chest_silver
  game_id text,            -- e.g. couples-ludo (for stake/payout)
  amount integer not null, -- signed: +credit / -debit
  settled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists game_ledger_user_created_idx
  on public.game_ledger (user_id, created_at desc);

alter table public.game_wallets enable row level security;
alter table public.game_ledger enable row level security;

-- Owners can read their own wallet/ledger; all writes go through the
-- service-role server API (/api/games/reward), never from the browser.
drop policy if exists "wallet owner read" on public.game_wallets;
create policy "wallet owner read" on public.game_wallets
  for select using (auth.uid() = user_id);

drop policy if exists "ledger owner read" on public.game_ledger;
create policy "ledger owner read" on public.game_ledger
  for select using (auth.uid() = user_id);
