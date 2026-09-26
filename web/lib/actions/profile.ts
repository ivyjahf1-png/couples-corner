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
  linkProfilePhoto,
  type ProfileUpdateInput,
} from "@/lib/server/profiles";
import { publishMoment } from "@/lib/server/tasks";

export interface MediaUploadResult {
  ok: boolean;
  error?: string;
  data?: { id: string; publicUrl: string; storagePath: string };
}

/**
 * DEPRECATED — do not call this for new code.
 *
 * This action receives the whole `File` as a Server Action request body, so it
 * cannot work for anything over Vercel's 4.5 MB function body limit: the request
 * is rejected with 413 before this function body runs, and the action client
 * throws E394 ("An unexpected response was received from the server"). No
 * error handling here can catch that, because the code never executes.
 *
 * It is retained only because `web/scripts/test-profile-photo.cjs` exercises it
 * directly. New callers must use the two-step flow instead:
 *
 *   1. `uploadFileDirect(uid, file, ...)` in lib/utils/direct-upload.ts — the
 *      bytes go browser -> Supabase Storage, no function in the path.
 *   2. `recordUserMediaAction({ userId, storagePath, mediaType, caption })` —
 *      a few hundred bytes of JSON that writes the database row.
 */
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

    /**
     * Some devices (notably older Android pickers) hand us a File whose `type`
     * is EMPTY for video. Passing that straight through uploads the object as
     * `application/octet-stream`, which the bucket's `allowed_mime_types` list
     * rejects — an opaque failure, and a stall before this fix. Falling back to
     * the extension yields a type the allowlist accepts and matches what the
     * object will actually be served as.
     */
    const EXT_MIME: Record<string, string> = {
      mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime",
      webm: "video/webm", ogv: "video/ogg", mpeg: "video/mpeg",
      mpg: "video/mpeg", avi: "video/x-msvideo", mkv: "video/x-matroska",
      "3gp": "video/3gpp",
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      webp: "image/webp", gif: "image/gif", avif: "image/avif",
      heic: "image/heic", heif: "image/heif", bmp: "image/bmp",
      tif: "image/tiff", tiff: "image/tiff",
    };
    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const rawExt = (sanitized.split(".").pop() ?? "").toLowerCase();
    const ext = rawExt || "jpg";
    const contentType = file.type || EXT_MIME[ext] || "application/octet-stream";
    // Derived from the RESOLVED type, not file.type: an empty file.type made
    // `.startsWith("video/")` false and filed every video as an image, which
    // then rendered as a broken <img> in the feed.
    const mediaType: "image" | "video" = contentType.startsWith("video/") ? "video" : "image";

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

    const path = `${userId}/${Date.now()}_${sortOrder}.${ext}`;

    // No chunking here on purpose: the File already arrived whole in the action
    // body, and the bucket rejects multipart uploads under ~6 MB. Content-Type
    // is the part that actually mattered and is now guaranteed non-empty.
    const { error: uploadErr } = await supabase.storage
      .from("user-media")
      .upload(path, file, { contentType, upsert: false });

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

/**
 * Record a `user_media` row for a file the browser has ALREADY uploaded.
 *
 * This is the second half of every direct upload. `uploadUserMediaAction` above
 * combined "upload bytes + write row" and so had to receive the File through the
 * Server Action, which capped it at Vercel's 4.5 MB function body limit. The
 * bytes now go browser -> storage via lib/utils/direct-upload.ts, and only this
 * small JSON payload crosses the action boundary.
 *
 * SECURITY: `storagePath` is client-supplied and is therefore NOT trusted. It
 * must sit under the caller's own folder; without that check a member could
 * register someone else's private media in their own gallery. The service-role
 * client bypasses RLS, so this check is the only thing enforcing ownership.
 *
 * Idempotent per path: re-recording the same path returns the existing row rather
 * than creating a duplicate, so a retry after a dropped response is safe.
 */
export async function recordUserMediaAction(params: {
  userId: string;
  storagePath: string;
  mediaType: "image" | "video";
  caption?: string;
}): Promise<MediaUploadResult> {
  try {
    await requireSessionUid(params.userId);

    const path = (params.storagePath ?? "").trim();
    if (!path.startsWith(`${params.userId}/`) || path.includes("..") || path.includes("\\")) {
      console.error("[user-media] rejected foreign storage path", {
        userId: params.userId,
        path,
      });
      return { ok: false, error: "You can only add your own media." };
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    const mediaType: "image" | "video" = params.mediaType === "video" ? "video" : "image";

    // Already recorded (retry after a lost response): return it untouched.
    const { data: existing } = await supabase
      .from("user_media")
      .select("id, storage_path")
      .eq("user_id", params.userId)
      .eq("storage_path", path)
      .limit(1)
      .maybeSingle();
    if (existing) {
      const url = supabase.storage.from("user-media").getPublicUrl(path).data.publicUrl;
      return {
        ok: true,
        data: {
          id: (existing as { id: string }).id,
          publicUrl: url,
          storagePath: path,
        },
      };
    }

    // Confirm the object is really in the bucket before recording it, so the
    // gallery can never list a file that 404s.
    const folder = path.slice(0, path.lastIndexOf("/"));
    const name = path.slice(path.lastIndexOf("/") + 1);
    const { data: found, error: listError } = await supabase.storage
      .from("user-media")
      .list(folder, { search: name, limit: 1 });
    if (listError) {
      return { ok: false, error: `Could not verify the upload: ${listError.message}` };
    }
    if (!found || found.length === 0) {
      return { ok: false, error: "The upload did not complete. Please try again." };
    }

    const { data: maxRow, error: orderError } = await supabase
      .from("user_media")
      .select("sort_order")
      .eq("user_id", params.userId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orderError) {
      console.error("[user-media] sort_order lookup failed", orderError);
      return { ok: false, error: "Media storage is not ready. Contact support to check the database migration." };
    }
    const sortOrder = (maxRow?.sort_order ?? -1) + 1;

    const { data: inserted, error: insertErr } = await supabase
      .from("user_media")
      .insert({
        user_id: params.userId,
        storage_path: path,
        media_type: mediaType,
        caption: params.caption?.trim() ? params.caption.trim() : null,
        sort_order: sortOrder,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error("[user-media] record failed", insertErr);
      return { ok: false, error: insertErr?.message ?? "Failed to save media record" };
    }

    const url = supabase.storage.from("user-media").getPublicUrl(path).data.publicUrl;

    revalidatePath("/profile");
    revalidatePath(`/profile/${params.userId}`);
    revalidatePath("/feed");
    revalidatePath("/discover");

    return {
      ok: true,
      data: { id: inserted.id, publicUrl: url, storagePath: path },
    };
  } catch (err) {
    rethrowIfNavigation(err);
    console.error("[user-media] record action failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Point the signed-in member's profile at a photo they already uploaded to the
 * `photos` bucket.
 *
 * The counterpart to the direct upload in ProfilePhotoUploader: the file goes
 * straight to storage, this only writes the profile row. Ownership of the path is
 * re-checked server-side.
 */
export async function setProfilePhotoAction(params: {
  userId: string;
  storagePath: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await requireSessionUid(params.userId);
    const result = await linkProfilePhoto(params.userId, params.storagePath);
    revalidatePath("/profile");
    revalidatePath(`/profile/${params.userId}`);
    return { ok: true, url: result.url };
  } catch (err) {
    rethrowIfNavigation(err);
    console.error("[profile-photo] link action failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't set your profile photo.",
    };
  }
}

/**
 * Publish an existing profile-gallery item to the community Moments feed.
 *
 * Deliberately OPT-IN rather than automatic: a profile gallery is a private-ish
 * space, and silently syndicating every upload to a public feed would broadcast
 * media the member never agreed to share. The member presses "Share to feed",
 * which creates the `moments` row and leaves the gallery item untouched.
 *
 * Ownership is enforced here, not trusted from the client: the media row must
 * belong to the signed-in member.
 */
export async function shareUserMediaToFeedAction(
  mediaId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to share" };

    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    // Scoped by user_id so one member cannot publish someone else's media.
    const { data: media, error: mediaError } = await supabase
      .from("user_media")
      .select("storage_path, media_type, caption")
      .eq("id", mediaId)
      .eq("user_id", user.uid)
      .maybeSingle();
    if (mediaError || !media) {
      return { ok: false, error: "That photo could not be found" };
    }

    const row = media as { storage_path?: string | null; media_type?: string | null; caption?: string | null };
    if (!row.storage_path) return { ok: false, error: "That photo has no stored file" };

    const { data: urlData } = supabase.storage.from("user-media").getPublicUrl(row.storage_path);

    const result = await publishMoment(user.uid, {
      content: row.caption?.trim() ?? "",
      mediaUrl: urlData.publicUrl,
      mediaType: row.media_type === "video" ? "video" : "image",
      taskSlug: null,
    });
    if (!result.ok) return { ok: false, error: result.error };

    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath("/profile");
    return { ok: true };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not share" };
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

    // Also remove any moment published from this file.
    //
    // A moment stores the file's public URL, not a foreign key back to
    // user_media, so deleting the gallery row alone leaves a moment in the feed
    // pointing at a file that no longer exists — a permanently broken card that
    // no amount of retrying will fix. Deleting "the media" has to mean the
    // moment too, otherwise the item is only half deleted.
    const publicUrl = supabase.storage
      .from("user-media")
      .getPublicUrl(media.storage_path).data.publicUrl;
    const { error: momentErr } = await supabase
      .from("moments")
      .delete()
      .eq("user_id", userId)
      .eq("media_url", publicUrl);
    if (momentErr) {
      // The storage object and gallery row are already gone, so this cannot be
      // rolled back. Log loudly rather than reporting a failure the member
      // cannot act on, and let them know a stray moment may remain.
      console.error("[user-media] orphaned moment after delete", {
        userId,
        publicUrl,
        ...momentErr,
      });
      return {
        ok: false,
        error: "File deleted, but a feed post still references it. Please contact support.",
      };
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

// ============================ STORIES =====================================

export interface StoryView {
  id: string;
  userId: string;
  url: string;
  mediaType: "image" | "video";
  caption: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  createdAt: string;
  expiresAt: string;
  reactionCount: number;
  commentCount: number;
  /** True when the VIEWER has already reacted (drives the filled heart). */
  reactedByViewer: boolean;
}

/** Upload a 24-hour status. Reuses the user-media bucket and validation. */
export async function createStoryAction(
  file: File,
): Promise<{ ok: true; story: StoryView } | { ok: false; error: string }> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to post a story" };

    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    const invalid = validateMediaFile(file);
    if (invalid) return { ok: false, error: invalid };

    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const ext = (file.name.split(".").pop() || (mediaType === "image" ? "jpg" : "mp4"))
      .replace(/[^a-zA-Z0-9]/g, "");
    // "stories/" prefix keeps status files separable from the permanent gallery.
    const path = `stories/${user.uid}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("user-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadErr) return { ok: false, error: `Upload failed: ${uploadErr.message}` };

    // expires_at is set HERE, server-side, at insert. The client never sends
    // it, so a tampered payload cannot create a story that never expires.
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: inserted, error: insertErr } = await supabase
      .from("stories")
      .insert({
        user_id: user.uid,
        storage_path: path,
        media_type: mediaType,
        caption: null,
        expires_at: expiresAt,
      })
      .select("id, created_at, expires_at")
      .single();

    if (insertErr || !inserted) {
      // Roll the orphaned object back so a failed insert never leaks storage.
      await supabase.storage.from("user-media").remove([path]);
      return { ok: false, error: insertErr?.message ?? "Could not save your story" };
    }

    const { data: urlData } = supabase.storage.from("user-media").getPublicUrl(path);
    revalidatePath("/messages");
    return {
      ok: true,
      story: {
        id: inserted.id,
        userId: user.uid,
        url: urlData.publicUrl,
        mediaType,
        caption: null,
        authorName: null,
        authorAvatarUrl: null,
        createdAt: inserted.created_at,
        expiresAt: inserted.expires_at ?? expiresAt,
        reactionCount: 0,
        commentCount: 0,
        reactedByViewer: false,
      },
    };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not post your story" };
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
/**
 * Active stories for the tray, newest first.
 *
 * The 24-hour filter is applied HERE as well as in the RLS policy, so a lapsed
 * story can never reach the client even if the policy were widened later.
 */
export async function getActiveStoriesAction(): Promise<
  { ok: true; stories: StoryView[] } | { ok: false; error: string }
> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to see stories" };
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("stories")
      .select(
        "id, user_id, storage_path, media_type, caption, created_at, expires_at, profiles(display_name, photos)"
      )
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { ok: false, error: error.message };

    const rows = (data ?? []) as Array<{
      id: string; user_id: string; storage_path: string; media_type: string;
      caption: string | null; created_at: string; expires_at: string;
      profiles?: { display_name?: string | null; photos?: unknown } | null;
    }>;
    if (!rows.length) return { ok: true, stories: [] };

    const ids = rows.map((r) => r.id);
    const [{ data: reactions }, { data: comments }] = await Promise.all([
      supabase.from("story_reactions").select("story_id, user_id").in("story_id", ids),
      supabase.from("story_comments").select("story_id").in("story_id", ids),
    ]);

    const counts = new Map<string, number>();
    const mine = new Set<string>();
    for (const r of (reactions ?? []) as Array<{ story_id?: string; user_id?: string }>) {
      if (!r.story_id) continue;
      counts.set(r.story_id, (counts.get(r.story_id) ?? 0) + 1);
      if (r.user_id === user.uid) mine.add(r.story_id);
    }
    const commentCounts = new Map<string, number>();
    for (const c of (comments ?? []) as Array<{ story_id?: string }>) {
      if (!c.story_id) continue;
      commentCounts.set(c.story_id, (commentCounts.get(c.story_id) ?? 0) + 1);
    }

    return {
      ok: true,
      stories: rows.map((row) => {
        const photos = row.profiles?.photos;
        const first = Array.isArray(photos) && photos.length
          ? (photos[0] as { publicUrl?: string | null })
          : null;
        return {
          id: row.id,
          userId: row.user_id,
          url: supabase.storage.from("user-media").getPublicUrl(row.storage_path).data.publicUrl,
          mediaType: row.media_type === "video" ? "video" : "image",
          caption: row.caption,
          authorName: row.profiles?.display_name ?? null,
          authorAvatarUrl: first?.publicUrl ?? null,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          reactionCount: counts.get(row.id) ?? 0,
          commentCount: commentCounts.get(row.id) ?? 0,
          reactedByViewer: mine.has(row.id),
        };
      }),
    };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not load stories" };
  }
}

/** Toggle the viewer's like on a story. */
export async function toggleStoryReactionAction(
  storyId: string
): Promise<{ ok: true; reacted: boolean; count: number } | { ok: false; error: string }> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to react" };
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    const { data: existing } = await supabase
      .from("story_reactions")
      .select("id")
      .eq("story_id", storyId)
      .eq("user_id", user.uid)
      .maybeSingle();

    if (existing) {
      await supabase.from("story_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("story_reactions").insert({ story_id: storyId, user_id: user.uid });
    }
    const { count } = await supabase
      .from("story_reactions")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId);
    return { ok: true, reacted: !existing, count: count ?? 0 };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not react" };
  }
}

/** Comments for one story, with the author's display name joined in. */
export async function getStoryCommentsAction(
  storyId: string
): Promise<
  | { ok: true; comments: Array<{ id: string; body: string; authorName: string; createdAt: string }> }
  | { ok: false; error: string }
> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("story_comments")
      .select("id, body, created_at, user_id, profiles(display_name)")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      comments: ((data ?? []) as Array<{
        id: string; body: string; created_at: string;
        profiles?: { display_name?: string | null } | null;
      }>).map((c) => ({
        id: c.id,
        body: c.body,
        authorName: c.profiles?.display_name ?? "Member",
        createdAt: c.created_at,
      })),
    };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not load comments" };
  }
}

/** Post a comment on a story. */
export async function addStoryCommentAction(
  storyId: string,
  body: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to comment" };
    const text = body.trim();
    if (!text) return { ok: false, error: "Write something first" };
    if (text.length > 500) return { ok: false, error: "Comments must be 500 characters or fewer" };

    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };
    const { error } = await supabase
      .from("story_comments")
      .insert({ story_id: storyId, user_id: user.uid, body: text });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/messages");
    return { ok: true };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not post comment" };
  }
}
