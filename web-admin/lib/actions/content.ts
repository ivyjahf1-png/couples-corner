"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentItem, ContentPlacement, ContentStatus } from "@/lib/models";
import { CONTENT_UPLOAD } from "@/lib/models/content";
import {
  archiveContent, createContent, deleteContent, getContentStats,
  listContent, publishContent, unpublishContent, updateContent,
} from "@/lib/server/content";
import { ensureStorageBucket } from "@/lib/server/profiles";

export async function getContentList(filters: {
  category?: string; status?: ContentStatus;
  placement?: ContentPlacement; search?: string;
}) {
  return listContent(filters);
}

export async function getContentStatsAction() { return getContentStats(); }

export async function createContentAction(
  data: Omit<ContentItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
  adminUid: string, id?: string
) {
  const contentId = await createContent(data, adminUid, id);
  revalidatePath("/admin/content");
  revalidatePath("/"); revalidatePath("/dashboard");
  revalidatePath("/discover"); revalidatePath("/matches"); revalidatePath("/messages");
  return contentId;
}

export async function updateContentAction(id: string, data: Partial<ContentItem>, adminUid: string) {
  await updateContent(id, data, adminUid);
  revalidatePath("/admin/content"); revalidatePath("/"); revalidatePath("/dashboard");
  revalidatePath("/discover"); revalidatePath("/matches"); revalidatePath("/messages");
}

export async function deleteContentAction(id: string, adminUid: string) {
  await deleteContent(id, adminUid);
  revalidatePath("/admin/content"); revalidatePath("/"); revalidatePath("/dashboard");
  revalidatePath("/discover"); revalidatePath("/matches"); revalidatePath("/messages");
}

export async function publishContentAction(id: string, adminUid: string) {
  await publishContent(id, adminUid);
  revalidatePath("/admin/content"); revalidatePath("/"); revalidatePath("/dashboard");
  revalidatePath("/discover"); revalidatePath("/matches"); revalidatePath("/messages");
}

export async function unpublishContentAction(id: string, adminUid: string) {
  await unpublishContent(id, adminUid);
  revalidatePath("/admin/content"); revalidatePath("/"); revalidatePath("/dashboard");
  revalidatePath("/discover"); revalidatePath("/matches"); revalidatePath("/messages");
}

export async function archiveContentAction(id: string, adminUid: string) {
  await archiveContent(id, adminUid);
  revalidatePath("/admin/content"); revalidatePath("/"); revalidatePath("/dashboard");
  revalidatePath("/discover"); revalidatePath("/matches"); revalidatePath("/messages");
}

export async function uploadContentMedia(
  contentId: string, file: File
): Promise<{ mediaUrl: string; thumbnailUrl?: string }> {
  const isImage = CONTENT_UPLOAD.imageTypes.some((t) => t === file.type);
  const isVideo = CONTENT_UPLOAD.videoTypes.some((t) => t === file.type);
  if (!isImage && !isVideo) throw new Error(`Unsupported: ${file.type}`);
  const maxSize = isImage ? CONTENT_UPLOAD.maxImageBytes : CONTENT_UPLOAD.maxVideoBytes;
  if (file.size > maxSize) throw new Error(`Too large: ${(file.size/1024/1024).toFixed(1)}MB`);
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and " +
      "SUPABASE_SERVICE_ROLE_KEY are set. If the key is set but uploads still " +
      "fail with 'Invalid Compact JWS', the key is malformed — copy the " +
      "service_role key from Supabase dashboard → Settings → API."
    );
  }
  const name = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `content/${contentId}/${new Date().getTime()}_${name}`;
  await ensureStorageBucket(supabase, "media");
  const buf = await file.arrayBuffer();
  // NOTE: Do NOT pass an explicit Authorization header here. The Supabase
  // client was created with the service role key, which it already injects
  // into every request. Passing a manual Bearer token can corrupt the JWT
  // (e.g. when the key is empty or contains whitespace/quotes) and produces
  // "Invalid Compact JWS" errors from the Storage API.
  try {
    const { error: err } = await supabase.storage.from("media").upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });
    if (err) {
      // Surface the underlying Storage error so the client can show a
      // descriptive message instead of a generic "Upload failed".
      throw new Error(`Storage upload failed: ${err.message}`);
    }
  } catch (err) {
    // Re-throw our own descriptive errors as-is.
    if (err instanceof Error && err.message.startsWith("Storage upload failed")) {
      throw err;
    }
    // Wrap unexpected errors (including "Invalid Compact JWS") with context.
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Upload to Supabase Storage failed: ${msg}. ` +
      "This is often caused by a malformed service role key — verify the key " +
      "in your Supabase dashboard (Settings → API) and ensure the " +
      "SUPABASE_SERVICE_ROLE_KEY env var is not truncated or quoted."
    );
  }
  const { data: url } = supabase.storage.from("media").getPublicUrl(path);
  return { mediaUrl: url.publicUrl };
}

export async function uploadMultipleContentMedia(
  contentId: string, files: File[]
): Promise<{ mediaUrls: string[]; thumbnailUrl?: string }> {
  if (files.length === 0) return { mediaUrls: [] };
  if (files.length > CONTENT_UPLOAD.maxFiles) throw new Error(`Max ${CONTENT_UPLOAD.maxFiles} files. Got ${files.length}.`);
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and " +
      "SUPABASE_SERVICE_ROLE_KEY are set. If the key is set but uploads still " +
      "fail with 'Invalid Compact JWS', the key is malformed — copy the " +
      "service_role key from Supabase dashboard → Settings → API."
    );
  }
  await ensureStorageBucket(supabase, "media");

  // NOTE: Do NOT pass an explicit Authorization header per-file. The Supabase
  // client was created with the service role key, which it already injects
  // into every request. Passing a manual Bearer token can corrupt the JWT
  // (e.g. when the key is empty or contains whitespace/quotes) and produces
  // "Invalid Compact JWS" errors from the Storage API.
  const mediaUrls: string[] = [];
  let thumbnailUrl: string | undefined;
  const failures: string[] = [];

  for (const file of files) {
    const isImage = CONTENT_UPLOAD.imageTypes.some((t) => t === file.type);
    const isVideo = CONTENT_UPLOAD.videoTypes.some((t) => t === file.type);
    if (!isImage && !isVideo) {
      failures.push(`${file.name}: unsupported type (${file.type || "unknown"})`);
      continue;
    }
    const maxSize = isImage ? CONTENT_UPLOAD.maxImageBytes : CONTENT_UPLOAD.maxVideoBytes;
    if (file.size > maxSize) {
      failures.push(`${file.name}: exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      continue;
    }

    const name = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `content/${contentId}/${new Date().getTime()}_${rand}_${name}`;

    // Guard each file individually so a single failure can never leave the
    // loop (and therefore the client busy state) hanging.
    try {
      const buf = await file.arrayBuffer();
      const { error: err } = await supabase.storage.from("media").upload(path, buf, {
        contentType: file.type,
        upsert: false,
      });
      if (err) {
        // Detect JWS / auth errors and surface a descriptive hint.
        const msg = err.message ?? "";
        const hint = msg.includes("Invalid Compact JWS") || msg.includes("invalid JWT")
          ? " (malformed SUPABASE_SERVICE_ROLE_KEY — copy the service_role key from Supabase → Settings → API)"
          : "";
        failures.push(`${file.name}: ${msg}${hint}`);
        continue;
      }
      const { data: url } = supabase.storage.from("media").getPublicUrl(path);
      mediaUrls.push(url.publicUrl);
      if (isImage && !thumbnailUrl) thumbnailUrl = url.publicUrl;
    } catch (e) {
      // Catch unexpected errors (including network failures and JWS errors
      // thrown outside the Supabase error envelope) with a descriptive hint.
      const msg = e instanceof Error ? e.message : String(e);
      const hint = msg.includes("Invalid Compact JWS") || msg.includes("invalid JWT")
        ? " (malformed SUPABASE_SERVICE_ROLE_KEY — copy the service_role key from Supabase → Settings → API)"
        : "";
      failures.push(`${file.name}: ${msg}${hint}`);
    }
  }

  if (mediaUrls.length === 0) {
    throw new Error(
      failures.length > 0 ? `Upload failed: ${failures.join("; ")}` : "All uploads failed"
    );
  }
  // Partial success: return what uploaded plus a warning the client can surface.
  return { mediaUrls, thumbnailUrl };
}
