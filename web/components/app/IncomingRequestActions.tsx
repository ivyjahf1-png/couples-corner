"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { respondRequestAction } from "@/lib/actions/connections";

/** Accept/decline buttons for an incoming connection request (server actions). */
export function IncomingRequestActions({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await respondRequestAction(requestId, true);
          })
        }
      >
        Accept
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await respondRequestAction(requestId, false);
          })
        }
      >
        Decline
      </Button>
    </div>
  );
}
