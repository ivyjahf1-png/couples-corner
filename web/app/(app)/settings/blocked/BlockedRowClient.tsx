"use client";

import { useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import { unblockUserAction } from "@/lib/actions/safety";
import type { BlockedUser } from "@/lib/feature/types";

export function BlockedRowClient({
  entry,
}: {
  entry: BlockedUser;
}) {
  const [busy, setBusy] = useState(false);

  const handleUnblock = async () => {
    setBusy(true);
    try {
      await unblockUserAction(entry.targetUid);
    } catch (error) {
      console.error("unblock error", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Avatar name={entry.displayName} kind={entry.kind} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink-900">{entry.displayName}</p>
        <p className="truncate text-sm text-ink-600">
          {entry.blockedAt && new Date(entry.blockedAt).toLocaleDateString()}
        </p>
      </div>
      <ConfirmationDialog
        title={`Unblock ${entry.displayName}?`}
        body="They'll be able to see your profile, send you requests, and message you again. You can re-block them later from here."
        confirmLabel="Unblock user"
        tone="secondary"
        busy={busy}
        onConfirm={handleUnblock}
        onCancel={() => {}}
      ></ConfirmationDialog>
    </div>
  );
}
