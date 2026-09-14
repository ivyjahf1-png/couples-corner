import { getContentList, getContentStatsAction } from "@/lib/actions/content";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import { PageHeader } from "@/components/app/PageHeader";
import { AdminContentClient } from "@/components/admin/AdminContentClient";
import { getCurrentSessionUser } from "@/lib/server/session";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import type { ContentItem } from "@/lib/models/content";

export default async function AdminContentPage() {
  // The admin layout owns the auth guard: unauthorized visitors redirect at the
  // layout root, where Next.js handles the navigation signal cleanly. Fetching
  // is intentionally guard-free so no redirect is ever thrown into this page's
  // own catch — the route-refresh loop's blast radius stops at the layout.
  let content: ContentItem[] = [];
  let stats = { total: 0, published: 0, scheduled: 0, draft: 0, archived: 0 };
  let userUid = "";

  try {
    [content, stats, userUid] = await Promise.all([
      getContentList({}),
      getContentStatsAction(),
      getCurrentSessionUser().then(u => u?.uid ?? ""),
    ]);
  } catch (err) {
    rethrowIfNavigation(err);
    console.error("Failed to load content page data:", err);
    throw err;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Admin"
        title="Content & Advertisements"
        subtitle="Upload, schedule, and manage promotional content and announcements."
      />
      <AdminContentClient initialContent={content} stats={stats} adminUid={userUid} />
    </div>
  );
}
