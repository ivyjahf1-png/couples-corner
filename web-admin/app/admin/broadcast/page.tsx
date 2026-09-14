import { getAllBroadcastsAction } from "@/lib/actions/broadcast";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import { PageHeader } from "@/components/app/PageHeader";
import { BroadcastClient } from "@/components/admin/BroadcastClient";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import type { Broadcast } from "@/lib/models";

export default async function AdminBroadcastPage() {
  let broadcasts: Broadcast[] = [];
  try {
    broadcasts = await getAllBroadcastsAction();
  } catch (err) {
    rethrowIfNavigation(err);
    console.error("Failed to load broadcasts:", err);
  }

  return (
    <ErrorBoundary feature="Broadcasts">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Notifications"
          title="Push Notifications & Broadcasts"
          subtitle="Compose and send platform-wide announcements or alerts to your community."
        />
        <BroadcastClient initialBroadcasts={broadcasts} />
      </div>
    </ErrorBoundary>
  );
}
