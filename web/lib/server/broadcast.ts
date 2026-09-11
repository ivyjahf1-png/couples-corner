import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/server/audit";
import { createNotification } from "@/lib/server/notifications";
import type {
  Broadcast,
  BroadcastAudience,
  BroadcastType,
} from "@/lib/models";

/**
 * Couples Corner — server-side broadcast service.
 *
 * Creates platform-wide announcements/alerts and fans them out to every
 * active user as an in-app notification. Writes run through the Supabase
 * server client (bypasses RLS); callers must be verified admins.
 */

interface NewBroadcastInput {
  title: string;
  body: string;
  audience: BroadcastAudience;
  type: BroadcastType;
}

/** Save a broadcast as a draft (not yet sent). */
export async function createBroadcast(
  input: NewBroadcastInput,
  adminUid: string
): Promise<string> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");
  if (!input.title.trim() || !input.body.trim()) {
    throw new Error("Title and body are required");
  }

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("broadcasts")
    .insert({
      title: input.title.trim(),
      body: input.body.trim(),
      audience: input.audience,
      type: input.type,
      created_by: adminUid,
      status: "draft",
      targeted_user_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  await recordAudit({
    adminUserId: adminUid,
    action: "broadcast.create",
    targetRef: { type: "broadcast", id: data!.id },
  });
  return data!.id;
}

/** List all broadcasts (newest first). */
export async function listBroadcasts(): Promise<Broadcast[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data) return [];
  return data.map((b) => ({
    id: b.id as string,
    title: b.title as string,
    body: b.body as string,
    audience: b.audience as BroadcastAudience,
    type: b.type as BroadcastType,
    createdBy: b.created_by as string,
    status: b.status as Broadcast["status"],
    targetedUserCount: (b.targeted_user_count as number) ?? 0,
    createdAt: b.created_at as string,
    updatedAt: b.updated_at as string,
    sentAt: (b.sent_at as string | null) ?? null,
  }));
}

/** Send a draft broadcast to the targeted users (idempotent — no-op if sent). */
export async function sendBroadcast(id: string, adminUid: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: existing } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("id", id)
    .single();
  if (!existing) throw new Error("Broadcast not found");
  if (existing.status === "sent") return (existing.targeted_user_count as number) ?? 0;

  // Determine target user IDs (all, or only active accounts).
  let query = supabase.from("users").select("id");
  if (existing.audience === "active_users") {
    query = query.eq("status", "active");
  }
  const { data: users } = await query;
  const userIds = (users ?? []).map((u) => u.id as string);

  const now = new Date().toISOString();

  if (userIds.length > 0) {
    await Promise.all(
      userIds.map((uid) =>
        createNotification({
          recipientId: uid,
          type: "system",
          title: existing.title,
          body: existing.body,
          entityType: "broadcast",
          entityId: id,
        })
      )
    );
  }

  await supabase
    .from("broadcasts")
    .update({
      status: "sent",
      targeted_user_count: userIds.length,
      sent_at: now,
      updated_at: now,
    })
    .eq("id", id);

  await recordAudit({
    adminUserId: adminUid,
    action: "broadcast.send",
    targetRef: { type: "broadcast", id },
  });

  return userIds.length;
}