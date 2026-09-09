import { requireAdmin } from "@/lib/auth/authorization";
import {
  getContentList,
  getContentStatsAction,
} from "@/lib/actions/content";
import { AdminContentClient } from "@/components/admin/AdminContentClient";
import { PageHeader } from "@/components/app/PageHeader";

export default async function AdminContentPage() {
  const admin = await requireAdmin();
  const [content, stats] = await Promise.all([
    getContentList({}),
    getContentStatsAction(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Admin"
        title="Content & Advertisements"
        subtitle="Upload, schedule, and manage promotional content and announcements."
      />
      <AdminContentClient initialContent={content} stats={stats} adminUid={admin.uid} />
    </div>
  );
}
