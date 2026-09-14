"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { requireAdminDev } from "@/lib/auth/authorization";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import {
  listUserMfaFactors,
  unenrollUserMfaFactor,
  listUserSessions,
  revokeUserSession,
  revokeAllUserSessions,
  sendPasswordResetEmail,
  adminUpdatePassword,
  listBlockedUsers,
  unblockUser,
} from "@/lib/server/security";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditBestEffort } from "@/lib/server/audit";

export interface SecurityActionResult {
  ok: boolean;
  error?: string;
}

function adminError(err: unknown): SecurityActionResult {
  // redirect()/notFound() from requireAdminDev() must propagate so Next.js
  // navigates correctly instead of reporting a bogus "Something went wrong".
  rethrowIfNavigation(err);
  return {
    ok: false,
    error: err instanceof Error ? err.message : "Something went wrong",
  };
}

export async function getUserMfaFactorsAction(targetUid: string) {
  await requireAdminDev();
  return listUserMfaFactors(targetUid);
}

export async function unenrollMfaFactorAction(
  targetUid: string,
  factorId: string
): Promise<SecurityActionResult> {
  try {
    const admin = await requireAdminDev();
    await unenrollUserMfaFactor(targetUid, factorId);
    await recordAuditBestEffort({
      adminUserId: admin.uid,
      action: "mfa.unenroll",
      targetRef: { type: "user_factor", id: `${targetUid}:${factorId}` },
    });
    revalidatePath("/admin/security");
    return { ok: true };
  } catch (err) {
    return adminError(err);
  }
}

export async function getUserSessionsAction(targetUid: string) {
  await requireAdminDev();
  return listUserSessions(targetUid);
}

export async function revokeSessionAction(
  targetUid: string,
  sessionId: string
): Promise<SecurityActionResult> {
  try {
    const admin = await requireAdminDev();
    await revokeUserSession(targetUid, sessionId);
    await recordAuditBestEffort({
      adminUserId: admin.uid,
      action: "session.revoke",
      targetRef: { type: "user_session", id: `${targetUid}:${sessionId}` },
    });
    revalidatePath("/admin/security");
    return { ok: true };
  } catch (err) {
    return adminError(err);
  }
}

export async function revokeAllSessionsAction(
  targetUid: string
): Promise<SecurityActionResult> {
  try {
    const admin = await requireAdminDev();
    await revokeAllUserSessions(targetUid);
    await recordAuditBestEffort({
      adminUserId: admin.uid,
      action: "sessions.revoke_all",
      targetRef: { type: "user", id: targetUid },
    });
    revalidatePath("/admin/security");
    return { ok: true };
  } catch (err) {
    return adminError(err);
  }
}

export async function sendPasswordResetAction(
  targetUid: string,
  email: string
): Promise<SecurityActionResult> {
  try {
    const admin = await requireAdminDev();
    await sendPasswordResetEmail(targetUid, email);
    await recordAuditBestEffort({
      adminUserId: admin.uid,
      action: "password.reset_requested",
      targetRef: { type: "user", id: targetUid },
    });
    return { ok: true };
  } catch (err) {
    return adminError(err);
  }
}

export async function setPasswordAction(
  targetUid: string,
  newPassword: string
): Promise<SecurityActionResult> {
  try {
    if (newPassword.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }
    const admin = await requireAdminDev();
    await adminUpdatePassword(targetUid, newPassword);
    await recordAuditBestEffort({
      adminUserId: admin.uid,
      action: "password.admin_reset",
      targetRef: { type: "user", id: targetUid },
    });
    revalidatePath("/admin/security");
    return { ok: true };
  } catch (err) {
    return adminError(err);
  }
}

export async function getBlockedUsersAction() {
  await requireAdminDev();
  return listBlockedUsers();
}

export async function unblockUserAction(targetUid: string): Promise<SecurityActionResult> {
  try {
    const admin = await requireAdminDev();
    await unblockUser(targetUid);
    await recordAuditBestEffort({
      adminUserId: admin.uid,
      action: "user.unblock",
      targetRef: { type: "user", id: targetUid },
    });
    revalidatePath("/admin/security");
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return adminError(err);
  }
}

export async function getUserProfileAction(targetUid: string) {
  await requireAdminDev();
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, email, display_name, role, status, is_demo, created_at")
    .eq("id", targetUid)
    .single();

  if (error || !data) return null;

  return {
    uid: data.id as string,
    email: data.email as string,
    displayName: (data.display_name as string) ?? null,
    role: data.role as string,
    status: data.status as string,
    isDemo: Boolean(data.is_demo),
    createdAt: data.created_at as string,
  };
}

/** Search users by email or display name. */
export async function searchUsersAction(query: string): Promise<Array<{
  uid: string;
  email: string;
  displayName: string | null;
}>> {
  await requireAdminDev();
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const clean = query.trim().slice(0, 100).replace(/[%_,()"]/g, "");
  if (!clean) return [];

  const { data, error } = await supabase
    .from("users")
    .select("id, email, display_name")
    .or(`email.ilike.%${clean}%,display_name.ilike.%${clean}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((u) => ({
    uid: String(u.id),
    email: String(u.email ?? ""),
    displayName: (u.display_name as string) ?? null,
  }));
}