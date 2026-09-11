import { getContentList, getContentStatsAction } from "@/lib/actions/content";
import { PageHeader } from "@/components/app/PageHeader";
import { AdminContentClient } from "@/components/admin/AdminContentClient";
import { getCurrentSessionUser } from "@/lib/server/session";

export default async function AdminContentPage() {
  // The admin layout already handles auth guard via requireAdminDev.
  // Child pages inherit admin access — no need to call requireAdmin() again.
  const [content, stats, user] = await Promise.all([
    getContentList({}),
    getContentStatsAction(),
    getCurrentSessionUser(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Admin"
        title="Content & Advertisements"
        subtitle="Upload, schedule, and manage promotional content and announcements."
      />
      <AdminContentClient initialContent={content} stats={stats} adminUid={user?.uid ?? ""} />
    </div>
  );
}
