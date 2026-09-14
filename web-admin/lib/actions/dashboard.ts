"use server";

import "server-only";
import { requireAdminDev } from "@/lib/auth/authorization";
import { getDashboardMetrics, getRecentActivity } from "@/lib/server/dashboard";

/** Fetch dashboard metrics for the admin overview. */
export async function getDashboardMetricsAction() {
  await requireAdminDev();
  return getDashboardMetrics();
}

/** Fetch recent activity feed for the admin overview. */
export async function getRecentActivityAction() {
  await requireAdminDev();
  return getRecentActivity();
}
