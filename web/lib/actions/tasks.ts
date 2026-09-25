"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/lib/server/session";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import {
  claimTaskReward,
  getUserTasks,
  publishMoment,
  toggleMomentReaction,
  addMomentComment,
  listMomentComments,
  type ClaimResult,
  type MomentResult,
  type TaskView,
} from "@/lib/server/tasks";
import type { MomentCommentView } from "@/lib/moments";
import { uploadUserMediaAction } from "@/lib/actions/profile";

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
 * Upload a moment (photo or short video) with a description and publish it.
 * The media is stored in Supabase Storage and the moment is syndicated to the
 * home discovery feed.
 */
export async function publishMomentAction(input: {
  file: File;
  content: string;
  taskSlug?: string | null;
}): Promise<MomentResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to publish" };

    const uploaded = await uploadUserMediaAction(user.uid, input.file, input.content);
    if (!uploaded.ok || !uploaded.data) {
      return { ok: false, error: uploaded.error ?? "Upload failed" };
    }

    const mediaType = input.file.type.startsWith("video/") ? "video" : "image";
    const result = await publishMoment(user.uid, {
      content: input.content,
      mediaUrl: uploaded.data.publicUrl,
      mediaType,
      taskSlug: input.taskSlug ?? null,
    });

    if (result.ok) {
      revalidatePath("/task");
      revalidatePath("/task/upload-moment");
      revalidatePath("/feed");
      revalidatePath("/");
    }
    return result;
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Publish failed" };
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
  kind?: "like" | "love" | "fire" | "laugh";
}): Promise<
  | { ok: true; reacted: boolean; count: number }
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