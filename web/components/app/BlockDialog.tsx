"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import { notifyFailure } from "@/components/ui/FailureToasts";

interface BlockDialogProps {
  targetLabel: string;
  targetUid: string;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
  triggerSize?: "sm" | "md" | "lg";
}

/**
 * Block-user confirmation dialog. Blocks are written via
 * POST/DELETE /api/safety/block — blockerId comes from the server session,
 * not the client, so users cannot forge blocks.
 */
export function BlockDialog({
  targetLabel,
  targetUid,
  triggerLabel = "Block",
  triggerVariant = "secondary",
  triggerSize = "sm",
}: BlockDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: without a signed-in viewer or a valid target uid there is nothing
  // to block — the server would reject the write and the old flow crashed
  // when the target id was null.
  const canBlock = typeof targetUid === "string" && targetUid.trim().length > 0;

  async function toggleBlock() {
    if (!canBlock) {
      const message = "This member can't be blocked right now. Please try again later.";
      setError(message);
      notifyFailure(message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/safety/block?targetUid=${encodeURIComponent(targetUid)}`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not complete action");
      }
      notifyFailure(`${targetLabel} is now blocked. You can unblock them anytime in Settings → Blocked users.`);
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      setError(message);
      notifyFailure(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size={triggerSize}
        variant={triggerVariant}
        onClick={() => setOpen(true)}
        disabled={!canBlock}
        title={canBlock ? undefined : "Blocking isn't available for this member"}
      >
        {triggerLabel}
      </Button>
      <ConfirmationDialog
        open={open}
        busy={busy}
        tone="danger"
        title={`Block ${targetLabel}?`}
        body="They won't be able to see your profile, send you requests, or message you. You also won't see them anywhere on Couples Corner. You can unblock them later from Settings → Blocked users."
        cancelLabel="Cancel"
        confirmLabel="Block user"
        onCancel={() => setOpen(false)}
        onConfirm={toggleBlock}
      />
      {error ? <p className="text-xs text-danger-300">{error}</p> : null}
    </>
  );
}
