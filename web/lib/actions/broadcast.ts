"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  createBroadcast,
  listBroadcasts,
  sendBroadcast,
} from "@/lib/server/broadcast";
import type { BroadcastAudience, BroadcastType } from "@/lib/models";

/** Fetch all broadcasts for the broadcast center. */
export async function getAllBroadcastsAction() {
  return listBroadcasts();
}

/** Create a new broadcast draft. */
export async function createBroadcastAction(input: {
  title: string;
  body: string;
  audience: BroadcastAudience;
  type: BroadcastType;
}): Promise<string> {
  const admin = await requireAdmin();
  const id = await createBroadcast(input, admin.uid);
  revalidatePath("/admin/broadcast");
  return id;
}

/** Send a draft broadcast to the targeted users. */
export async function sendBroadcastAction(id: string): Promise<number> {
  const admin = await requireAdmin();
  const count = await sendBroadcast(id, admin.uid);
  revalidatePath("/admin/broadcast");
  return count;
}