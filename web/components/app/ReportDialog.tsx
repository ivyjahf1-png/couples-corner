"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { REPORT_REASONS, type ReportReason } from "@/lib/models/safety";

export interface ReportDialogProps {
  targetLabel: string;
  entityType: "user" | "couple" | "post" | "comment" | "message";
  entityId: string;
  triggerLabel?: string;
  triggerVariant?: "secondary" | "ghost";
  triggerSize?: "sm" | "md";
}

export function ReportDialog({
  targetLabel,
  entityType,
  entityId,
  triggerLabel = "Report",
  triggerVariant = "secondary",
  triggerSize = "sm",
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/safety/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, reason, details: details || null }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not submit report");
      }
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setSubmitted(false);
    setDetails("");
    setError(null);
  }

  return (
    <>
      <Button size={triggerSize} variant={triggerVariant} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            className="w-full max-w-md rounded-2xl border border-ink-200 bg-surface p-6 shadow-floating"
            onClick={(event) => event.stopPropagation()}
          >
            {submitted ? (
              <div className="flex flex-col gap-3 text-center">
                <h2 id="report-dialog-title" className="text-lg font-semibold text-ink-900">
                  Thank you
                </h2>
                <p className="text-sm leading-6 text-ink-600">
                  Your report about {targetLabel} has been recorded for review. The person you
                  reported won&apos;t be told who filed it.
                </p>
                <div className="mt-2 flex justify-center">
                  <Button size="sm" onClick={close}>Done</Button>
                </div>
              </div>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div>
                  <h2 id="report-dialog-title" className="text-lg font-semibold text-ink-900">
                    Report {targetLabel}
                  </h2>
                  <p className="mt-1 text-sm text-ink-600">
                    Reports are confidential and help keep Couples Corner safe.
                  </p>
                </div>

                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium text-ink-800">Reason</legend>
                  {REPORT_REASONS.map((option) => (
                    <label key={option} className="flex items-center gap-2.5 text-sm text-ink-700">
                      <input
                        type="radio"
                        name="report-reason"
                        value={option}
                        checked={reason === option}
                        onChange={() => setReason(option)}
                        className="h-4 w-4 accent-brand-700"
                      />
                      {option}
                    </label>
                  ))}
                </fieldset>

                <div>
                  <label htmlFor="report-details" className="text-sm font-medium text-ink-800">
                    Additional details <span className="font-normal text-ink-500">(optional)</span>
                  </label>
                  <textarea
                    id="report-details"
                    rows={3}
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
                    placeholder="Tell us what happened…"
                  />
                </div>

                {error ? <p className="text-sm text-danger-700">{error}</p> : null}

                <div className="flex justify-end gap-2">
                  <Button size="sm" type="button" variant="secondary" onClick={close} disabled={busy}>
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" variant="danger" disabled={busy}>
                    {busy ? "Submitting…" : "Submit report"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

