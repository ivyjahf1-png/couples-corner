import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Card } from "@/components/ui/Card";
import { listBlocked } from "@/lib/server/safety";
import { getSessionUser } from "@/lib/auth/authorization";
import type { BlockedUser } from "@/lib/feature/types";
import { BlockedRowClient } from "./BlockedRowClient";

export default async function BlockedUsersPage() {
  const session = await getSessionUser();
  const blocked: BlockedUser[] = session ? await listBlocked(session.uid) : [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Safety"
        title="Blocked users"
        subtitle="People you've blocked can't see your profile, send you requests, or message you."
      />

      {blocked.length === 0 ? (
        <EmptyState
          icon="lock"
          title="No blocked users"
          body="Users you block will appear here. You can unblock them at any time from this list."
        />
      ) : (
        <Card padding="none" className="divide-y divide-ink-200">
          {blocked.map((entry) => (
            <BlockedRowClient key={entry.id} entry={entry} />
          ))}
        </Card>
      )}
    </div>
  );
}
