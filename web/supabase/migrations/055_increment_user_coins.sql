
-- ============================================================================
-- 055_increment_user_coins.sql
--
-- Coin-currency increment for the game wallet — the server half of the wallet
-- credit flow. The only path that may credit coins is the webhook at
-- web/app/api/game/webhook/route.ts, which verifies an HMAC signature against
-- a server-only secret BEFORE touching the wallet; this function itself runs
-- as the service role, so nothing in the browser can reach it.
--
-- What this does:
--   1. Credits (or debits) coin_balance on public.game_wallets by `amount`.
--   2. Fails loudly when the wallet row is missing, so a phantom userId yields
--      a visible error instead of a silent no-op.
--   3. Does the credit atomically in a single statement — no read-modify-write
--      race between two concurrent credits.
--
-- SECURITY
-- --------
-- `security definer` + `set search_path = public, pg_temp` pins object
-- resolution and prevents a hijacker from shadowing objects. The EXECUTE
-- grant is revoked from public/anonymous/authenticated, so a client-side
-- caller — or a compromised browser — gets "permission denied for function
-- increment_user_coins" rather than a coin mint. Only the server's service
-- role can execute this function.
-- ============================================================================

begin;

create or replace function public.increment_user_coins(
  p_user_id uuid,
  p_amount integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.game_wallets
     set coin_balance = coin_balance + p_amount,
         updated_at  = now()
   where user_id = p_user_id;

  if not found then
    raise foreign_key_violation using message =
      'increment_user_coins: no wallet row for user_id ' || p_user_id::text;
  end if;
end;
$$;

revoke all on function public.increment_user_coins(uuid, integer) from public;
revoke all on function public.increment_user_coins(uuid, integer) from anon;
revoke all on function public.increment_user_coins(uuid, integer) from authenticated;

notify pgrst, 'reload schema';

commit;
