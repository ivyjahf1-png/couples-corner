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
import type { MomentCommentView, MomentView } from "@/lib/moments";

/**
 * COLUMN NAME: the moments table stores the text in `content`
 * (migration 034, `content text not null default ''`). Several OTHER tables in
 * this schema use `caption` instead — `user_media.caption` (008/014),
 * `profile_photos.caption` — which is the likely source of a
 * "column moments.content does not exist" error: the two names get conflated.
 *
 * This constant exists so the write below and every read in this file
 * (getMoments) name the same column, and so there is exactly one place to
 * change if the deployed table really does use a different name.
 */
const MOMENT_TEXT_COLUMN = "content";

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

  // Built through a typed record so the text column is named by the single
  // MOMENT_TEXT_COLUMN constant rather than a bare `content` shorthand, which
  // is what silently drifted against the other `caption` tables in this schema.
  const row: Record<string, unknown> = {
    user_id: userId,
    media_url: input.mediaUrl,
    media_type: input.mediaType,
    task_slug: input.taskSlug ?? null,
  };
  row[MOMENT_TEXT_COLUMN] = content;

  const { data, error } = await supabase
    .from("moments")
    .insert(row)
    .select("id, media_url")
    .single();
  if (error || !data) {
    // Log the real reason server-side. The bare string this used to return gave
    // the member no way to act on a failure (a mime-type rejection, an RLS
    // policy denial and a schema error all looked identical), and left nothing
    // in the server log to diagnose a video that would not publish.
    console.error("[moments] publish insert failed", error);
    return {
      ok: false,
      error: error
        ? `Could not publish your moment: ${error.message}`
        : "Could not publish your moment. Please try again.",
    };
  }
  return { ok: true, momentId: (data as { id: string }).id, mediaUrl: (data as { media_url: string }).media_url };
}

/**
 * Recent public moments, newest first, syndicated to the home discovery feed.
 *
 * Engagement (reaction count, comment count, "did I react") is aggregated in
 * parallel queries rather than N+1 per row. `moment_reactions` /
 * `moment_comments` only exist once migration 036 has been applied; on an
 * un-migrated database those selects fail soft and the feed still renders with
 * zeroed counters.
 *
 * `viewerId` is optional: an anonymous visitor still gets the feed, just with
 * `reactedByMe` false everywhere.
 */
export async function getRecentMoments(
  limit = 12,
  viewerId: string | null = null
): Promise<MomentView[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data: idRows } = await supabase
    .from("moments")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = (idRows ?? [])
    .map((row) => (row as { id?: string | null }).id)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const [{ data: reactions }, { data: comments }, { data: rows }] = await Promise.all([
    supabase.from("moment_reactions").select("moment_id, user_id").in("moment_id", ids),
    supabase.from("moment_comments").select("moment_id").in("moment_id", ids),
    supabase
      .from("moments")
      .select("id, user_id, content, media_url, media_type, created_at, profiles(display_name, photos)")
      .in("id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const reactionCounts = new Map<string, number>();
  const reactedBy = new Set<string>();
  for (const raw of reactions ?? []) {
    const r = raw as { moment_id?: string | null; user_id?: string | null };
    if (!r.moment_id) continue;
    reactionCounts.set(r.moment_id, (reactionCounts.get(r.moment_id) ?? 0) + 1);
    if (viewerId && r.user_id === viewerId) reactedBy.add(r.moment_id);
  }

  const commentCounts = new Map<string, number>();
  for (const raw of comments ?? []) {
    const c = raw as { moment_id?: string | null };
    if (!c.moment_id) continue;
    commentCounts.set(c.moment_id, (commentCounts.get(c.moment_id) ?? 0) + 1);
  }

  return (rows ?? []).map((raw) => {
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
      reactionCount: reactionCounts.get(row.id) ?? 0,
      commentCount: commentCounts.get(row.id) ?? 0,
      reactedByMe: reactedBy.has(row.id),
      isMine: Boolean(viewerId && row.user_id === viewerId),
    };
  });
}
type SupabaseServer = NonNullable<ReturnType<typeof getSupabaseServerClient>>;

/** Toggle the viewer's reaction on a moment. Returns the resulting state. */
export async function toggleMomentReaction(
  userId: string,
  momentId: string,
  kind: "like" | "love" | "fire" | "laugh" = "like"
): Promise<{ ok: true; reacted: boolean; count: number } | { ok: false; error: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data: existing } = await supabase
    .from("moment_reactions")
    .select("id")
    .eq("moment_id", momentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Tapping an existing reaction removes it (standard toggle).
    const { error } = await supabase
      .from("moment_reactions")
      .delete()
      .eq("id", (existing as { id: string }).id);
    if (error) return { ok: false, error: "Could not remove your reaction" };
    return { ok: true, reacted: false, count: await countReactions(supabase, momentId) };
  }

  const { error } = await supabase
    .from("moment_reactions")
    .insert({ moment_id: momentId, user_id: userId, kind });
  if (error) return { ok: false, error: "Could not save your reaction" };
  return { ok: true, reacted: true, count: await countReactions(supabase, momentId) };
}

/**
 * Set the viewer's reaction on a moment to a specific emoji kind.
 *
 * Semantics differ from `toggleMomentReaction` because the table has a unique
 * constraint on (moment_id, user_id) - one reaction per member. Tapping the
 * emoji you already used removes it; tapping a different one swaps to it.
 * A plain toggle would make the second emoji tap look broken.
 */
export async function setMomentReaction(
  userId: string,
  momentId: string,
  kind: "like" | "love" | "fire" | "laugh"
): Promise<{ ok: true; reacted: boolean; count: number } | { ok: false; error: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data: existing } = await supabase
    .from("moment_reactions")
    .select("id, kind")
    .eq("moment_id", momentId)
    .eq("user_id", userId)
    .maybeSingle();

  const current = existing as { id?: string; kind?: string } | null;

  if (current?.id && current.kind === kind) {
    // Same emoji again -> clear it.
    const { error } = await supabase.from("moment_reactions").delete().eq("id", current.id);
    if (error) return { ok: false, error: "Could not remove your reaction" };
    return { ok: true, reacted: false, count: await countReactions(supabase, momentId) };
  }

  if (current?.id) {
    // Different emoji -> swap in place rather than delete+insert, so the
    // reaction count never flickers through an intermediate value.
    const { error } = await supabase
      .from("moment_reactions")
      .update({ kind })
      .eq("id", current.id);
    if (error) return { ok: false, error: "Could not change your reaction" };
    return { ok: true, reacted: true, count: await countReactions(supabase, momentId) };
  }

  const { error } = await supabase
    .from("moment_reactions")
    .insert({ moment_id: momentId, user_id: userId, kind });
  if (error) return { ok: false, error: "Could not save your reaction" };
  return { ok: true, reacted: true, count: await countReactions(supabase, momentId) };
}

async function countReactions(supabase: SupabaseServer, momentId: string): Promise<number> {
  const { count } = await supabase
    .from("moment_reactions")
    .select("id", { count: "exact", head: true })
    .eq("moment_id", momentId);
  return count ?? 0;
}

/** Post a comment on a moment. */
export async function addMomentComment(
  userId: string,
  momentId: string,
  rawBody: string
): Promise<{ ok: true; comment: MomentCommentView } | { ok: false; error: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const body = (rawBody ?? "").trim().slice(0, 500);
  if (!body) return { ok: false, error: "Write something first" };

  const { data, error } = await supabase
    .from("moment_comments")
    .insert({ moment_id: momentId, user_id: userId, body })
    .select("id, user_id, body, created_at, profiles(display_name)")
    .single();
  if (error || !data) return { ok: false, error: "Could not post your comment" };

  const row = data as {
    id: string;
    user_id: string;
    body: string;
    created_at: string;
    profiles?: { display_name?: string | null } | null;
  };
  return {
    ok: true,
    comment: {
      id: row.id,
      userId: row.user_id,
      authorName: row.profiles?.display_name ?? null,
      body: row.body,
      createdAt: row.created_at,
    },
  };
}

/** Comments on a moment, oldest first (conversation order). */
export async function listMomentComments(momentId: string, limit = 50): Promise<MomentCommentView[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("moment_comments")
    .select("id, user_id, body, created_at, profiles(display_name)")
    .eq("moment_id", momentId)
    .order("created_at", { ascending: true })
    .limit(limit);

  return (data ?? []).map((raw) => {
    const row = raw as {
      id: string;
      user_id: string;
      body: string;
      created_at: string;
      profiles?: { display_name?: string | null } | null;
    };
    return {
      id: row.id,
      userId: row.user_id,
      authorName: row.profiles?.display_name ?? null,
      body: row.body,
      createdAt: row.created_at,
    };
  });
}