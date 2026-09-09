"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ConnectionState } from "@/lib/feature/types";

/**
 * Connection action button covering every state in the connections model
 * (lib/models/connections.ts). Mutations arrive with Firebase; until then the
 * button renders honest disabled/visual states and never pretends to act.
 */
export function ConnectionButton({
  state,
  size = "sm",
  disabled,
  onConnect,
  onCancel,
  onAccept,
  onDecline,
  onRemove,
}: {
  state: ConnectionState;
  size?: "sm" | "md";
  disabled?: boolean;
  onConnect?: () => void;
  onCancel?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onRemove?: () => void;
}) {
  const [busy] = useState(false);
  const isDisabled = disabled || busy;

  if (state === "self") {
    return (
      <Button size={size} variant="secondary" disabled>
        This is you
      </Button>
    );
  }
  if (state === "connected") {
    return (
      <Button size={size} variant="secondary" disabled={isDisabled} onClick={onRemove}>
        Remove connection
      </Button>
    );
  }
  if (state === "outgoing_pending") {
    return (
      <Button size={size} variant="secondary" disabled={isDisabled} onClick={onCancel}>
        Cancel request
      </Button>
    );
  }
  if (state === "incoming_pending") {
    return (
      <span className="inline-flex gap-2">
        <Button size={size} variant="primary" disabled={isDisabled} onClick={onAccept}>
          Accept
        </Button>
        <Button size={size} variant="secondary" disabled={isDisabled} onClick={onDecline}>
          Decline
        </Button>
      </span>
    );
  }
  return (
    <Button size={size} variant="ghost" disabled={isDisabled} onClick={onConnect}>
      Connect
    </Button>
  );
}
