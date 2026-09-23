import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { respondRequestAction } from "@/lib/actions/connections";

/** Accept/decline buttons for an incoming connection request (server actions). */
export function IncomingRequestActions({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [responding, setResponding] = useState<"accept" | "decline" | null>(null);

  function respond(accept: boolean) {
    if (pending) return;
    setResponding(accept ? "accept" : "decline");
    startTransition(async () => {
      try {
        await respondRequestAction(requestId, accept);
      } finally {
        setResponding(null);
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="primary"
        disabled={pending}
        aria-busy={responding === "accept"}
        onClick={() => respond(true)}
      >
        {responding === "accept" ? "Accepting…" : "Accept"}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        aria-busy={responding === "decline"}
        onClick={() => respond(false)}
      >
        {responding === "decline" ? "Declining…" : "Decline"}
      </Button>
    </div>
  );
}
