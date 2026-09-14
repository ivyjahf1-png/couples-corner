import { getReportsAction } from "@/lib/actions/admin";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import { PageHeader } from "@/components/app/PageHeader";
import { AdminReportsClient } from "@/components/admin/AdminReportsClient";
import type { AdminReportRow } from "@/lib/server/admin";

export default async function AdminReportsPage() {
  // The admin layout owns the auth guard: unauthorized visitors redirect at the
  // layout root, where Next.js handles the navigation signal cleanly. Fetching
  // is intentionally guard-free so no redirect is ever thrown into this page's
  // own catch — the route-refresh loop's blast radius stops at the layout.
  let reports: AdminReportRow[] = [];
  try {
    reports = await getReportsAction();
  } catch (err) {
    rethrowIfNavigation(err);
    console.error("Failed to load reports:", err);
    throw err;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Moderation"
        title="Reports"
        subtitle="Review reported profiles, posts, and messages. Resolve or dismiss each report to keep the community safe."
      />
      <AdminReportsClient initialReports={reports} />
    </div>
  );
}
