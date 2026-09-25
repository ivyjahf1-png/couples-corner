"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/lib/server/session";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import {
  activateAristocracyTier,
  equipInventoryItem,
  purchaseStoreItem,
  type ActivationResult,
  type PurchaseResult,
} from "@/lib/server/commerce";

/** Server action: buy a store item with the caller's coin balance. */
export async function purchaseStoreItemAction(
  itemId: string
): Promise<PurchaseResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to purchase" };
    const result = await purchaseStoreItem(user.uid, itemId);
    if (result.ok) {
      revalidatePath("/store");
      revalidatePath("/profile");
    }
    return result;
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Purchase failed" };
  }
}

/** Server action: equip an owned item as the active frame/effect. */
export async function equipInventoryItemAction(
  itemId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to equip" };
    const result = await equipInventoryItem(user.uid, itemId);
    if (result.ok) revalidatePath("/store");
    return result;
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Equip failed" };
  }
}

/** Server action: activate a 30-day Aristocracy tier with coins. */
export async function activateAristocracyTierAction(tier: string): Promise<ActivationResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to activate" };
    const result = await activateAristocracyTier(user.uid, tier);
    if (result.ok) {
      revalidatePath("/aristocracy");
      revalidatePath("/profile");
    }
    return result;
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Activation failed" };
  }
}
