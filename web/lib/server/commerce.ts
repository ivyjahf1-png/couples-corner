import "server-only";

/**
 * Store + Aristocracy commerce (SERVER ONLY).
 *
 * Security model
 * --------------
 * - Prices and durations are read from the server catalog (lib/storeCatalog),
 *   never from the client request body.
 * - Every purchase debits the coin wallet using an optimistic lock
 *   (`coin_balance = current`), so concurrent spends cannot overdraw.
 * - Grants are written to public.user_inventory / public.aristocracy_activations
 *   with a 30-day (or item duration) expiry.
 * - Every mutation is recorded in public.game_ledger for auditability.
 *
 * The `aristocracy_activations` TABLE NAME is legacy and deliberately frozen:
 * renaming a table is a data migration, not a rebrand. See lib/aristocracyTiers.ts.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { STORE_ITEMS, type StoreCategory } from "@/lib/storeCatalog";
import {
  ARISTOCRACY_TIERS,
  TIER_DURATION_DAYS,
  TIER_PRICES,
  isAristocracyTier,
  type AristocracyTier,
} from "@/lib/aristocracyTiers";

export { ARISTOCRACY_TIERS, TIER_PRICES, isAristocracyTier };
export type { AristocracyTier };

async function ensureWallet(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");
  const { data } = await supabase
    .from("game_wallets")
    .select("user_id, coin_balance")
    .eq("user_id", userId)
    .single();
  if (data) return data;
  const { data: created, error } = await supabase
    .from("game_wallets")
    .insert({ user_id: userId, coin_balance: 100, total_earned: 100 })
    .select("user_id, coin_balance")
    .single();
  if (error || !created) throw new Error("Wallet unavailable");
  return created;
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export interface InventoryEntry {
  itemId: string;
  name: string;
  category: StoreCategory;
  icon: string;
  equipped: boolean;
  expiresAt: string | null;
}

export function resolveStoreItem(itemId: string) {
  const item = STORE_ITEMS.find((entry) => entry.id === itemId);
  if (!item) throw new Error("Unknown store item");
  return item;
}
export interface StoreSnapshot {
  items: InventoryEntry[];
  activeTier: AristocracyTier | null;
  activeTierExpiresAt: string | null;
  coinBalance: number;
}

/** Read the user's owned store items and active VIP Club tier. */
export async function getUserInventory(userId: string): Promise<StoreSnapshot> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { items: [], activeTier: null, activeTierExpiresAt: null, coinBalance: 0 };

  const nowIso = new Date().toISOString();
  const [{ data: rows }, { data: activations }, { data: wallet }] = await Promise.all([
    supabase.from("user_inventory").select("item_id, kind, equipped, expires_at").eq("user_id", userId),
    supabase
      .from("aristocracy_activations")
      .select("tier, expires_at")
      .eq("user_id", userId)
      .gt("expires_at", nowIso)
      .order("expires_at", { ascending: false })
      .limit(1),
    supabase.from("game_wallets").select("coin_balance").eq("user_id", userId).single(),
  ]);

  const byId = new Map(STORE_ITEMS.map((item) => [item.id, item]));
  const items: InventoryEntry[] = (rows ?? [])
    .filter((row) => !row.expires_at || row.expires_at > nowIso)
    .map((row) => {
      const item = byId.get(row.item_id as string);
      return {
        itemId: row.item_id as string,
        name: item?.name ?? (row.item_id as string),
        category: (item?.category ?? "Frames") as StoreCategory,
        icon: item?.icon ?? "🎁",
        equipped: Boolean(row.equipped),
        expiresAt: row.expires_at as string | null,
      };
    });

  const active = activations?.[0];
  return {
    items,
    activeTier: isAristocracyTier(active?.tier) ? active.tier : null,
    activeTierExpiresAt: (active?.expires_at as string | undefined) ?? null,
    coinBalance: wallet?.coin_balance ?? 0,
  };
}

export type PurchaseResult =
  | { ok: true; item: InventoryEntry; coinBalance: number }
  | {
      ok: false;
      error: string;
      /** Machine-readable reason, so the UI can open the right recovery. */
      reason?: "insufficient" | "unknown_item" | "already_owned" | "conflict";
      /** Present on `insufficient`: the caller's true balance at check time. */
      coinBalance?: number;
    };

/** Purchase a store item with coins using a server-authoritative price. */
export async function purchaseStoreItem(userId: string, itemId: string): Promise<PurchaseResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  let item;
  try {
    item = resolveStoreItem(itemId);
  } catch {
    return { ok: false, error: "Unknown store item", reason: "unknown_item" };
  }

  try {
    const wallet = await ensureWallet(userId);
    if (wallet.coin_balance < item.price) {
      // The balance is returned so the UI can show HAVE / NEED / COST as
      // numbers. A bare "not enough coins" gives the member nothing to act on.
      return {
        ok: false,
        error: "Not enough coins",
        reason: "insufficient",
        coinBalance: wallet.coin_balance,
      };
    }

    const { count } = await supabase
      .from("user_inventory")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("item_id", itemId);
    if ((count ?? 0) > 0) {
      return { ok: false, error: "You already own this item", reason: "already_owned" };
    }

    const { data: debited, error: debitError } = await supabase
      .from("game_wallets")
      .update({ coin_balance: wallet.coin_balance - item.price, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("coin_balance", wallet.coin_balance)
      .select("coin_balance")
      .single();
    if (debitError || !debited) {
      return { ok: false, error: "Purchase conflict, please retry", reason: "conflict" };
    }

    // The rental clock starts at purchase, not at equip, so time spent deciding
    // whether to use it is still paid-for time.
    const expiresAt = addDays(item.durationDays);
    const { error: grantError } = await supabase.from("user_inventory").insert({
      user_id: userId,
      item_id: itemId,
      kind: "purchase",
      equipped: false,
      expires_at: expiresAt,
    });
    if (grantError) return { ok: false, error: "Failed to grant item" };

    await supabase.from("game_ledger").insert({
      user_id: userId,
      kind: "purchase",
      reward_id: itemId,
      amount: -item.price,
    });

    return {
      ok: true,
      item: { itemId: item.id, name: item.name, category: item.category, icon: item.icon, equipped: false, expiresAt },
      coinBalance: (debited as { coin_balance: number }).coin_balance,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Purchase failed" };
  }
}

/** Equip an owned item as the active frame/effect. */
export async function equipInventoryItem(userId: string, itemId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data: owned } = await supabase
    .from("user_inventory")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (!owned) return { ok: false, error: "You do not own this item" };

  await supabase.from("user_inventory").update({ equipped: false }).eq("user_id", userId).eq("kind", "purchase");
  const { error } = await supabase
    .from("user_inventory")
    .update({ equipped: true })
    .eq("id", (owned as { id: string }).id);
  if (error) return { ok: false, error: "Failed to equip" };
  return { ok: true };
}

export interface ActivationResult {
  ok: boolean;
  error?: string;
  /** Machine-readable reason, so the UI can route to the top-up screen. */
  reason?: "insufficient" | "unknown_tier" | "conflict" | "self_gift" | "not_found";
  coinBalance?: number;
  expiresAt?: string;
  /** Rank of the RECIPIENT, which is the person who ends up holding the tier. */
  recipientName?: string | null;
}

/**
 * The single debit+grant path shared by buying and gifting.
 *
 * WHY THIS IS EXTRACTED rather than having two near-identical functions: the
 * security properties below are the whole reason this purchase is safe, and
 * duplicating them into a "give as a gift" variant is how one of them silently
 * rots. Notably the gifting branch originally wanted to skip the balance check
 * — the recipient is not paying — and a copy/paste of the pre-check version
 * would have let anyone grant themselves a King tier for free.
 *
 * THE SECURITY PROPERTIES, in order:
 *   1. PRICE IS NEVER TAKEN FROM THE CALLER. `cost` comes from TIER_PRICES, and
 *      the action layer only forwards a tier NAME. A tampered request cannot
 *      name its own price.
 *   2. THE TIER IS VALIDATED against the allowlist, so an unknown string cannot
 *      reach the insert.
 *   3. BALANCE IS CHECKED SERVER-SIDE against a freshly-read wallet, never a
 *      number sent by the client.
 *   4. THE DEBIT IS AN OPTIMISTIC LOCK. `.eq("coin_balance", wallet.coin_balance)`
 *      means the update only lands if nobody else spent in between, so two
 *      concurrent purchases cannot both pass the check and overdraw the wallet
 *      to negative. This is the part a naive `read balance; write balance - cost`
 *      gets wrong.
 *   5. THE GRANT AND THE LEDGER ROW ARE WRITTEN AFTER THE DEBIT SUCCEEDS, and
 *      the debit is what gates everything.
 *
 * `payerId` is the member whose wallet is debited; `recipientId` is who
 * receives the rank. They differ only for gifting.
 */
async function debitAndGrant(
  payerId: string,
  recipientId: string,
  tier: AristocracyTier,
  recipientName: string | null
): Promise<ActivationResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const cost = TIER_PRICES[tier];

  try {
    // (3) Balance read and checked on the server, from the PAYER's wallet.
    const wallet = await ensureWallet(payerId);
    if (wallet.coin_balance < cost) {
      return {
        ok: false,
        // The shortfall is returned so the UI can say "you need 40,000 more"
        // rather than a bare "not enough coins", which reads as a bug.
        error: "Not enough coins",
        reason: "insufficient",
        coinBalance: wallet.coin_balance,
      };
    }

    // (4) Optimistic-lock debit: this is what makes the balance check above
    // actually safe under concurrency.
    const { data: debited, error: debitError } = await supabase
      .from("game_wallets")
      .update({ coin_balance: wallet.coin_balance - cost, updated_at: new Date().toISOString() })
      .eq("user_id", payerId)
      .eq("coin_balance", wallet.coin_balance)
      .select("coin_balance")
      .single();
    if (debitError || !debited) {
      return { ok: false, error: "Purchase conflict, please retry", reason: "conflict" };
    }

    const expiresAt = addDays(TIER_DURATION_DAYS);
    const { error: activationError } = await supabase
      .from("aristocracy_activations")
      .insert({
        user_id: recipientId,
        tier,
        coins_spent: cost,
        expires_at: expiresAt,
      });
    if (activationError) return { ok: false, error: "Failed to activate tier" };

    // The ledger records the PAYER, so a gifted purchase is still attributable
    // to the wallet it was charged to. The reward_id notes the recipient so the
    // two cases are distinguishable in an audit without parsing a second table.
    await supabase.from("game_ledger").insert({
      user_id: payerId,
      kind: "purchase",
      reward_id: `aristocracy:${tier}${recipientId === payerId ? "" : `:gift:${recipientId}`}`,
      amount: -cost,
    });

    return {
      ok: true,
      coinBalance: (debited as { coin_balance: number }).coin_balance,
      expiresAt,
      recipientName,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Activation failed" };
  }
}

/** Activate (or renew) a 30-day Aristocracy tier for yourself, using tokens. */
export async function activateAristocracyTier(
  userId: string,
  tier: string
): Promise<ActivationResult> {
  if (!isAristocracyTier(tier)) {
    return { ok: false, error: "Unknown tier", reason: "unknown_tier" };
  }
  return debitAndGrant(userId, userId, tier, null);
}

/**
 * Buy a 30-day tier FOR SOMEONE ELSE ("Give away").
 *
 * `recipientId` is already-resolved by the caller (see resolveUserCode) — this
 * function never accepts a raw code or a display name, so it cannot be used to
 * guess at or enumerate members. The recipient is resolved and validated
 * upstream, and the identity used for the grant is that resolved id.
 *
 * Self-gifting is refused explicitly. It is not merely pointless (a member can
 * just use the normal activate path) — allowing it would let the client
 * exercise the gift code path against itself, and a gift is a distinct,
 * auditable event that should only mean "someone bought this for me".
 */
export async function giftAristocracyTier(
  payerId: string,
  recipientId: string,
  tier: string
): Promise<ActivationResult> {
  if (!isAristocracyTier(tier)) {
    return { ok: false, error: "Unknown tier", reason: "unknown_tier" };
  }
  if (!recipientId) return { ok: false, error: "Pick someone to gift this to", reason: "not_found" };
  if (recipientId === payerId) {
    return {
      ok: false,
      error: "You can activate this rank for yourself instead",
      reason: "self_gift",
    };
  }
  return debitAndGrant(payerId, recipientId, tier, null);
}
