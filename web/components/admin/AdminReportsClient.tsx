"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/landing/Icon";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { AdminReportRow } from "@/lib/server/admin";
import { reviewReportAction } from "@/lib/actions/admin";

interface Props {
  initialReports: AdminReportRow[];
}

const FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Open", value: "open" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Resolved", value: "resolved" },
  { label: "Dismissed", value: "dismissed" },
];

const PRIORITY_TONE: Record<string, "danger" | "brand" | "neutral" | "success"> = {
  urgent: "danger",
  high: "brand",
  medium: "neutral",
  low: "neutral",
};

const STATUS_TONE: Record<string, "danger" | "brand" | "neutral" | "success"> = {
  open: "danger",
  reviewed: "brand",
  resolved: "success",
  dismissed: "neutral",
};

export function AdminReportsClient({ initialReports }: Props) {
  const [filter, setFilter] = useState("");
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = filter ? reports.filter((r) => r.status === filter) : reports;

  function applyAction(reportId: string, status: "resolved" | "dismissed" | "open") {
    setBusyId(reportId);
    startTransition(async () => {
      await reviewReportAction(reportId, status);
      // Move the row: either back to open, or remove from the visible queue.
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status }
            : r
        )
      );
      setBusyId(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter reports">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={[
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              filter === f.value
                ? "border-brand-600 bg-brand-100 text-brand-800"
                : "border-ink-200 bg-surface text-ink-700 hover:bg-surface-muted",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-200 bg-surface-muted px-6 py-16 text-center">
          <Icon name="flag" className="h-10 w-10 text-ink-400" />
          <div>
            <p className="text-lg font-semibold text-ink-900">No reports</p>
            <p className="mt-1 text-sm text-ink-600">
              {filter ? `No ${filter} reports right now.` : "There are no reports in the queue."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((report) => (
            <article
              key={report.id}
              className="rounded-2xl border border-ink-200 bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-700">
                    <Icon name="flag" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">{report.reason}</p>
                    <p className="text-xs text-ink-600">
                      {report.entityType} · reported by {report.reporterName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone={PRIORITY_TONE[report.priority] ?? "neutral"}>{report.priority}</Chip>
                  <Chip tone={STATUS_TONE[report.status] ?? "neutral"}>{report.status}</Chip>
                </div>
              </div>

              {report.details ? (
                <p className="mt-3 rounded-xl bg-surface-muted px-4 py-3 text-sm leading-6 text-ink-700">
                  {report.details}
                </p>
              ) : null}

              <p className="mt-2 text-xs text-ink-500">
                Target: <code className="rounded bg-ink-100 px-1 py-0.5">{report.entityId}</code>
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {report.status !== "resolved" && report.status !== "dismissed" && (
                  <Button size="sm" variant="ghost" disabled={busyId === report.id || pending} onClick={() => applyAction(report.id, "resolved")}>
                    Resolve
                  </Button>
                )}
                {report.status !== "dismissed" && report.status !== "resolved" && (
                  <Button size="sm" variant="secondary" disabled={busyId === report.id || pending} onClick={() => applyAction(report.id, "dismissed")}>
                    Dismiss
                  </Button>
                )}
                {report.status !== "open" && (
                  <Button size="sm" variant="secondary" disabled={busyId === report.id || pending} onClick={() => applyAction(report.id, "open")}>
                    Reopen
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}