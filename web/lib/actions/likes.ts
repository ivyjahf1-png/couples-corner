"use server";

import "server-only";
import { requireUser } from "@/lib/auth/authorization";
import { getLikesForUser, getBotThreadsForUser, type LikeView, type BotThreadView } from "@/lib/server/likes";

/** Everyone who liked the signed-in user (blurred placeholders included). */
export async function getLikesAction(): Promise<LikeView[]> {
  const user = await requireUser();
  return getLikesForUser(user.uid);
}

/** Interactive bot threads owned by the signed-in user (seeded chat data). */
export async function getBotThreadsAction(): Promise<BotThreadView[]> {
  const user = await requireUser();
  return getBotThreadsForUser(user.uid);
}
