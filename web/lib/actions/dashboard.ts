"use server";

import "server-only";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDashboardMetrics, getRecentActivity } from "@/lib/server/dashboard";

/** Fetch dashboard metrics for the admin overview. */
export async function getDashboardMetricsAction() {
  await requireAdmin();
  return getDashboardMetrics();
}

/** Fetch recent activity feed for the admin overview. */
export async function getRecentActivityAction() {
  await requireAdmin();
  return getRecentActivity();
}
