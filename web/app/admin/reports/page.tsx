import { requireAdminGate } from "@/lib/auth/admin-gate";
import { getReportsAction } from "@/lib/actions/admin";
import { PageHeader } from "@/components/app/PageHeader";
import { AdminReportsClient } from "@/components/admin/AdminReportsClient";

export default async function AdminReportsPage() {
  await requireAdminGate();
  const reports = await getReportsAction();

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