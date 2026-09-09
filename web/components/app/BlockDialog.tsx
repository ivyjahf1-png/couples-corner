"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";

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

  async function toggleBlock() {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      setError(message);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button size={triggerSize} variant={triggerVariant} onClick={() => setOpen(true)}>
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
      {error ? <p className="text-xs text-danger-700">{error}</p> : null}
    </>
  );
}
