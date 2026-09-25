import "server-only";

/**
 * Task Center + Moments (SERVER ONLY).
 *
 * Daily reset model
 * -----------------
 * Progress is keyed by (user_id, task_slug, task_date). "Today" is simply the
 * current date, so each calendar day is a fresh row set - no cron, no
 * destructive UPDATE, and the history stays auditable. Claiming is enforced by
 * the unique constraint plus a status check.
 *
 * Coin payouts reuse the same optimistic-lock debit as the store/Aristocracy
 * flows, so a task can never pay out twice or overdraw the wallet.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { MomentView } from "@/lib/moments";

export type TaskStatus = "available" | "claimed";

export interface TaskView {
  slug: string;
  title: string;
  description: string | null;
  category: string;
  rewardCoins: number;
  actionRoute: string | null;
  requiresUpload: boolean;
  status: TaskStatus;
}


function today(): string {
  return new Date().toISOString().slice(0, 10);
}

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

/** Today's task list for a user, with claim status resolved. */
export async function getUserTasks(userId: string): Promise<TaskView[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const date = today();
  const [{ data: definitions }, { data: rows }] = await Promise.all([
    supabase
      .from("task_definitions")
      .select("slug, title, description, category, reward_coins, action_route, requires_upload, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("user_tasks")
      .select("task_slug, status")
      .eq("user_id", userId)
      .eq("task_date", date),
  ]);

  const bySlug = new Map((rows ?? []).map((row) => [row.task_slug as string, row.status as TaskStatus]));

  return (definitions ?? []).map((definition) => ({
    slug: definition.slug as string,
    title: definition.title as string,
    description: (definition.description as string | null) ?? null,
    category: (definition.category as string) ?? "Daily",
    rewardCoins: (definition.reward_coins as number) ?? 0,
    actionRoute: (definition.action_route as string | null) ?? null,
    requiresUpload: Boolean(definition.requires_upload),
    status: bySlug.get(definition.slug as string) ?? "available",
  }));
}

export type ClaimResult =
  | { ok: true; rewardCoins: number; coinBalance: number }
  | { ok: false; error: string };

/**
 * Claim a task reward. Refuses duplicate claims for the same day, and pays out
 * with an optimistic wallet lock.
 */
export async function claimTaskReward(userId: string, slug: string): Promise<ClaimResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  try {
    const { data: definition } = await supabase
      .from("task_definitions")
      .select("slug, reward_coins, requires_upload")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    if (!definition) return { ok: false, error: "Task not found" };

    const date = today();

    // Upload-gated tasks need a moment published before they can be claimed.
    if (definition.requires_upload) {
      const { count } = await supabase
        .from("moments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("task_slug", slug)
        .gte("created_at", `${date}T00:00:00.000Z`);
      if ((count ?? 0) === 0) {
        return { ok: false, error: "Upload a moment to unlock this reward" };
      }
    }

    // Insert the day's claim row. The unique constraint blocks a second claim.
    const { error: insertError } = await supabase.from("user_tasks").insert({
      user_id: userId,
      task_slug: slug,
      task_date: date,
      status: "claimed",
      claimed_at: new Date().toISOString(),
    });
    if (insertError) {
      return { ok: false, error: "Task already claimed today" };
    }

    const reward = (definition.reward_coins as number) ?? 0;
    const wallet = await ensureWallet(userId);
    const { data: credited, error: creditError } = await supabase
      .from("game_wallets")
      .update({ coin_balance: wallet.coin_balance + reward, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("coin_balance", wallet.coin_balance)
      .select("coin_balance")
      .single();
    if (creditError || !credited) {
      return { ok: false, error: "Reward conflict, please retry" };
    }

    await supabase.from("game_ledger").insert({
      user_id: userId,
      kind: "claim",
      reward_id: `task:${slug}`,
      amount: reward,
    });

    return { ok: true, rewardCoins: reward, coinBalance: (credited as { coin_balance: number }).coin_balance };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Claim failed" };
  }
}

export type MomentResult =
  | { ok: true; momentId: string; mediaUrl: string }
  | { ok: false; error: string };

/** Publish a moment. Moments are public and syndicated to the home feed. */
export async function publishMoment(
  userId: string,
  input: { content: string; mediaUrl: string; mediaType: "image" | "video"; taskSlug?: string | null }
): Promise<MomentResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const content = input.content.trim();
  if (!content && !input.mediaUrl) return { ok: false, error: "Add a description or media" };
  if (content.length > 2200) return { ok: false, error: "Descriptions must be 2,200 characters or fewer" };

  const { data, error } = await supabase
    .from("moments")
    .insert({
      user_id: userId,
      content,
      media_url: input.mediaUrl,
      media_type: input.mediaType,
      task_slug: input.taskSlug ?? null,
    })
    .select("id, media_url")
    .single();
  if (error || !data) return { ok: false, error: "Could not publish your moment" };
  return { ok: true, momentId: (data as { id: string }).id, mediaUrl: (data as { media_url: string }).media_url };
}

/** Recent public moments, newest first, syndicated to the home discovery feed. */
export async function getRecentMoments(limit = 12): Promise<MomentView[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("moments")
    .select("id, user_id, content, media_url, media_type, created_at, profiles(display_name, photos)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  return (data as unknown[]).map((raw) => {
    const row = raw as {
      id: string;
      user_id: string;
      content: string;
      media_url: string;
      media_type: "image" | "video";
      created_at: string;
      profiles?: { display_name?: string | null; photos?: unknown } | null;
    };
    const photos = row.profiles?.photos;
    const firstPhoto = Array.isArray(photos) && photos.length > 0 ? (photos[0] as { publicUrl?: string | null }) : null;
    return {
      id: row.id,
      userId: row.user_id,
      content: row.content,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      authorName: row.profiles?.display_name ?? null,
      authorAvatarUrl: firstPhoto?.publicUrl ?? null,
      createdAt: row.created_at,
    };
  });
}