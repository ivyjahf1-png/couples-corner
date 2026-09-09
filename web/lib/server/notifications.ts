import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { adminRefs } from "@/lib/firebase/collections";
import type { NotificationType } from "@/lib/models/notifications";

/**
 * Create a notification for a recipient (server-side only — clients can never
 * write notifications, see firestore.rules). Notification creation respects
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
  const ref = await adminRefs(getAdminFirestore()).notifications.add({
    recipientId: input.recipientId,
    type: input.type,
    actorId: input.actorId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    title: input.title,
    body: input.body ?? null,
    readAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}
