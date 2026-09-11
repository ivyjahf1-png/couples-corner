import { requireAdmin } from "@/lib/auth/authorization";
import { getAllBroadcastsAction } from "@/lib/actions/broadcast";
import { PageHeader } from "@/components/app/PageHeader";
import { BroadcastClient } from "@/components/admin/BroadcastClient";

export default async function AdminBroadcastPage() {
  await requireAdmin();
  const broadcasts = await getAllBroadcastsAction();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Notifications"
        title="Push Notifications & Broadcasts"
        subtitle="Compose and send platform-wide announcements or alerts to your community."
      />
      <BroadcastClient initialBroadcasts={broadcasts} />
    </div>
  );
}