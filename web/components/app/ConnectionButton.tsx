"use client";

import { Button } from "@/components/ui/Button";
import type { ConnectionState } from "@/lib/feature/types";

/**
 * Connection action button covering every state in the connections model
 * (lib/models/connections.ts). `pending` swaps the label immediately on tap
 * so the button acknowledges the action before the server responds.
 */
const pendingLabels: Partial<Record<ConnectionState, string>> = {
  none: "Connecting…",
  connected: "Removing…",
  outgoing_pending: "Canceling…",
};

function pendingLabelFor(state: ConnectionState, override?: string): string {
  if (override) return override;
  return pendingLabels[state] ?? "Working…";
}
export function ConnectionButton({
  state,
  size = "sm",
  disabled,
  pending = false,
  pendingLabel,
  onConnect,
  onCancel,
  onAccept,
  onDecline,
  onRemove,
  outgoingLabel = "Cancel request",
}: {
  state: ConnectionState;
  size?: "sm" | "md";
  disabled?: boolean;
  /** Renders an immediate pending label/spinner while the server action runs. */
  pending?: boolean;
  pendingLabel?: string;
  /** Label for the outgoing_pending state (e.g. "Request Sent" on profile pages). */
  outgoingLabel?: string;
  onConnect?: () => void;
  onCancel?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onRemove?: () => void;
}) {
  const isDisabled = disabled || pending;
  const label = pending ? pendingLabelFor(state, pendingLabel) : null;

  if (state === "self") {
    return (
      <Button size={size} variant="secondary" disabled>
        This is you
      </Button>
    );
  }
  if (state === "connected") {
    return (
      <Button size={size} variant="secondary" disabled={isDisabled} aria-busy={pending} onClick={onRemove}>
        {label ?? "Remove connection"}
      </Button>
    );
  }
  if (state === "outgoing_pending") {
    return (
      <Button size={size} variant="secondary" disabled={isDisabled} aria-busy={pending} onClick={onCancel} title="Click to cancel this request">
        {label ?? outgoingLabel}
      </Button>
    );
  }
  if (state === "incoming_pending") {
    return (
      <span className="inline-flex gap-2">
        <Button size={size} variant="primary" disabled={isDisabled} aria-busy={pending} onClick={onAccept}>
          {label ?? "Accept"}
        </Button>
        <Button size={size} variant="secondary" disabled={isDisabled} aria-busy={pending} onClick={onDecline}>
          {pending ? (pendingLabel ?? "Working…") : "Decline"}
        </Button>
      </span>
    );
  }
  return (
    <Button size={size} variant="ghost" disabled={isDisabled} aria-busy={pending} onClick={onConnect}>
      {label ?? "Connect"}
    </Button>
  );
}
