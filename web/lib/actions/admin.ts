"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  listReports,
  listUsersForModeration,
  setUserStatus,
  updateReportStatus,
} from "@/lib/server/admin";
import type { ReportStatus } from "@/lib/models";

/** Fetch the report moderation queue (optionally by status). */
export async function getReportsAction(status?: ReportStatus) {
  return listReports(status);
}

/** Fetch users with moderation context for the safety center. */
export async function getUsersForModerationAction() {
  return listUsersForModeration();
}

/** Resolve / dismiss / reopen a report. */
export async function reviewReportAction(
  reportId: string,
  status: ReportStatus,
  note?: string
): Promise<void> {
  const admin = await requireAdmin();
  await updateReportStatus(reportId, status, admin.uid, note);
  revalidatePath("/admin/reports");
}

/** Suspend (ban) or reactivate a user account. */
export async function setUserStatusAction(
  uid: string,
  status: "active" | "suspended",
  reason?: string
): Promise<void> {
  const admin = await requireAdmin();
  await setUserStatus(uid, status, admin.uid, reason);
  revalidatePath("/admin/users");
}