import { requireAdmin } from "@/lib/auth/authorization";
import { getUsersForModerationAction } from "@/lib/actions/admin";
import { PageHeader } from "@/components/app/PageHeader";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export default async function AdminUsersPage() {
  await requireAdmin();
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