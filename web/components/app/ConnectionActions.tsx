"use client";

import { useTransition } from "react";
import { ConnectionButton } from "@/components/app/ConnectionButton";
import {
  sendConnectionAction,
  cancelRequestAction,
  respondRequestAction,
  removeConnectionAction,
  type ActionResult,
} from "@/lib/actions/connections";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";
import type { ProfileCardView } from "@/lib/feature/types";

/**
 * Client bridge between ProfileCard and the connection Server Actions. The
 * acting user is always derived server-side inside the actions — this
 * component only supplies the target ids and renders the result.
 *
 * Every handler guards its target id first: a missing profile id or request
 * id would otherwise reach the database layer and crash on `.id`.
 */
export function ConnectionActions({
  view,
  requestId,
}: {
  view: ProfileCardView;
  /** Request id when a pending request exists (cancel/accept/decline). */
  requestId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, reportError] = useActionError();

  const hasTargetId = typeof view.id === "string" && view.id.trim().length > 0;

  function run(fn: () => Promise<ActionResult>) {
    reportError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        reportError(failureMessage(result.error ?? "Something went wrong", result.error ?? "That didn't go through. Please try again."));
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConnectionButton
        state={view.connection}
        disabled={pending || !hasTargetId}
        pending={pending}
        onConnect={() => {
          if (!hasTargetId || !view.id?.trim()) {
            reportError("This profile can't accept connection requests right now.");
            return;
          }
          run(() => sendConnectionAction(view.id));
        }}
        onCancel={() => {
          if (!requestId?.trim()) {
            reportError("This request is no longer available.");
            return;
          }
          run(() => cancelRequestAction(requestId));
        }}
        onAccept={() => {
          if (!requestId?.trim()) {
            reportError("This request is no longer available.");
            return;
          }
          run(() => respondRequestAction(requestId, true));
        }}
        onDecline={() => {
          if (!requestId?.trim()) {
            reportError("This request is no longer available.");
            return;
          }
          run(() => respondRequestAction(requestId, false));
        }}
        onRemove={() => {
          if (!requestId?.trim()) {
            reportError("This connection is no longer available.");
            return;
          }
          run(() => removeConnectionAction(requestId));
        }}
      />
      {error ? (
        <p role="alert" className="text-xs text-danger-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
