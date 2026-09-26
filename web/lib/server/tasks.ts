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
import { supabaseErrorDetail } from "@/lib/utils/supabase-error";
import { fetchAuthors } from "@/lib/server/profile-lookup";
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
      const { count, error: gateError } = await supabase
        .from("moments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("task_slug", slug)
        .gte("created_at", `${date}T00:00:00.000Z`);
      // A database without the optional `task_slug` column rejects the filter
      // outright; fail closed rather than unlocking a reward nobody earned.
      if (gateError) {
        console.error("[tasks] upload gate check failed", gateError);
        return { ok: false, error: "Could not verify your upload. Please try again." };
      }
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
 * Publish a moment whose media has ALREADY been uploaded to storage.
 *
 * WHY THIS EXISTS SEPARATELY FROM `publishMoment`:
 * the moment media is uploaded STRAIGHT FROM THE BROWSER to Supabase Storage
 * (see lib/utils/direct-upload.ts), and only this small JSON payload travels
 * through the Server Action. That is the whole fix for "An unexpected response
 * was received from the server" — see the note on the action in
 * lib/actions/tasks.ts for why sending the File through the action could never
 * work on Vercel.
 *
 * SECURITY: `storagePath` arrives from the client, so it is NOT trusted. It must
 * sit under this member's own folder. Without that check a member could publish
 * a moment pointing at ANY object in the bucket, including another member's
 * private media, by guessing or reading a path. The folder-prefix check is the
 * only thing enforcing ownership, because the service-role client bypasses RLS.
 */
export async function publishMomentFromStorage(
  userId: string,
  input: {
    storagePath: string;
    content: string;
    mediaType: "image" | "video";
    taskSlug?: string | null;
  }
): Promise<MomentResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const content = input.content.trim();
  if (!content) return { ok: false, error: "Add a description to your moment." };
  if (content.length > 2200) {
    return { ok: false, error: "Descriptions must be 2,200 characters or fewer" };
  }

  const path = (input.storagePath ?? "").trim();
  if (!path) return { ok: false, error: "The upload did not complete. Please try again." };

  // Ownership: first path segment must be the caller's uid.
  if (!path.startsWith(`${userId}/`)) {
    console.error("[moments] rejected foreign storage path", { userId, path });
    return { ok: false, error: "You can only publish your own media." };
  }

  // Reject traversal outright rather than relying on the prefix check alone:
  // `me/../other/file` starts with `me/` but resolves outside the folder.
  if (path.includes("..") || path.includes("\\")) {
    return { ok: false, error: "Invalid media path." };
  }

  const mediaType: "image" | "video" = input.mediaType === "video" ? "video" : "image";

  try {
    // Confirm the object really landed in the bucket. The client reports
    // success for its own upload, but a race (or a partial failure) can leave a
    // moment row pointing at a file that does not exist, which renders as a
    // broken image in the feed forever.
    const folder = path.slice(0, path.lastIndexOf("/"));
    const name = path.slice(path.lastIndexOf("/") + 1);
    const { data: found, error: listError } = await supabase.storage
      .from("user-media")
      .list(folder, { search: name, limit: 1 });

    if (listError) {
      console.error("[moments] storage existence check failed", listError);
      return {
        ok: false,
        error: `Could not verify the upload: ${listError.message}`,
      };
    }
    if (!found || found.length === 0) {
      return { ok: false, error: "The upload did not complete. Please try again." };
    }

    const publicUrl = supabase.storage.from("user-media").getPublicUrl(path).data.publicUrl;

    // The permanent-gallery link (REQUIREMENT: every published moment stays in the
    // member's profile gallery until they delete it).
    //
    // This used to be best-effort, which quietly violated that guarantee: if the
    // insert failed the moment still went live while the gallery row silently did
    // not, so the member could never find or delete their own upload. It is now a
    // hard precondition — if the gallery row cannot be written, the upload is
    // rolled back and nothing is published.
    const { data: maxRow } = await supabase
      .from("user_media")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = (maxRow?.sort_order ?? -1) + 1;

    const { error: mediaRowError } = await supabase.from("user_media").insert({
      user_id: userId,
      storage_path: path,
      media_type: mediaType,
      caption: content,
      sort_order: sortOrder,
    });
    if (mediaRowError) {
      console.error("[moments] user_media link failed, rolling back", mediaRowError);
      // Remove the uploaded object: it is now unreferenced and unreachable from
      // the UI, so leaving it would burn storage forever.
      const { error: cleanupError } = await supabase.storage
        .from("user-media")
        .remove([path]);
      if (cleanupError) {
        console.error("[moments] rollback cleanup failed", cleanupError);
      }
      return {
        ok: false,
        error: `Could not save this to your profile: ${mediaRowError.message}`,
      };
    }

    // The moments row. Only real columns: user_id, media_url, media_type and the
    // text column. `task_slug` is deliberately NOT written — on a database
    // predating migration 030/032 that column does not exist and its presence in
    // the payload fails the whole insert.
    const row: Record<string, unknown> = {
      user_id: userId,
      media_url: publicUrl,
      media_type: mediaType,
    };
    row[MOMENT_TEXT_COLUMN] = content;

    const { data, error } = await supabase
      .from("moments")
      .insert(row)
      .select("id, media_url")
      .single();

    if (error || !data) {
      console.error("[moments] publish insert failed", error);
      // Roll back the gallery row created above. Publishing must be all-or-
      // nothing: a gallery entry with no moment is an orphan the member can see
      // but never explain, which is the mirror image of the bug above.
      const { error: rollbackError } = await supabase
        .from("user_media")
        .delete()
        .eq("user_id", userId)
        .eq("storage_path", path);
      if (rollbackError) {
        console.error("[moments] gallery rollback failed", rollbackError);
      }
      return {
        ok: false,
        error: error
          ? `Could not publish your moment: ${error.message}`
          : "Could not publish your moment. Please try again.",
      };
    }

    return {
      ok: true,
      momentId: (data as { id: string }).id,
      mediaUrl: (data as { media_url: string }).media_url,
    };
  } catch (error) {
    console.error("[moments] publish server error:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Could not publish your moment: ${error.message}`
          : "Could not publish your moment. Please try again.",
    };
  }
}

/**
 * Recent public moments, newest first, syndicated to the home discovery feed.
 *
 * ── WHY THE AUTHOR JOIN IS DONE IN CODE, NOT IN THE SELECT ───────────────────
 * This used to read the author with a PostgREST embed:
 *
 *   .select("..., profiles(display_name, photos)")
 *
 * PostgREST can only resolve an embedded resource through a DECLARED FOREIGN
 * KEY. `moments.user_id` references `auth.users(id)` (migration 034) and
 * `profiles.user_id` is merely UNIQUE (migration 005) — there is no foreign key
 * from `moments` to `profiles`, so PostgREST rejects the relationship and fails
 * the ENTIRE query with "Could not find a relationship between 'moments' and
 * 'profiles' in the schema cache".
 *
 * That failure was invisible: the result was destructured to `{ data: rows }`
 * with the `error` discarded, so `rows` was null, `rows ?? []` produced an empty
 * array, and the home feed rendered "No moments yet" while the same rows were
 * perfectly readable without the embed. Uploads were unaffected, which is why
 * it presented as "I uploaded a video but the feed is empty".
 *
 * So the author data is fetched in its own query and stitched in JS. This is
 * also the same shape already used for reactions/comments below, and it keeps
 * working whether or not a moments -> profiles FK exists.
 *
 * Every query here now logs its error. A silently swallowed PostgREST error is
 * indistinguishable from "there is genuinely nothing to show", which is exactly
 * what made this bug so hard to see.
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

  // One query for the moments themselves — no embed, so no dependency on a
  // moments -> profiles relationship that does not exist.
  const { data: momentRows, error: momentsError } = await supabase
    .from("moments")
    .select("id, user_id, content, media_url, media_type, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (momentsError) {
    console.error("[moments] feed query failed", supabaseErrorDetail(momentsError));
    return [];
  }

  const rows = (momentRows ?? []) as Array<{
    id: string;
    user_id: string;
    content: string;
    media_url: string;
    media_type: "image" | "video";
    created_at: string;
  }>;
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

  const [reactionsResult, commentsResult, authors] = await Promise.all([
    supabase.from("moment_reactions").select("moment_id, user_id").in("moment_id", ids),
    supabase.from("moment_comments").select("moment_id").in("moment_id", ids),
    fetchAuthors(rows.map((row) => row.user_id)),
  ]);

  // Engagement tables are optional (migration 036 may be unapplied), so their
  // failures only zero the counters rather than emptying the feed.
  if (reactionsResult.error) {
    console.error("[moments] reactions query failed", supabaseErrorDetail(reactionsResult.error));
  }
  if (commentsResult.error) {
    console.error("[moments] comments query failed", supabaseErrorDetail(commentsResult.error));
  }

  const reactionCounts = new Map<string, number>();
  const reactedBy = new Set<string>();
  for (const raw of reactionsResult.data ?? []) {
    const r = raw as { moment_id?: string | null; user_id?: string | null };
    if (!r.moment_id) continue;
    reactionCounts.set(r.moment_id, (reactionCounts.get(r.moment_id) ?? 0) + 1);
    if (viewerId && r.user_id === viewerId) reactedBy.add(r.moment_id);
  }

  const commentCounts = new Map<string, number>();
  for (const raw of commentsResult.data ?? []) {
    const c = raw as { moment_id?: string | null };
    if (!c.moment_id) continue;
    commentCounts.set(c.moment_id, (commentCounts.get(c.moment_id) ?? 0) + 1);
  }

  return rows.map((row) => {
    const author = authors.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      content: row.content,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      authorName: author?.displayName ?? null,
      authorAvatarUrl: author?.avatarUrl ?? null,
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

  // No `profiles(...)` embed here — see lib/server/profile-lookup.ts. The
  // embed made PostgREST reject the whole query (no FK from moment_comments to
  // profiles), so posting a comment failed outright.
  const { data, error } = await supabase
    .from("moment_comments")
    .insert({ moment_id: momentId, user_id: userId, body })
    .select("id, user_id, body, created_at")
    .single();
  if (error || !data) {
    console.error("[moments] comment insert failed", supabaseErrorDetail(error));
    return { ok: false, error: "Could not post your comment" };
  }

  const row = data as {
    id: string;
    user_id: string;
    body: string;
    created_at: string;
  };

  const authors = await fetchAuthors([row.user_id]);
  const author = authors.get(row.user_id);

  return {
    ok: true,
    comment: {
      id: row.id,
      userId: row.user_id,
      authorName: author?.displayName ?? null,
      body: row.body,
      createdAt: row.created_at,
    },
  };
}

/** Comments on a moment, oldest first (conversation order). */
export async function listMomentComments(momentId: string, limit = 50): Promise<MomentCommentView[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  // Same embed caveat as above: a `profiles(...)` select here returned nothing
  // at all, so the comment sheet was permanently empty.
  const { data, error } = await supabase
    .from("moment_comments")
    .select("id, user_id, body, created_at")
    .eq("moment_id", momentId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[moments] comment list failed", supabaseErrorDetail(error));
    return [];
  }

  const rows = (data ?? []) as Array<{
    id: string;
    user_id: string;
    body: string;
    created_at: string;
  }>;
  if (rows.length === 0) return [];

  const authors = await fetchAuthors(rows.map((row) => row.user_id));

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    authorName: authors.get(row.user_id)?.displayName ?? null,
    body: row.body,
    createdAt: row.created_at,
  }));
}