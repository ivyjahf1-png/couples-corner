-- ============================================================================
-- 043_ad_rewards_ledger.sql
--
-- Ad-reward crediting for Couple's Corner: the SERVER half of the rewarded-ad
-- flow. It is complete and enforced on its own; the ad SDK that will eventually
-- prove "an ad was actually watched" is a separate, later concern. Everything
-- here is written so that wiring a real verification source later requires
-- changing one function argument, not the schema.
--
-- WHY THE MONEY MOVES IN POSTGRES AND NOT IN TYPESCRIPT
-- The obvious implementation - read the wallet, add N, write it back - is a
-- read-modify-write race. Two simultaneous ad completions both read balance 10,
-- both write 15, and a member silently loses 5 coins. The service-role client
-- bypasses RLS, so nothing at the database level would catch it. Here the whole
-- credit happens inside one statement, so it is atomic by construction and no
-- application-level locking is needed.
--
-- WHY `security definer` AND A PINNED SEARCH PATH
-- The function must write tables the caller's role cannot write directly, which
-- is what makes `security definer` necessary. That same property is why it is
-- dangerous if left unlocked: a definer function with a mutable search_path can
-- be hijacked by a caller who creates a shadowing object in a writable schema.
-- `set search_path = public, pg_temp` pins resolution, and the public EXECUTE
-- grant is revoked below so only the server role may call it.
--
-- NOTE ON TABLE NAMES: the wallet this credits is public.game_wallets, keyed on
-- public.users(id). public.user_wallets is a READ-ONLY VIEW over game_wallets
-- (migration 021), not a second table - so there is nothing to keep in sync and
-- no ambiguity about which one is canonical. Writing to the view would fail.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Ledger. Append-only record of every rewarded ad credit.
--
-- Deliberately NOT game_ledger: this is ad-specific, carries a `source`
-- discriminator so a fraud review can tell an ad reward from a game reward, and
-- has a unique constraint on the provider's event id - which is what makes the
-- credit idempotent (see below).
-- ----------------------------------------------------------------------------
create table if not exists public.ad_rewards_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  reward_amount integer not null check (reward_amount > 0),
  created_at timestamptz not null default now(),

  -- Ad-network transaction id. Unique so the SAME rewarded-ad completion can
  -- never be credited twice, however many times the client retries. This is the
  -- single most important column here: without it a replayed claim mints coins
  -- forever.
  --
  -- Nullable because the reward source is not chosen yet (see header). Once a
  -- real network is wired up, network-originated claims should always pass it.
  provider_txn_id text unique,

  -- Which ad network produced the event, for analytics and fraud review.
  source text not null default 'stub',

  created_by uuid default auth.uid()
);

create index if not exists ad_rewards_ledger_user_created_idx
  on public.ad_rewards_ledger (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. Append-only guard.
--
-- An UPDATE on a ledger row would let a bug - or a compromised service key -
-- silently rewrite history after the fact. Refusing updates and deletes makes
-- the ledger trustworthy as an audit record; corrections are made by posting a
-- compensating entry, which is what an append-only ledger is for.
-- ----------------------------------------------------------------------------
create or replace function public.ad_rewards_ledger_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'ad_rewards_ledger is append-only; % is not permitted', tg_op
    using errcode = '42501';
end $$;

drop trigger if exists ad_rewards_ledger_no_update on public.ad_rewards_ledger;
create trigger ad_rewards_ledger_no_update
  before update or delete on public.ad_rewards_ledger
  for each row execute function public.ad_rewards_ledger_immutable();

-- ----------------------------------------------------------------------------
-- 3. RLS.
--
-- No insert/update/delete policy is created, so the authenticated role has no
-- write access at all. Members may read their own history; crediting happens
-- only through the definer function below, which runs as its owner.
-- ----------------------------------------------------------------------------
alter table public.ad_rewards_ledger enable row level security;

drop policy if exists "ad rewards owner read" on public.ad_rewards_ledger;
create policy "ad rewards owner read" on public.ad_rewards_ledger
  for select using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. The crediting function.
--
-- Idempotent on `provider_txn_id`: replaying the same completion returns the
-- ORIGINAL ledger row with `credited = false` and credits nothing further, so
-- callers can retry freely after a network error without risking a double
-- payout. The retry is safe precisely because the first call either committed
-- fully or not at all.
--
-- Returns the wallet state as well, so the caller needs no second query to
-- render the new balance.
-- ----------------------------------------------------------------------------
create or replace function public.claim_ad_reward(
  p_user_id uuid,
  p_reward_amount integer,
  p_provider_txn_id text,
  p_source text default 'stub'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.ad_rewards_ledger;
  v_balance integer;
  v_total integer;
begin
  -- Amount that is missing, non-positive, or absurd is a bug or an attack.
  -- Validated here as well as by the table CHECK constraint so a bad call fails
  -- with a clear message rather than an opaque constraint violation.
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = '22023';
  end if;

  if p_reward_amount is null or p_reward_amount <= 0 then
    raise exception 'reward_amount must be positive (got %)', p_reward_amount
      using errcode = '22023';
  end if;

  -- A generous ceiling that still refuses an obvious runaway or attack value.
  if p_reward_amount > 1000 then
    raise exception 'reward_amount % exceeds the per-ad maximum', p_reward_amount
      using errcode = '22023';
  end if;

  -- Idempotency check, BEFORE any write, so a replay is a cheap no-op.
  if p_provider_txn_id is not null then
    select * into v_existing
      from public.ad_rewards_ledger
     where provider_txn_id = p_provider_txn_id;

    if found then
      select coin_balance, total_earned into v_balance, v_total
        from public.game_wallets where user_id = p_user_id;

      return jsonb_build_object(
        'credited', false,
        'duplicate', true,
        'reason', 'This ad completion was already rewarded.',
        'reward_amount', v_existing.reward_amount,
        'coin_balance', coalesce(v_balance, 0),
        'total_earned', coalesce(v_total, 0)
      );
    end if;
  end if;

  -- Lazy wallet creation. `on conflict do nothing` plus a later re-read keeps
  -- this safe under concurrency: two first-time claims can both attempt the
  -- insert, one wins, and both then operate on the same single row.
  insert into public.game_wallets (user_id, coin_balance, total_earned)
  values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;

  -- ATOMIC CREDIT.
  -- `returning` yields the post-update values from the same statement that
  -- performed the write, so the balance reported back can never disagree with
  -- what was persisted - no second read, no interleaving window.
  update public.game_wallets
     set coin_balance = coin_balance + p_reward_amount,
         total_earned = total_earned + p_reward_amount,
         updated_at   = now()
   where user_id = p_user_id
  returning coin_balance, total_earned into v_balance, v_total;

  if not found then
    raise exception 'Could not credit wallet for user %', p_user_id
      using errcode = 'P0001';
  end if;

  insert into public.ad_rewards_ledger (user_id, reward_amount, provider_txn_id, source)
  values (p_user_id, p_reward_amount, p_provider_txn_id, coalesce(p_source, 'stub'));

  return jsonb_build_object(
    'credited', true,
    'duplicate', false,
    'reward_amount', p_reward_amount,
    'coin_balance', v_balance,
    'total_earned', v_total
  );
end $$;

-- ----------------------------------------------------------------------------
-- 5. Lock the function down.
--
-- Only the owner (the server's service-role connection) may execute it.
-- WITHOUT THIS REVOKE, any authenticated user could call it directly with
-- their own id and mint unlimited coins - the RLS policies above would not
-- help, because the function's writes run as its definer, not as the caller.
-- This single statement is the entire difference between a reward system and
-- a money printer.
-- ----------------------------------------------------------------------------
revoke all on function public.claim_ad_reward(uuid, integer, text, text) from public;
revoke all on function public.claim_ad_reward(uuid, integer, text, text) from anon;
revoke all on function public.claim_ad_reward(uuid, integer, text, text) from authenticated;

notify pgrst, 'reload schema';

commit;

-- Verification (run in the Supabase SQL editor):
--   \d public.ad_rewards_ledger
--   select proname from pg_proc where proname = 'claim_ad_reward';
--   -- Calling it as a normal authenticated user MUST fail with
--   -- "permission denied for function claim_ad_reward". That failure IS the
--   -- security model working, not a bug.
--   select * from public.user_wallets limit 5;

