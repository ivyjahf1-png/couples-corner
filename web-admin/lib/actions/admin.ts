"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import { requireAdminDev } from "@/lib/auth/authorization";
import { listReports, listUsersForModeration, setUserStatus, setUserSubscriptionTier, setUserCoinBalance, updateReportStatus } from "@/lib/server/admin";
import type { ReportStatus } from "@/lib/models";

/** Fetch the report moderation queue (optionally by status). */
export async function getReportsAction(status?: ReportStatus) {
  await requireAdminDev();
  try {
    return listReports(status);
  } catch (err) {
    rethrowIfNavigation(err);
    throw err;
  }
}

/** Fetch users with moderation context for the safety center. */
export async function getUsersForModerationAction() {
  await requireAdminDev();
  try {
    return listUsersForModeration();
  } catch (err) {
    rethrowIfNavigation(err);
    throw err;
  }
}

/** Resolve / dismiss / reopen a report. */
export async function reviewReportAction(
  reportId: string,
  status: ReportStatus,
  note?: string
): Promise<void> {
  const admin = await requireAdminDev();
  await updateReportStatus(reportId, status, admin.uid, note);
  revalidatePath("/admin/reports");
}

/** Suspend (ban) or reactivate a user account. */
export async function setUserStatusAction(
  uid: string,
  status: "active" | "suspended",
  reason?: string
): Promise<void> {
  const admin = await requireAdminDev();
  await setUserStatus(uid, status, admin.uid, reason);
  revalidatePath("/admin/users");
}

/** Uniform wallet/tier update used by the admin quick-edit modal. */
export async function updateUserWalletAction(
  uid: string,
  patch: { subscriptionTier?: "free" | "premium" | "vip"; coinBalance?: number },
  reason?: string
): Promise<void> {
  const admin = await requireAdminDev();
  if (patch.subscriptionTier !== undefined) {
    await setUserSubscriptionTier(uid, patch.subscriptionTier, admin.uid, reason);
  }
  if (patch.coinBalance !== undefined) {
    await setUserCoinBalance(uid, patch.coinBalance, admin.uid, reason);
  }
  revalidatePath("/admin/users");
}
