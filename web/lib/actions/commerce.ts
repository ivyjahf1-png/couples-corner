"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/lib/server/session";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import {
  activateAristocracyTier,
  equipInventoryItem,
  giftAristocracyTier,
  purchaseStoreItem,
  type ActivationResult,
  type PurchaseResult,
} from "@/lib/server/commerce";
import { resolveUserCode } from "@/lib/server/profiles";

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

/**
 * Server action: activate a 30-day Aristocracy tier for the caller.
 *
 * ONLY THE TIER NAME crosses this boundary. The price is resolved server-side
 * from TIER_PRICES inside `activateAristocracyTier`, so a crafted request cannot
 * purchase a King rank for the price of a Knight.
 */
export async function activateAristocracyTierAction(
  tier: string
): Promise<ActivationResult> {
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

/**
 * Server action: buy a 30-day tier for ANOTHER member ("Give away").
 *
 * The recipient arrives as a 6-character invite-style user CODE, not a user id,
 * and is resolved to an id HERE, server-side. That is deliberate:
 *   • it lets a member gift to someone they know by code without the client
 *     ever learning or guessing a user id, and
 *   • it means an invalid or revoked code simply resolves to null and the gift
 *     is refused, instead of the client sending an arbitrary uuid that this
 *     function would have to trust.
 *
 * `resolveUserCode` is the same validator used for invite attribution, so a
 * code that cannot be referred cannot be gifted to — there is no second,
 * laxer path into `aristocracy_activations`.
 */
export async function giftAristocracyTierAction(
  tier: string,
  recipientCode: string
): Promise<ActivationResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to send this gift" };

    const resolved = await resolveUserCode(recipientCode).catch(() => null);
    if (!resolved) {
      return {
        ok: false,
        error: "We couldn't find that member. Check the 6-character code.",
        reason: "not_found",
      };
    }

    const result = await giftAristocracyTier(user.uid, resolved.userId, tier);
    if (result.ok) {
      // The recipient's own profile now shows the rank, so its path is
      // revalidated too — the payer refreshing their page would not refresh it.
      revalidatePath("/aristocracy");
      revalidatePath("/profile");
      revalidatePath(`/profile/${resolved.userId}`);
    }
    return { ...result, recipientName: resolved.displayName };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Gift failed" };
  }
}