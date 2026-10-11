-- ============================================================================
-- 057_payout_accounts.sql
--
-- Withdrawal destination for the coin wallet ("Bind Account").
--
-- The wallet modal lets a member attach ONE payout destination — a bank
-- account or a crypto wallet — so a withdrawal request can be settled by staff
-- without asking for details again each time. It is a single row per member
-- (user_id is the primary key) because the product only ever binds one
-- destination; adding a second later is a matter of dropping the PK, not of
-- redesigning the table.
--
-- ── WHY THE FIELDS ARE COLUMNS AND NOT JSONB ───────────────────────────────
-- Bank and crypto destinations share three facts (provider, destination,
-- holder) and differ only in what those strings mean. Modelling that as three
-- text columns keeps the table queryable by staff — "everyone bound to TRC-20"
-- is a one-line SELECT — where a jsonb blob would need a containment scan and
-- could hold arbitrary shape.
--
-- ── WHY RLS LOCKS THIS DOWN COMPLETELY ─────────────────────────────────────
-- Payout details are the most sensitive row in the app: an account number plus
-- a holder name is enough to attempt fraud. They are written and read ONLY by
-- the validated server actions in `lib/actions/wallet.ts`, which run on the
-- service-role client and therefore bypass RLS anyway. So the policy below is
-- `using (false)` for anon AND authenticated: there is deliberately no path
-- from a browser to this table, not even the owner's own row. Every request
-- goes through the action, which is where the session is checked and the
-- input is validated.
-- ============================================================================

create table if not exists public.payout_accounts (
  user_id      uuid primary key references public.users (id) on delete cascade,
  -- 'bank' (account number / IBAN) or 'crypto' (wallet address on a network).
  method       text not null check (method in ('bank', 'crypto')),
  -- Bank name ("GTBank") or crypto network ("TRC-20", "ERC-20").
  provider     text not null,
  -- Account number / IBAN, or the wallet address.
  destination  text not null,
  -- Account or wallet holder name, as it should appear on the payout.
  holder_name  text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Staff settle withdrawals from this table, so the lookup index is on the
-- column they filter and sort by.
create index if not exists payout_accounts_method_idx
  on public.payout_accounts (method);

-- Defense-in-depth. The service-role client bypasses RLS, so these policies
-- are what stops a leaked anon key or a future client-side query from reading
-- payout details.
alter table public.payout_accounts enable row level security;

drop policy if exists "payout accounts are server-only" on public.payout_accounts;
create policy "payout accounts are server-only"
  on public.payout_accounts for all
  using (false)
  with check (false);

-- Let PostgREST pick the new table up without a dashboard reload.
notify pgrst, 'reload schema';
