import "server-only";

/**
 * Couples Corner — server-side notification service.
 * Clients can never write notifications (see RLS policies).
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/models/notifications";

export async function createNotification(input: {
  recipientId: string;
  type: NotificationType;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  body?: string | null;
}): Promise<string> {
  const now = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }
  const { data } = await supabase
    .from("notifications")
    .insert({
      recipient_id: input.recipientId,
      type: input.type,
      actor_id: input.actorId ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      title: input.title,
      body: input.body ?? null,
      read_at: null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  return data!.id;
}
