"use client";

import { useState, useTransition } from "react";
import { ConnectionButton } from "@/components/app/ConnectionButton";
import {
  sendConnectionAction,
  cancelRequestAction,
  respondRequestAction,
  removeConnectionAction,
  type ActionResult,
} from "@/lib/actions/connections";
import type { ProfileCardView } from "@/lib/feature/types";

/**
 * Client bridge between ProfileCard and the connection Server Actions. The
 * acting user is always derived server-side inside the actions — this
 * component only supplies the target ids and renders the result.
 */
export function ConnectionActions({
  view,
  requestId,
}: {
  view: ProfileCardView;
  /** Firestore request id when a pending request exists (cancel/accept/decline). */
  requestId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConnectionButton
        state={view.connection}
        disabled={pending}
        onConnect={() => run(() => sendConnectionAction(view.id))}
        onCancel={() => run(() => cancelRequestAction(requestId ?? ""))}
        onAccept={() => run(() => respondRequestAction(requestId ?? "", true))}
        onDecline={() => run(() => respondRequestAction(requestId ?? "", false))}
        onRemove={() => run(() => removeConnectionAction(requestId ?? ""))}
      />
      {error ? (
        <p role="alert" className="text-xs text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
