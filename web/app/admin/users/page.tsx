import { requireAdminDev } from "@/lib/auth/authorization";
import { getUsersForModerationAction } from "@/lib/actions/admin";
import { PageHeader } from "@/components/app/PageHeader";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export default async function AdminUsersPage() {
  // Layout already guards via requireAdminDev; re-assert here so direct
  // deep-links get the same dev-aware admin check (no strict prod-only 404).
  await requireAdminDev();
  const users = await getUsersForModerationAction();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Users"
        title="User Moderation & Safety"
        subtitle="Manage user accounts, apply bans, and review safety risk signals."
      />
      <AdminUsersClient initialUsers={users} />
    </div>
  );
}