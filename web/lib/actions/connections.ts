"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/lib/server/session";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import {
  sendConnectionRequest,
  cancelConnectionRequest,
  respondToConnectionRequest,
  removeConnection,
  getConnectionState,
} from "@/lib/server/connections";

import type { ConnectionState } from "@/lib/feature/types";

export type { ConnectionState };

export interface GetConnectionStateResult {
  state: ConnectionState;
  requestId: string | null;
  connectionId: string | null;
}

/** Resolve the connection state between the signed-in viewer and a profile. */
export async function getConnectionStateAction(targetUserId: string): Promise<GetConnectionStateResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { state: "none", requestId: null, connectionId: null };
  try {
    return await getConnectionState(user.uid, targetUserId);
  } catch (error) {
    rethrowIfNavigation(error);
    return { state: "none", requestId: null, connectionId: null };
  }
}

/**
 * Connection server actions. Each action re-resolves the session server-side
 * and derives the acting uid from it — never from the client payload.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function sendConnectionAction(targetUserId: string): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, error: "Please sign in again" };
  try {
    await sendConnectionRequest(user.uid, targetUserId);
    revalidatePath("/discover");
    revalidatePath("/matches");
    return { ok: true };
  } catch (error) {
    rethrowIfNavigation(error);
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong" };
  }
}

export async function cancelRequestAction(requestId: string): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, error: "Please sign in again" };
  try {
    await cancelConnectionRequest(user.uid, requestId);
    revalidatePath("/matches");
    revalidatePath("/discover");
    return { ok: true };
  } catch (error) {
    rethrowIfNavigation(error);
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong" };
  }
}

export async function respondRequestAction(requestId: string, accept: boolean): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, error: "Please sign in again" };
  try {
    await respondToConnectionRequest(user.uid, requestId, accept);
    revalidatePath("/matches");
    revalidatePath("/discover");
    revalidatePath("/notifications");
    return { ok: true };
  } catch (error) {
    rethrowIfNavigation(error);
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong" };
  }
}

export async function removeConnectionAction(connectionId: string): Promise<ActionResult> {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false, error: "Please sign in again" };
  try {
    await removeConnection(user.uid, connectionId);
    revalidatePath("/matches");
    revalidatePath("/discover");
    return { ok: true };
  } catch (error) {
    rethrowIfNavigation(error);
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong" };
  }
}
