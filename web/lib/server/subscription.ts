import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Subscription, SubscriptionPeriod } from "@/lib/models/subscription";
import { getPlanByTier } from "@/lib/models/subscription";

function dbToSub(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    planId: row.plan_id as string,
    tier: row.tier as SubscriptionPeriod,
    status: row.status as Subscription["status"],
    startedAt: row.started_at as string,
    currentPeriodEnd: row.current_period_end as string,
    canceledAt: row.canceled_at as string | undefined,
    paymentProvider: row.payment_provider as string | undefined,
    paymentMethodId: row.payment_method_id as string | undefined,
  };
}

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return dbToSub(data);
}

export async function listUserSubscriptions(userId: string): Promise<Subscription[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (!data) return [];
  return data.map(dbToSub);
}

/**
 * Create a subscription record. Called by the payment webhook after successful
 * charge. The plan's duration is used to compute current_period_end.
 */
export async function createSubscription(params: {
  userId: string;
  tier: SubscriptionPeriod;
  paymentProvider?: string;
  paymentMethodId?: string;
}): Promise<Subscription> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const plan = getPlanByTier(params.tier);
  if (!plan) throw new Error(`Unknown tier: ${params.tier}`);

  const now = new Date();
  const end = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: params.userId,
      plan_id: plan.id,
      tier: params.tier,
      status: "active",
      started_at: now.toISOString(),
      current_period_end: end.toISOString(),
      payment_provider: params.paymentProvider ?? null,
      payment_method_id: params.paymentMethodId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return dbToSub(data);
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", subscriptionId);
}
