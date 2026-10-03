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
import { fetchAuthors } from "@/lib/server/profile-lookup";

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
  /**
   * Optional caption. `null` is explicitly allowed, not just omitted: the gallery
   * column is nullable, so an absent caption and an empty one are different
   * states in storage. A caller that trims user input gets `""` for "no caption
   * typed" and would otherwise have to special-case converting it to `undefined`.
   */
  caption?: string | null;
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

/**
 * Create a 24-hour status from a file ALREADY uploaded to storage.
 *
 * WHY THE `File` IS GONE: this used to take the whole `File` and call
 * `supabase.storage.upload(path, file)` itself. That makes the file this
 * Server Action's request BODY, and Vercel rejects any function body over
 * 4.5 MB with 413 FUNCTION_PAYLOAD_TOO_LARGE *before the action runs* — so a
 * 10 MB story failed with "Payload too large" even though `validateMediaFile`
 * advertises 250 MB for user media, and nothing was ever logged because the
 * action never executed.
 *
 * The bytes now go browser -> Supabase Storage via `uploadFileDirect`, and this
 * action only inserts a database row — the same two-step shape every other
 * upload in the app already uses. See StoryTray for the client half.
 *
 * SECURITY: `storagePath` is caller-supplied, so it is NOT trusted blindly. It
 * must be under this caller's own `stories/<uid>/` folder, and the object is
 * removed from the bucket if the insert fails, so a rejected path cannot leave
 * an orphan behind.
 */
export async function createStoryAction(
  storagePath: string,
  mediaType: "image" | "video"
): Promise<{ ok: true; story: StoryView } | { ok: false; error: string }> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to post a story" };

    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    // Reject any path that is not this member's own story folder. Without this
    // a caller could pass any storage path and publish someone else's object.
    const expectedPrefix = `stories/${user.uid}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      return { ok: false, error: "Invalid story file." };
    }

    // expires_at is set HERE, server-side, at insert. The client never sends
    // it, so a tampered payload cannot create a story that never expires.
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: inserted, error: insertErr } = await supabase
      .from("stories")
      .insert({
        user_id: user.uid,
        storage_path: storagePath,
        media_type: mediaType,
        caption: null,
        expires_at: expiresAt,
      })
      .select("id, created_at, expires_at")
      .single();

    if (insertErr || !inserted) {
      // Roll the orphaned object back so a failed insert never leaks storage.
      await supabase.storage.from("user-media").remove([storagePath]);
      return { ok: false, error: insertErr?.message ?? "Could not save your story" };
    }

    const { data: urlData } = supabase.storage.from("user-media").getPublicUrl(storagePath);
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

/**
 * Publish a post to the community timeline.
 *
 * ── THE COLUMN NAMES ARE 008's SHAPE, NOT 006's ──────────────────────────────
 * `author_id` + `visibility` + `media_urls text[]`, which is what `getPublicFeed`
 * reads and what the `posts_insert_own` policy checks (`auth.uid() = author_id`).
 * Do not "fix" these to `user_id`: migrations 006 and 008 both open with
 * `create table if not exists public.posts`, so the deployed shape is whichever
 * ran first, and 049 exists to reconcile them. `visibility: "public"` is not
 * optional — `getPublicFeed` filters on it, so a post without it is invisible to
 * the feed it was just written to.
 *
 * ── WHY THIS IS THE ONLY PUBLISH PATH ───────────────────────────────────────
 * `FeedUploadModal` calls this, then separately syndicates to `moments` for the
 * player. There is deliberately no second `createPost` action: two publish paths
 * are how the media_url/author_id drift of the past started.
 */
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
    if (error) {
      /* LOGGED BEFORE IT IS RETURNED. `error.message` is handed to the client,
         and it reaches them through `failureMessage`, which keeps strings — so
         this is genuinely visible in the member's toast. But a toast is a poor
         place to first discover that a migration never ran: PGRST204 ("could not
         find the column in the schema cache") and 42703 are the two failures
         behind every "my photo doesn't appear" report in this repo's history, and
         both are invisible in the browser's network tab without effort. Logging
         the author, the media count and the raw message means a failure is
         diagnosable from server output alone. */
      console.error("[feed] posts insert failed", {
        authorId: userId,
        mediaCount: mediaUrls.length,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { ok: false, error: error.message };
    }
    revalidatePath("/feed");
    return { ok: true };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Unable to publish post" };
  }
}


/**
 * Syndicate a feed post into `moments` so it appears in the player view.
 *
 * WHY THIS EXISTS. `/feed` renders TWO feeds from TWO tables:
 * CommunityFeedView reads `posts`, and the full-screen ImmersiveFeed player
 * reads `moments`. The composer published to `posts` only, so a photo it
 * uploaded showed in the card list and then nowhere else — the player scrolled
 * straight past it.
 *
 * WHY IT IS A SEPARATE ACTION RATHER THAN AN INLINE INSERT: this file is
 * `"use client"`, and the server client is `server-only`. The build rejects a
 * direct `.from("moments")` here. Server Actions are the correct seam.
 *
 * FAIL-SOFT BY DESIGN. `posts` is the real post and is written first; the
 * caller logs a moment failure and still keeps the member's post. Refusing to
 * publish because a secondary view could not update would make a working
 * Publish button do nothing visible.
 *
 * `media_url` stores the PUBLIC URL rather than a foreign key, because that is
 * how the two tables are already joined: `deleteUserMediaAction` deletes moments
 * by matching `media_url` against a gallery file's public URL. Anything else
 * written here would orphan on delete.
 */
export async function createFeedMomentAction(
  userId: string,
  mediaUrl: string,
  mediaType: "image" | "video",
  content: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSessionUid(userId);
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    // Trimmed and length-capped: this crosses the server/client boundary as an
    // argument, so it must never be passed through unvalidated.
    const url = mediaUrl.trim().slice(0, 2048);
    // Only our own bucket. A caller-supplied URL is otherwise an open redirect
    // into someone else's server, and the player view would happily render it.
    if (!url.startsWith("https://") || !url.includes("/storage/v1/object/public/user-media/")) {
      return { ok: false, error: "That media could not be shared." };
    }

    const { error } = await supabase.from("moments").insert({
      user_id: userId,
      content: content.trim().slice(0, 2200),
      media_url: url,
      media_type: mediaType === "video" ? "video" : "image",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not share to moments" };
  }
}


/**
 * Toggle the viewer's like on a feed post.
 *
 * ── WHY THE UID COMES FROM THE SESSION, NOT THE ARGUMENTS ─────────────────────
 * A caller that passed its own `userId` would let anyone like as anyone else. The
 * RLS policy scopes the write to `auth.uid()` regardless, but failing at the
 * policy layer surfaces as an opaque database error rather than a clear one.
 *
 * ── WHY IT IS A TOGGLE AND NOT AN INCREMENT ────────────────────────────────────
 * The client is optimistic, so it has to be able to predict the outcome to know
 * whether to add or subtract. Returning the resulting `{ liked, likeCount }` means
 * the client reconciles against the truth instead of assuming its guess was right
 * — which is what stops the count oscillating when a double-tap races the round
 * trip.
 *
 * The `likeCount` re-query is scoped to the one post rather than recomputing the
 * whole feed, and it runs through the same client, so it observes the row this
 * transaction just wrote.
 */
export async function togglePostLikeAction(
  postId: string
): Promise<{ ok: true; liked: boolean; likeCount: number } | { ok: false; error: string }> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Sign in to like posts" };
    // Trimmed and length-capped: this crosses the server/client boundary as an
    // argument, so it must never be passed through unvalidated.
    const id = postId.trim().slice(0, 64);
    if (!id) return { ok: false, error: "Missing post" };

    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    const { data: existing } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("post_id", id)
      .eq("user_id", user.uid)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", id)
        .eq("user_id", user.uid);
      if (error) return { ok: false, error: "Could not remove your like" };
      const liked = false;
      const likeCount = await countPostLikes(supabase, id);
      revalidatePath("/feed");
      return { ok: true, liked, likeCount };
    }

    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: id, user_id: user.uid });
    // 23505 is the PK violation from a double-tap that raced itself. The row the
    // member wanted now exists, so this is SUCCESS, not a failure — reporting it
    // as an error is what made a rapid double-tap appear to do nothing.
    if (error && (error as { code?: string }).code !== "23505") {
      return { ok: false, error: "Could not save your like" };
    }
    const likeCount = await countPostLikes(supabase, id);
    revalidatePath("/feed");
    return { ok: true, liked: true, likeCount };
  } catch (err) {
    rethrowIfNavigation(err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not update like" };
  }
}

/**
 * Total likes on one post.
 *
 * `count: "exact", head: true` asks for the number without shipping the rows —
 * the feed needs the number, never the identities, so this keeps the response
 * constant in size regardless of how popular a post is.
 */
async function countPostLikes(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  postId: string
): Promise<number> {
  const { count } = await supabase
    .from("post_likes")
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", postId);
  return count ?? 0;
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
    likeCount: number;
    likedByMe: boolean;
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

  const rows = data as unknown as Array<Record<string, unknown>>;
  const ids = rows.map((row) => String(row.id));

  /* REAL like counts and the viewer's own like, in TWO queries total rather than
     one per post.

     The previous version hardcoded `likeCount: 0, likedByMe: false` with a comment
     explaining that "the public feed payload does not return engagement counts".
     That was honest but it shipped a like button that could only ever read zero,
     so the count was cosmetic and a like could never survive a refresh.

     Grouping is done in JS from two flat reads rather than per-post sub-queries:
     a sub-select per post is N round trips inside one query, which does not help
     on a slow link. `in` on a uuid column is an index lookup, and the result sets
     are bounded by the page size, so this is bounded work.

     Fail-soft: a likes-read failure degrades to "no likes anywhere" rather than
     failing the whole feed, which is the same posture the rest of this function
     takes. */
  const likeTotals = new Map<string, number>();
  const myLiked = new Set<string>();
  const viewer = await getCurrentSessionUser().catch(() => null);
  if (ids.length > 0) {
    const { data: likeRows } = await supabase
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", ids);
    for (const row of (likeRows ?? []) as Array<{ post_id?: string; user_id?: string }>) {
      if (!row.post_id) continue;
      likeTotals.set(row.post_id, (likeTotals.get(row.post_id) ?? 0) + 1);
      if (viewer && row.user_id === viewer.uid) myLiked.add(row.post_id);
    }
  }

  const posts = rows.map((row) => {
    const author = (row.author as Record<string, unknown> | null) ?? {};
    const id = String(row.id);
    return {
      id,
      authorId: String(row.author_id ?? ""),
      authorName: (author.display_name as string) ?? null,
      authorAvatar: (author.avatar_url as string) ?? null,
      content: String(row.content ?? ""),
      mediaUrls: Array.isArray(row.media_urls) ? row.media_urls.filter(Boolean) : [],
      createdAt: String(row.created_at),
      likeCount: likeTotals.get(id) ?? 0,
      likedByMe: myLiked.has(id),
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
      .select("id, body, created_at, user_id")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      console.error("[stories] comment list failed", error);
      return { ok: false, error: error.message };
    }

    // Author names are resolved in a second query: `story_comments.user_id`
    // references auth.users, not profiles, so the `profiles(display_name)` embed
    // this used to carry made PostgREST fail the whole select. See
    // lib/server/profile-lookup.ts.
    const rows = (data ?? []) as Array<{
      id: string;
      body: string;
      created_at: string;
      user_id: string;
    }>;
    const authors = await fetchAuthors(rows.map((c) => c.user_id));

    return {
      ok: true,
      comments: rows.map((c) => ({
        id: c.id,
        body: c.body,
        authorName: authors.get(c.user_id)?.displayName ?? "Member",
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
