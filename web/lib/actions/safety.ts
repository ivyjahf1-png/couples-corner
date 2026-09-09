"use server";

import { getCurrentSessionUser } from "@/lib/server/session";
import { createReport, blockUser, unblockUser, listBlocked } from "@/lib/server/safety";
import type { ReportReason } from "@/lib/models/safety";
import type { BlockedUser } from "@/lib/feature/types";

/** Record a report about a user/couple/post/comment/message. */
export async function reportContent(input: {
  entityType: "user" | "couple" | "post" | "comment" | "message";
  entityId: string;
  reason: ReportReason;
  details?: string | null;
}): Promise<{ id: string }> {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in again");
  const id = await createReport({
    reporterId: user.uid,
    entityType: input.entityType,
    entityId: input.entityId,
    reason: input.reason,
    details: input.details,
  });
  return { id };
}

/** Block another user (delegates to the server-side safety service). */
export async function blockUserAction(targetUid: string): Promise<void> {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in again");
  await blockUser(user.uid, targetUid);
}

/** Unblock a previously blocked user. */
export async function unblockUserAction(targetUid: string): Promise<void> {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in again");
  await unblockUser(user.uid, targetUid);
}

/** List the signed-in user's blocked targets. */
export async function listBlockedUsers(): Promise<BlockedUser[]> {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("Please sign in again");
  return listBlocked(user.uid);
}


