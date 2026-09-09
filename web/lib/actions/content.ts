"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getAdminStorage } from "@/lib/firebase/admin";
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
  return listContent(filters);
}

export async function getContentStatsAction() {
  return getContentStats();
}

export async function createContentAction(
  data: Omit<ContentItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
  adminUid: string
) {
  const id = await createContent(data, adminUid);
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
  await updateContent(id, data, adminUid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

export async function deleteContentAction(id: string, adminUid: string) {
  await deleteContent(id, adminUid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

export async function publishContentAction(id: string, adminUid: string) {
  await publishContent(id, adminUid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

export async function unpublishContentAction(id: string, adminUid: string) {
  await unpublishContent(id, adminUid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

export async function archiveContentAction(id: string, adminUid: string) {
  await archiveContent(id, adminUid);
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  revalidatePath("/matches");
  revalidatePath("/messages");
}

/**
 * Upload media to Firebase Storage. Returns the download URL.
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

  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `content/${contentId}/${new Date().getTime()}_${sanitizedName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const fileRef = bucket.file(path);
  await fileRef.save(buffer, {
    contentType: file.type,
    metadata: {
      metadata: {
        uploadedBy: "admin",
        contentId,
      },
    },
  });

  // Make the file publicly readable (for display purposes)
  await fileRef.makePublic();

  const mediaUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

  return { mediaUrl };
}
