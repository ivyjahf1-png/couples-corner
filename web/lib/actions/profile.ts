"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { validateMediaFile } from "@/lib/utils/media-upload";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import {
  completeOnboarding,
  createProfile,
  getOwnProfile,
  updateOwnProfile,
  type ProfileUpdateInput,
} from "@/lib/server/profiles";

export interface MediaUploadResult {
  ok: boolean;
  error?: string;
  data?: { id: string; publicUrl: string; storagePath: string };
}

export async function uploadUserMediaAction(
  userId: string,
  file: File,
  caption?: string
): Promise<MediaUploadResult> {
  try {
    await requireSessionUid(userId);
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Supabase not configured" };
    }

    const validationError = validateMediaFile(file);
    if (validationError) {
      return { ok: false, error: validationError };
    }

    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    const { data: maxRow, error: orderError } = await supabase
      .from("user_media")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orderError) {
      console.error("[user-media] lookup failed", orderError);
      return { ok: false, error: "Media storage is not ready. Contact support to check the database migration." };
    }
    const sortOrder = (maxRow?.sort_order ?? -1) + 1;

    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const ext = sanitized.split(".").pop() || (mediaType === "image" ? "jpg" : "mp4");
    const path = `${userId}/${Date.now()}_${sortOrder}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("user-media")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadErr) {
      return { ok: false, error: `Upload failed: ${uploadErr.message}` };
    }

    const { data: urlData } = supabase.storage.from("user-media").getPublicUrl(path);

    const { data: inserted, error: insertErr } = await supabase
      .from("user_media")
      .insert({
        user_id: userId,
        storage_path: path,
        media_type: mediaType,
        caption: caption ?? null,
        sort_order: sortOrder,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      await supabase.storage.from("user-media").remove([path]);
      return { ok: false, error: insertErr?.message ?? "Failed to save media record" };
    }

    revalidatePath("/profile");
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/feed");
    revalidatePath("/discover");

    return {
      ok: true,
      data: { id: inserted.id, publicUrl: urlData.publicUrl, storagePath: path },
    };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteUserMediaAction(
  mediaId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSessionUid(userId);
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Supabase not configured" };
    }

    const { data: media, error: fetchErr } = await supabase
      .from("user_media")
      .select("storage_path")
      .eq("id", mediaId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !media) {
      return { ok: false, error: "Media not found or access denied" };
    }

    const { error: storageErr } = await supabase.storage
      .from("user-media")
      .remove([media.storage_path]);

    if (storageErr) {
      return { ok: false, error: `Failed to delete file: ${storageErr.message}` };
    }

    const { error: dbErr } = await supabase
      .from("user_media")
      .delete()
      .eq("id", mediaId);

    if (dbErr) {
      return { ok: false, error: dbErr.message };
    }

    revalidatePath("/profile");
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/feed");
    revalidatePath("/discover");

    return { ok: true };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getPublicUserMedia(
  userId: string,
  limit = 50
): Promise<Array<{ id: string; publicUrl: string; mediaType: string; caption: string | null; sortOrder: number }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("user_media")
    .select("id, storage_path, media_type, caption, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((m) => {
    const { data: urlData } = supabase.storage.from("user-media").getPublicUrl(m.storage_path);
    return {
      id: m.id,
      publicUrl: urlData.publicUrl,
      mediaType: m.media_type,
      caption: m.caption,
      sortOrder: m.sort_order,
    };
  });
}

export type { ProfileUpdateInput };

async function requireSessionUid(uid: string): Promise<void> {
  const session = await getCurrentSessionUser();
  if (!session) throw new Error("Please sign in again");
  if (session.uid !== uid) throw new Error("You can only edit your own profile");
}

/** Fetch the signed-in user's own user + profile rows. */
export async function getOwnProfileAction(uid: string) {
  await requireSessionUid(uid);
  return getOwnProfile(uid);
}

/** Create the signed-in user's profile (first-time save). */
export async function createProfileAction(uid: string, input: ProfileUpdateInput) {
  await requireSessionUid(uid);
  try {
    const profile = await createProfile(uid, input);
    revalidatePath("/profile");
    revalidatePath(`/profile/${uid}`);
    revalidatePath("/discover");
    revalidatePath("/feed");
    return profile;
  } catch (err) {
    rethrowIfNavigation(err);
    throw err instanceof Error ? err : new Error("Failed to create profile");
  }
}

/** Update the signed-in user's own profile. */
export async function updateOwnProfileAction(uid: string, input: ProfileUpdateInput) {
  await requireSessionUid(uid);
  try {
    const profile = await updateOwnProfile(uid, input);
    revalidatePath("/profile");
    revalidatePath(`/profile/${uid}`);
    revalidatePath("/discover");
    revalidatePath("/feed");
    return profile;
  } catch (err) {
    rethrowIfNavigation(err);
    throw err instanceof Error ? err : new Error("Failed to update profile");
  }
}

export async function createFeedPostAction(
  userId: string,
  content: string,
  mediaUrls: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSessionUid(userId);
    const body = content.trim();
    if (!body && mediaUrls.length === 0) return { ok: false, error: "Add a caption or media before publishing." };
    if (body.length > 2200) return { ok: false, error: "Captions must be 2,200 characters or fewer." };
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };
    const { error } = await supabase.from("posts").insert({
      author_id: userId,
      content: body,
      media_urls: mediaUrls.slice(0, 4),
      visibility: "public",
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/feed");
    return { ok: true };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Unable to publish post" };
  }
}


export async function completeOnboardingAction(
  uid: string,
  input: Pick<ProfileUpdateInput, "displayName" | "gender" | "dateOfBirth">
): Promise<void> {
  await requireSessionUid(uid);
  try {
    if (!input.displayName?.trim()) throw new Error("Display name is required");
    await completeOnboarding(uid, {
      displayName: input.displayName.trim(),
      gender: input.gender ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
    });
    revalidatePath("/discover");
    revalidatePath("/profile");
  } catch (err) {
    rethrowIfNavigation(err);
    throw err instanceof Error ? err : new Error("Failed to complete onboarding");
  }
}

export async function getPublicFeed(cursor?: string, limit = 20): Promise<{
  posts: Array<{
    id: string;
    authorId: string;
    authorName: string | null;
    authorAvatar: string | null;
    content: string;
    mediaUrls: string[];
    createdAt: string;
  }>;
  nextCursor: string | null;
}> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { posts: [], nextCursor: null };

  let query = supabase
    .from("posts")
    .select(`
      id,
      content,
      media_urls,
      created_at,
      author:users!posts_author_id_fkey(id, display_name, avatar_url)
    `)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error || !data) return { posts: [], nextCursor: null };

  const posts = (data as unknown as Array<Record<string, unknown>>).map((row) => {
    const author = (row.author as Record<string, unknown> | null) ?? {};
    return {
      id: String(row.id),
      authorId: String(row.author_id ?? ""),
      authorName: (author.display_name as string) ?? null,
      authorAvatar: (author.avatar_url as string) ?? null,
      content: String(row.content ?? ""),
      mediaUrls: Array.isArray(row.media_urls) ? row.media_urls.filter(Boolean) : [],
      createdAt: String(row.created_at),
    };
  });

  const nextCursor = posts.length === limit ? posts[posts.length - 1]?.createdAt ?? null : null;

  return { posts, nextCursor };
}
