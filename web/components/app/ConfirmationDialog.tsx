"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Accessible confirmation dialog. Used for destructive or sensitive actions
 * (remove connection, sign out, safety actions). Focus moves into the dialog
 * on open; Escape closes; backdrop click closes.
 *
 * Usage:
 *   // Controlled (renders nothing until `open` is true):
 *   <ConfirmationDialog open={open} onCancel={() => setOpen(false)} ... />
 *
 *   // Render-prop (children receives the open handler):
 *   <ConfirmationDialog title="..." body="..." onConfirm={...}>
 *     {(open) => <Button onClick={open}>Trigger</Button>}
 *   </ConfirmationDialog>
 */
export function ConfirmationDialog({
  open: controlledOpen,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel: controlledOnCancel,
  children,
  busy = false,
}: {
  /** Controlled open state. Omit to use the render-prop pattern. */
  open?: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger" | "secondary";
  onConfirm: () => void;
  /** Cancel handler (controlled mode). Omit to use the render-prop pattern. */
  onCancel?: () => void;
  /** Render-prop pattern: children receives the open handler. */
  children?: (open: () => void) => ReactNode;
  busy?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (controlledOnCancel) controlledOnCancel();
        else setUncontrolledOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, controlledOnCancel]);

  const renderChildren = children ? children(() => setUncontrolledOpen(true)) : null;

  if (!open) return renderChildren;

  return (
    <>
      {renderChildren}
      <div
        role="presentation"
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm"
        onClick={() => {
          if (controlledOnCancel) controlledOnCancel();
          else setUncontrolledOpen(false);
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          className="w-full max-w-md rounded-2xl border border-ink-200 bg-surface p-6 shadow-floating"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id={titleId} className="text-lg font-semibold text-ink-900">{title}</h2>
          <div id={bodyId} className="mt-2 text-sm leading-6 text-ink-600">{body}</div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (controlledOnCancel) controlledOnCancel();
                else setUncontrolledOpen(false);
              }}
              disabled={busy}
            >
              {cancelLabel}
            </Button>
            <Button
              size="sm"
              variant={tone === "danger" ? "danger" : tone === "secondary" ? "secondary" : "primary"}
              onClick={onConfirm}
              disabled={busy}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
