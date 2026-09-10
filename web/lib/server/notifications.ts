import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/models/notifications";

/**
 * Create a notification for a recipient (server-side only — clients can never
 * write notifications, see RLS policies). Notification creation respects
 * nothing else; preference filtering (notifyOnConnection etc.) happens at the
 * call site where the preference is already loaded.
 */
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

