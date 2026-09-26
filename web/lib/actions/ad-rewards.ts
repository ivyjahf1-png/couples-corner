"use server";

import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";

/**
 * Rewarded-ad coin crediting.
 *
 * ── READ THIS BEFORE WIRING AN AD SDK ──────────────────────────────────────
 * This endpoint is a STUBBED claim path. It proves the reward plumbing end to
 * end - ledger row, atomic wallet credit, idempotency - but it CANNOT prove an
 * ad was watched, because nothing here is connected to an ad network yet. Anyone
 * can call it and receive coins.
 *
 * That is deliberate, and is why it sits behind a hard server-side cooldown plus
 * the `AD_REWARDS_ENABLED` kill switch. When a real ad client lands, the
 * `provider_txn_id` passed in MUST come from a server-verified source (Google's
 * Server-Side Ad Reward callback, or an equivalent signed postback) and must
 * NOT be a value the browser supplied - a client-supplied transaction id is a
 * trivially forgeable idempotency key, which is worse than having no key.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** Coins granted per completed ad. Server-side constant, never client-sourced. */
const REWARD_AMOUNT = 25;

/**
 * Minimum gap between rewards for one member.
 *
 * The only thing standing between the app and an infinite-coin bug while the
 * claim path is stubbed. Enforced server-side by reading the ledger, because a
 * client-side cooldown is a suggestion and this endpoint is publicly callable.
 */
const COOLDOWN_MINUTES = 30;

/**
 * Master switch. Flip to false to disable ad rewards with no deploy - useful if
 * the stub path is live and you need to stop crediting immediately.
 */
const AD_REWARDS_ENABLED = true;

export interface ClaimAdRewardResult {
  ok: boolean;
  /** True when coins were actually added; false when suppressed or replayed. */
  credited?: boolean;
  /** True when the RPC reported this completion as already rewarded. */
  duplicate?: boolean;
  rewardAmount?: number;
  coinBalance?: number;
  error?: string;
}

export async function claimAdRewardAction(params?: {
  providerTxnId?: string;
  source?: string;
}): Promise<ClaimAdRewardResult> {
  if (!AD_REWARDS_ENABLED) {
    return { ok: false, error: "Ad rewards are not available right now." };
  }

  // The user is ALWAYS the session user. There is deliberately no userId
  // parameter, so "credit someone else" is not expressible through this action.
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, error: "Sign in to earn free tokens." };

  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Rewards are unavailable right now." };

  // Cooldown, enforced here rather than in the browser.
  //
  // Deliberately NOT filtered by `source`: varying the source would otherwise
  // be a trivial way to dodge the limit, so every ad-originated row counts
  // toward one window.
  const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60_000).toISOString();
  const { count: recentCount, error: recentError } = await supabase
    .from("ad_rewards_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.uid)
    .gte("created_at", cutoff);

  if (recentError) {
    console.error("[ad-reward] cooldown check failed", supabaseErrorDetail(recentError));
    return { ok: false, error: "Could not check your reward status. Try again." };
  }
  if ((recentCount ?? 0) > 0) {
    return {
      ok: false,
      error: `You can earn again in ${COOLDOWN_MINUTES} minutes. Come back shortly!`,
    };
  }

  // Idempotency key. With a real ad network this is the server-verified
  // transaction id; while stubbed it is a fresh uuid per call, so the RPC's
  // dedupe path is exercised but not relied upon.
  const txnId =
    params?.providerTxnId?.trim() ||
    `stub_${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const source = params?.source?.trim() || "stub";

  const { data, error } = await supabase.rpc("claim_ad_reward", {
    p_user_id: user.uid,
    p_reward_amount: REWARD_AMOUNT,
    p_provider_txn_id: txnId,
    p_source: source,
  });

  if (error) {
    console.error("[ad-reward] claim_ad_reward failed", supabaseErrorDetail(error));
    return { ok: false, error: "Could not credit your tokens. Please try again." };
  }

  const result = (data ?? {}) as {
    credited?: boolean;
    duplicate?: boolean;
    reward_amount?: number;
    coin_balance?: number;
    reason?: string;
  };

  // `credited: false` is a normal expected outcome (a replayed completion), not
  // an error, so it is reported as a soft result rather than a failure.
  return {
    ok: true,
    credited: result.credited ?? false,
    duplicate: result.duplicate ?? false,
    rewardAmount: result.reward_amount ?? 0,
    coinBalance: result.coin_balance ?? 0,
    error: result.duplicate ? (result.reason ?? "Already rewarded.") : undefined,
  };
}

/** Read a member's ad-reward history. Server-side so RLS cannot be bypassed. */
export async function getAdRewardHistoryAction(): Promise<
  Array<{ id: string; rewardAmount: number; createdAt: string; source: string }>
> {
  const user = await getCurrentSessionUser();
  if (!user) return [];

  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ad_rewards_ledger")
    .select("id, reward_amount, created_at, source")
    .eq("user_id", user.uid)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) {
    console.error("[ad-reward] history read failed", supabaseErrorDetail(error));
    return [];
  }

  return ((data ?? []) as Array<{
    id: string;
    reward_amount: number;
    created_at: string;
    source: string;
  }>).map((row) => ({
    id: row.id,
    rewardAmount: row.reward_amount,
    createdAt: row.created_at,
    source: row.source,
  }));
}

/**
 * When this member may claim again, or null if they may claim right now.
 *
 * Server-calculated from the same ledger and the same COOLDOWN_MINUTES the claim
 * path enforces, so the button's disabled state can never be more permissive
 * than the server actually is. The countdown is a courtesy to the member - the
 * cooldown check in `claimAdRewardAction` remains the authority, and a member
 * who races the timer just gets the usual "come back shortly" message.
 */
export async function getNextAdRewardAtAction(): Promise<string | null> {
  const user = await getCurrentSessionUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60_000).toISOString();
  const { data, error } = await supabase
    .from("ad_rewards_ledger")
    .select("created_at")
    .eq("user_id", user.uid)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[ad-reward] cooldown read failed", supabaseErrorDetail(error));
    // Fail OPEN here on purpose: this value only drives a disabled button. If
    // the read fails we would rather show an enabled button that the server
    // then rejects with a clear message, than a permanently disabled one that
    // looks broken and gives the member no way forward.
    return null;
  }

  const last = (data ?? [])[0] as { created_at?: string } | undefined;
  if (!last?.created_at) return null;

  const nextEligible = new Date(
    new Date(last.created_at).getTime() + COOLDOWN_MINUTES * 60_000,
  );
  if (Number.isNaN(nextEligible.getTime())) return null;

  return nextEligible.getTime() > Date.now() ? nextEligible.toISOString() : null;
}

