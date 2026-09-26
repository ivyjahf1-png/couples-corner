"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/lib/server/session";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import {
  claimTaskReward,
  getUserTasks,
  publishMomentFromStorage,
  toggleMomentReaction,
  setMomentReaction,
  addMomentComment,
  listMomentComments,
  type ClaimResult,
  type MomentResult,
  type TaskView,
} from "@/lib/server/tasks";
import type { MomentCommentView, ReactionKind, ReactionTally } from "@/lib/moments";

/** Today's task list for the signed-in user. */
export async function getUserTasksAction(): Promise<TaskView[]> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return [];
    return await getUserTasks(user.uid);
  } catch (err) {
    rethrowIfNavigation(err);
    return [];
  }
}

/** Claim a task reward (server-authoritative amount). */
export async function claimTaskAction(slug: string): Promise<ClaimResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to claim rewards" };
    const result = await claimTaskReward(user.uid, slug);
    if (result.ok) {
      revalidatePath("/task");
      revalidatePath("/profile");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Claim failed" };
  }
}

/**
 * Publish a moment whose media the browser has ALREADY uploaded to storage.
 *
 * ── WHY THERE IS NO `file` PARAMETER HERE ────────────────────────────────────
 * This action used to take the whole `File` and forward it to
 * `uploadUserMediaAction`, which sent the entire video as the Server Action
 * request body. On Vercel that fails for anything over 4.5 MB:
 *
 *   1. The platform rejects the request with 413 FUNCTION_PAYLOAD_TOO_LARGE
 *      BEFORE this function body executes. `experimental.serverActions
 *      .bodySizeLimit` in next.config.ts cannot raise it — 4.5 MB is a Vercel
 *      platform limit, not a Next.js one.
 *   2. The 413 response is neither an RSC payload nor text/plain, so Next's
 *      action client cannot parse it and throws error E394:
 *      "An unexpected response was received from the server".
 *   3. Because step 1 happens before this function runs, the try/catch below
 *      never executes and no server-side log is ever produced. That is the
 *      signature of this bug: a failure with no server-side trace.
 *
 * The bytes now go browser -> Supabase Storage directly (lib/utils/
 * direct-upload.ts), and only this small JSON payload crosses the action
 * boundary. Keep it that way: adding the file back reintroduces the 413, and
 * no amount of error handling here can catch it.
 */
export async function publishMomentAction(input: {
  storagePath: string;
  content: string;
  mediaType: "image" | "video";
  taskSlug?: string | null;
}): Promise<MomentResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to publish" };

    const result = await publishMomentFromStorage(user.uid, {
      storagePath: input.storagePath,
      content: input.content,
      mediaType: input.mediaType,
      taskSlug: input.taskSlug ?? null,
    });

    if (result.ok) {
      revalidatePath("/task");
      revalidatePath("/task/upload-moment");
      revalidatePath("/feed");
      revalidatePath("/profile");
      revalidatePath("/");
    }
    return result;
  } catch (err) {
    // rethrowIfNavigation first: redirect()/notFound() throw a sentinel that
    // Next must see. Swallowing it here would turn a redirect into a silent
    // error toast on the upload screen.
    rethrowIfNavigation(err);
    console.error("[moments] publish action failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Publish failed",
    };
  }
}

/**
 * Toggle a reaction on a moment from the home media feed.
 *
 * Revalidates "/" because the feed's reaction counts are server-rendered; the
 * client also applies an optimistic update, so this is the reconciliation.
 */
export async function toggleMomentReactionAction(params: {
  momentId: string;
  kind?: ReactionKind;
}): Promise<
  | { ok: true; reacted: boolean; count: number; kinds: ReactionTally }
  | { ok: false; error: string }
> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to react" };
    const result = await toggleMomentReaction(user.uid, params.momentId, params.kind ?? "like");
    if (result.ok) revalidatePath("/");
    return result;
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not react" };
  }
}

/** Set (or swap, or clear) the viewer's emoji reaction on a moment. */
export async function setMomentReactionAction(params: {
  momentId: string;
  kind: ReactionKind;
}): Promise<
  | { ok: true; reacted: boolean; count: number; kinds: ReactionTally }
  | { ok: false; error: string }
> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to react" };
    const result = await setMomentReaction(user.uid, params.momentId, params.kind);
    if (result.ok) revalidatePath("/");
    return result;
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not react" };
  }
}

/** Read the comments on a moment (used when the sheet opens). */
export async function getMomentCommentsAction(
  momentId: string
): Promise<MomentCommentView[]> {
  try {
    await getCurrentSessionUser();
    return await listMomentComments(momentId);
  } catch (err) {
    rethrowIfNavigation(err);
    return [];
  }
}

/** Post a comment on a moment from the home media feed. */
export async function addMomentCommentAction(params: {
  momentId: string;
  body: string;
}): Promise<
  | { ok: true; comment: MomentCommentView }
  | { ok: false; error: string }
> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to comment" };
    const result = await addMomentComment(user.uid, params.momentId, params.body);
    if (result.ok) revalidatePath("/");
    return result;
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not comment" };
  }
}