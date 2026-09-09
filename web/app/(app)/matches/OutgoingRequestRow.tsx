"use client";

import { Avatar } from "@/components/app/Avatar";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import { Button } from "@/components/ui/Button";
import type { ConnectionRowView } from "@/lib/feature/types";

/** Outgoing request row — client component so it can host the confirm dialog. */
export function OutgoingRequestRow({ person }: { person: ConnectionRowView }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
      <Avatar name={person.name} kind={person.kind} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink-900">{person.name}</p>
        <p className="truncate text-sm text-ink-600">{person.location}</p>
      </div>
      <ConfirmationDialog
        title="Cancel request?"
        body={`Your connection request to ${person.name} will be withdrawn.`}
        confirmLabel="Cancel request"
        onConfirm={() => {}}
      >
        {(open) => (
          <Button size="sm" variant="secondary" onClick={open}>
            Cancel
          </Button>
        )}
      </ConfirmationDialog>
    </div>
  );
}