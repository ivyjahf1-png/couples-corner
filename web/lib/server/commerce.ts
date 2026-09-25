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
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { STORE_ITEMS, type StoreCategory } from "@/lib/storeCatalog";
import {
  ARISTOCRACY_TIERS,
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

/** Read the user's owned store items and active Aristocracy tier. */
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
  | { ok: false; error: string };

/** Purchase a store item with coins using a server-authoritative price. */
export async function purchaseStoreItem(userId: string, itemId: string): Promise<PurchaseResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  let item;
  try {
    item = resolveStoreItem(itemId);
  } catch {
    return { ok: false, error: "Unknown store item" };
  }

  try {
    const wallet = await ensureWallet(userId);
    if (wallet.coin_balance < item.price) return { ok: false, error: "Not enough coins" };

    const { count } = await supabase
      .from("user_inventory")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("item_id", itemId);
    if ((count ?? 0) > 0) return { ok: false, error: "You already own this item" };

    const { data: debited, error: debitError } = await supabase
      .from("game_wallets")
      .update({ coin_balance: wallet.coin_balance - item.price, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("coin_balance", wallet.coin_balance)
      .select("coin_balance")
      .single();
    if (debitError || !debited) return { ok: false, error: "Purchase conflict, please retry" };

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
  coinBalance?: number;
  expiresAt?: string;
}

/** Activate (or renew) a 30-day Aristocracy tier using coins. */
export async function activateAristocracyTier(userId: string, tier: string): Promise<ActivationResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  if (!isAristocracyTier(tier)) return { ok: false, error: "Unknown tier" };
  const cost = TIER_PRICES[tier];

  try {
    const wallet = await ensureWallet(userId);
    if (wallet.coin_balance < cost) return { ok: false, error: "Not enough coins" };

    const { data: debited, error: debitError } = await supabase
      .from("game_wallets")
      .update({ coin_balance: wallet.coin_balance - cost, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("coin_balance", wallet.coin_balance)
      .select("coin_balance")
      .single();
    if (debitError || !debited) return { ok: false, error: "Purchase conflict, please retry" };

    const expiresAt = addDays(30);
    const { error: activationError } = await supabase.from("aristocracy_activations").insert({
      user_id: userId,
      tier,
      coins_spent: cost,
      expires_at: expiresAt,
    });
    if (activationError) return { ok: false, error: "Failed to activate tier" };

    await supabase.from("game_ledger").insert({
      user_id: userId,
      kind: "purchase",
      reward_id: `aristocracy:${tier}`,
      amount: -cost,
    });
    return { ok: true, coinBalance: (debited as { coin_balance: number }).coin_balance, expiresAt };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Activation failed" };
  }
}
