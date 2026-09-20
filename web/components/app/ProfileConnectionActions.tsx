"use client";

import { useEffect, useState, useTransition } from "react";
import { ConnectionButton } from "@/components/app/ConnectionButton";
import {
  getConnectionStateAction,
  sendConnectionAction,
  cancelRequestAction,
  type ActionResult,
} from "@/lib/actions/connections";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";
import type { ConnectionState } from "@/lib/feature/types";

/**
 * Profile-page connection widget. Fetches the real connection state between
 * the signed-in viewer and this profile (never trusts the client for the
 * actor identity — server actions re-resolve the session), then wires the
 * Connect / Cancel-request flow with immediate "Request Sent" feedback.
 */
export function ProfileConnectionActions({
  targetUserId,
  viewerUid,
}: {
  targetUserId: string;
  viewerUid: string | null;
}) {
  const [state, setState] = useState<ConnectionState>(viewerUid ? "none" : "none");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(viewerUid !== null);
  const [pending, startTransition] = useTransition();
  const [error, reportError] = useActionError();

  // Guard: without a signed-in viewer or a valid target id there is nothing to
  // act on — opening a modal or firing a mutation would crash on `.id`.
  const canAct = Boolean(viewerUid) && typeof targetUserId === "string" && targetUserId.trim().length > 0;

  useEffect(() => {
    if (!viewerUid) return;
    let mounted = true;
    setLoadingState(true);
    getConnectionStateAction(targetUserId)
      .then((res) => {
        if (!mounted) return;
        setState(res.state);
        setRequestId(res.requestId);
      })
      .catch(() => {
        if (mounted) setState("none");
      })
      .finally(() => {
        if (mounted) setLoadingState(false);
      });
    return () => {
      mounted = false;
    };
  }, [targetUserId, viewerUid]);

  function run(fn: () => Promise<ActionResult>) {
    reportError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        reportError(failureMessage(result.error ?? "Something went wrong", result.error ?? "That didn't go through. Please try again."));
        return;
      }
      // Refresh the authoritative state server-side after any mutation.
      const fresh = await getConnectionStateAction(targetUserId);
      setState(fresh.state);
      setRequestId(fresh.requestId);
    });
  }

  if (!canAct) {
    // Not signed in (or no target) — show an inert button instead of a crash.
    return <ConnectionButton state="none" disabled pendingLabel="Unavailable" />;
  }

  if (state === "self") {
    return (
      <ConnectionButton state="self" disabled />
    );
  }

  if (!viewerUid || loadingState) {
    return (
      <ConnectionButton state="none" disabled pending pendingLabel="Loading…" />
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <ConnectionButton
        state={state}
        disabled={pending}
        pending={pending}
        outgoingLabel="Request Sent"
        onConnect={() => {
          const targetId = targetUserId?.trim();
          if (!targetId) {
            reportError("This profile can't accept connection requests right now.");
            return;
          }
          run(() => sendConnectionAction(targetId));
        }}
        onCancel={() => {
          const rid = requestId?.trim();
          if (!rid) {
            reportError("This request is no longer available.");
            return;
          }
          run(() => cancelRequestAction(rid));
        }}
      />
      {error ? (
        <p role="alert" className="text-xs text-danger-300">{error}</p>
      ) : null}
    </div>
  );
}
