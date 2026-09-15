"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireAdminDev } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentItem, ContentPlacement, ContentStatus } from "@/lib/models";
import { CONTENT_UPLOAD } from "@/lib/models/content";
import {
  archiveContent,
  createContent,
  deleteContent,
  getContentStats,
  listContent,
  publishContent,
  unpublishContent,
  updateContent,
} from "@/lib/server/content";
import { ensureStorageBucket } from "@/lib/server/profiles";

/**
 * Server actions for admin content management.
 *
 * SECURITY: these run only on the server (Admin SDK). The admin UID is passed
 * from the authenticated session in the page component — never trusted from the
 * client. All writes are transactional with audit-log entries.
 */

export async function getContentList(filters: {
  category?: string;
  status?: ContentStatus;
  placement?: ContentPlacement;
  search?: string;
}) {
  await requireAdminDev();
  return listContent(filters);
}

export async function getContentStatsAction() {
  await requireAdminDev();
  return getContentStats();
}

export async function createContentAction(
  data: Omit<ContentItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
  adminUid: string
) {
  const admin = await requireAdminDev();
  const id = await createContent(data, adminUid || admin.uid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
  return id;
}

export async function updateContentAction(
  id: string,
  data: Partial<ContentItem>,
  adminUid: string
) {
  const admin = await requireAdminDev();
  await updateContent(id, data, adminUid || admin.uid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

export async function deleteContentAction(id: string, adminUid: string) {
  const admin = await requireAdminDev();
  await deleteContent(id, adminUid || admin.uid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

export async function publishContentAction(id: string, adminUid: string) {
  const admin = await requireAdminDev();
  await publishContent(id, adminUid || admin.uid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

export async function unpublishContentAction(id: string, adminUid: string) {
  const admin = await requireAdminDev();
  await unpublishContent(id, adminUid || admin.uid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

export async function archiveContentAction(id: string, adminUid: string) {
  const admin = await requireAdminDev();
  await archiveContent(id, adminUid || admin.uid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

/**
 * Upload media to Supabase Storage. Returns the public URL.
 * Path: content/{contentId}/{filename} — isolated per content item.
 */
export async function uploadContentMedia(
  contentId: string,
  file: File
): Promise<{ mediaUrl: string; thumbnailUrl?: string }> {
  // Validate file type
  const isImage = CONTENT_UPLOAD.imageTypes.some((t) => t === file.type);
  const isVideo = CONTENT_UPLOAD.videoTypes.some((t) => t === file.type);

  if (!isImage && !isVideo) {
    throw new Error(
      `Unsupported file type: ${file.type}. Allowed: images (JPEG, PNG, WebP) and videos (MP4, WebM).`
    );
  }

  // Validate file size
  const maxSize = isImage ? CONTENT_UPLOAD.maxImageBytes : CONTENT_UPLOAD.maxVideoBytes;
  if (file.size > maxSize) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${maxSize / 1024 / 1024}MB.`
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `content/${contentId}/${new Date().getTime()}_${sanitizedName}`;

  // Make sure the bucket exists before uploading ("Bucket not found" guard).
  await ensureStorageBucket(supabase, "media");

  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload media: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);

  return { mediaUrl: urlData.publicUrl };
}

/**
 * Upload multiple photos/videos to Supabase Storage ("media" bucket).
 * Mirrors the web-admin implementation: validates each file, enforces
 * CONTENT_UPLOAD limits, uploads to content/{contentId}/{timestamp}_{rand}_{name},
 * returns public URLs. Partial success is returned; total failure throws.
 */
export async function uploadMultipleContentMedia(
  contentId: string,
  files: File[]
): Promise<{ mediaUrls: string[]; thumbnailUrl?: string }> {
  if (files.length === 0) throw new Error("No files to upload");
  if (files.length > CONTENT_UPLOAD.maxFiles) {
    throw new Error(`Max ${CONTENT_UPLOAD.maxFiles} files. Got ${files.length}.`);
  }

  await requireAdminDev();
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");
  await ensureStorageBucket(supabase, "media");

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
    const path = `content/${contentId}/${Date.now()}_${rand}_${name}`;

    try {
      const buffer = await file.arrayBuffer();
      const { error: err } = await supabase.storage.from("media").upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });
      if (err) {
        failures.push(`${file.name}: ${err.message ?? "upload failed"}`);
        continue;
      }
      const { data: url } = supabase.storage.from("media").getPublicUrl(path);
      mediaUrls.push(url.publicUrl);
      if (isImage && !thumbnailUrl) thumbnailUrl = url.publicUrl;
    } catch (e) {
      failures.push(`${file.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (mediaUrls.length === 0) {
    throw new Error(
      failures.length > 0 ? `Upload failed: ${failures.join("; ")}` : "All uploads failed"
    );
  }
  return { mediaUrls, thumbnailUrl };
}
