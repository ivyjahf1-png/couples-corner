import { getUsersForModerationAction } from "@/lib/actions/admin";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import { PageHeader } from "@/components/app/PageHeader";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import type { ModerationUserRow } from "@/lib/server/admin";

export default async function AdminUsersPage() {
  // The admin layout owns the auth guard: unauthorized visitors redirect at the
  // layout root, where Next.js handles the navigation signal cleanly. Fetching
  // is intentionally guard-free so no redirect is ever thrown into this page's
  // own catch — the route-refresh loop's blast radius stops at the layout.
  let users: ModerationUserRow[] = [];
  try {
    users = await getUsersForModerationAction();
  } catch (err) {
    rethrowIfNavigation(err);
    console.error("Failed to load users:", err);
    throw err;
  }

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
