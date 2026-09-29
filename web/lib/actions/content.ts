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
