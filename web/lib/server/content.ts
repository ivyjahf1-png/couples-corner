import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentItem, ContentPlacement, ContentStatus } from "@/lib/models";

/**
 * Couples Corner — server-side content management service.
 *
 * All writes go through the Supabase server client (bypasses RLS).
 * Clients never touch `content` directly; RLS policies deny all client writes.
 */

export interface ContentFilters {
  category?: string;
  status?: ContentStatus;
  placement?: ContentPlacement;
  search?: string;
}

/** Convert snake_case DB row to camelCase ContentItem */
function dbToContentItem(row: Record<string, unknown>): ContentItem {
  return {
    id: row.id as string,
    category: row.category as ContentItem["category"],
    title: row.title as string,
    description: row.description as string | undefined,
    mediaType: row.media_type as ContentItem["mediaType"],
    mediaUrl: row.media_url as string,
    thumbnailUrl: row.thumbnail_url as string | undefined,
    buttonText: row.button_text as string | undefined,
    destinationUrl: row.destination_url as string | undefined,
    placement: row.placement as ContentItem["placement"],
    status: row.status as ContentItem["status"],
    priority: row.priority as number,
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    targetAudience: row.target_audience as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: row.created_by as string,
    updatedBy: row.updated_by as string,
  };
}

export async function listContent(filters: ContentFilters = {}): Promise<ContentItem[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("content").select("*").order("created_at", { ascending: false });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.placement) query = query.eq("placement", filters.placement);

  const { data } = await query;
  if (!data) return [];

  return data.map(dbToContentItem);
}

export async function getContent(id: string): Promise<ContentItem | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("content").select("*").eq("id", id).single();
  return data ? dbToContentItem(data) : null;
}

export async function createContent(
  data: Omit<ContentItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
  adminUid: string
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: created } = await supabase
    .from("content")
    .insert({
      category: data.category,
      title: data.title,
      description: data.description,
      media_type: data.mediaType,
      media_url: data.mediaUrl,
      thumbnail_url: data.thumbnailUrl,
      button_text: data.buttonText,
      destination_url: data.destinationUrl,
      placement: data.placement,
      status: data.status,
      priority: data.priority,
      start_at: data.startAt,
      end_at: data.endAt,
      target_audience: data.targetAudience,
      created_at: now,
      updated_at: now,
      created_by: adminUid,
      updated_by: adminUid,
    })
    .select("id")
    .single();

  // Write audit log
  await supabase.from("audit_logs").insert({
    admin_user_id: adminUid,
    action: "content.create",
    target_ref: { type: "content", id: created!.id },
    details: { title: data.title, category: data.category, status: data.status },
    created_at: now,
  });

  return created!.id;
}

export async function updateContent(
  id: string,
  data: Partial<ContentItem>,
  adminUid: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now, updated_by: adminUid };
  if (data.category !== undefined) updates.category = data.category;
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.mediaType !== undefined) updates.media_type = data.mediaType;
  if (data.mediaUrl !== undefined) updates.media_url = data.mediaUrl;
  if (data.thumbnailUrl !== undefined) updates.thumbnail_url = data.thumbnailUrl;
  if (data.buttonText !== undefined) updates.button_text = data.buttonText;
  if (data.destinationUrl !== undefined) updates.destination_url = data.destinationUrl;
  if (data.placement !== undefined) updates.placement = data.placement;
  if (data.status !== undefined) updates.status = data.status;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.startAt !== undefined) updates.start_at = data.startAt;
  if (data.endAt !== undefined) updates.end_at = data.endAt;
  if (data.targetAudience !== undefined) updates.target_audience = data.targetAudience;

  await supabase.from("content").update(updates).eq("id", id);

  // Write audit log
  await supabase.from("audit_logs").insert({
    admin_user_id: adminUid,
    action: "content.update",
    target_ref: { type: "content", id },
    details: { changes: Object.keys(data) },
    created_at: now,
  });
}

export async function deleteContent(id: string, adminUid: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  // Get content info before deletion for audit
  const { data: content } = await supabase
    .from("content")
    .select("title")
    .eq("id", id)
    .single();

  if (!content) throw new Error("Content not found");

  await supabase.from("content").delete().eq("id", id);

  // Write audit log
  await supabase.from("audit_logs").insert({
    admin_user_id: adminUid,
    action: "content.delete",
    target_ref: { type: "content", id },
    details: { title: content.title },
    created_at: now,
  });
}

export async function publishContent(id: string, adminUid: string): Promise<void> {
  await updateContent(id, { status: "published" }, adminUid);
}

export async function unpublishContent(id: string, adminUid: string): Promise<void> {
  await updateContent(id, { status: "draft" }, adminUid);
}

export async function archiveContent(id: string, adminUid: string): Promise<void> {
  await updateContent(id, { status: "archived" }, adminUid);
}

/** Get published, in-date content for a placement (server-side for display). */
export async function getPublishedForPlacement(
  placement: ContentPlacement
): Promise<ContentItem[]> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("content")
    .select("*")
    .eq("placement", placement)
    .eq("status", "published")
    .lte("start_at", now)
    .gte("end_at", now)
    .order("priority", { ascending: true });

  if (!data) return [];
  return data.map(dbToContentItem);
}

export interface ContentStats {
  total: number;
  published: number;
  scheduled: number;
  draft: number;
  archived: number;
}

export async function getContentStats(): Promise<ContentStats> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("content").select("status");

  const stats: ContentStats = { total: 0, published: 0, scheduled: 0, draft: 0, archived: 0 };
  if (!data) return stats;

  data.forEach((item) => {
    stats.total++;
    if (item.status === "published") stats.published++;
    else if (item.status === "scheduled") stats.scheduled++;
    else if (item.status === "draft") stats.draft++;
    else if (item.status === "archived") stats.archived++;
  });
  return stats;
}
