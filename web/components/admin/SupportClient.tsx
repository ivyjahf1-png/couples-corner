"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/landing/Icon";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  SUPPORT_STATUSES,
  type SupportTicketStatus,
} from "@/lib/models";
import {
  getSupportTicketsAction,
  updateSupportTicketAction,
} from "@/lib/actions/support";
import type { SupportTicketRow } from "@/lib/server/support";

interface Props {
  initialTickets: SupportTicketRow[];
}

const STATUS_TONE: Record<string, "neutral" | "brand" | "success" | "danger"> = {
  open: "danger",
  in_progress: "brand",
  resolved: "success",
  closed: "neutral",
};

export function SupportClient({ initialTickets }: Props) {
  const [tickets, setTickets] = useState<SupportTicketRow[]>(initialTickets);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<SupportTicketRow | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function refresh(filter = statusFilter) {
    startTransition(async () => {
      const data = await getSupportTicketsAction(filter ? { status: filter as SupportTicketStatus } : {});
      setTickets(data);
    });
  }

  function handleFilter(value: string) {
    setStatusFilter(value);
    refresh(value);
  }

  function openTicket(t: SupportTicketRow) {
    setSelected(t);
    setReply(t.adminReply ?? "");
    setError(null);
  }

  async function submitUpdate(next: { status?: SupportTicketStatus; adminReply?: string }) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await updateSupportTicketAction(selected.id, next);
      const updated = {
        ...selected,
        status: next.status ?? selected.status,
        adminReply: typeof next.adminReply === "string" ? next.adminReply.trim() || null : selected.adminReply,
      };
      setSelected(updated);
      setTickets((prev) => prev.map((t) => (t.id === selected.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ticket.");
    } finally {
      setBusy(false);
    }
  }
return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Left: ticket list */}
      <div className="lg:col-span-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter tickets">
          {["", ...SUPPORT_STATUSES].map((s) => (
            <button
              key={s || "all"}
              role="tab"
              aria-selected={statusFilter === s}
              onClick={() => handleFilter(s)}
              className={[
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                statusFilter === s
                  ? "border-brand-600 bg-brand-100 text-brand-800"
                  : "border-ink-200 text-ink-700 hover:bg-surface-muted",
              ].join(" ")}
            >
              {s ? s.replace(/_/g, " ") : "All"}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-surface-muted px-6 py-14 text-center">
              <Icon name="chat" className="mx-auto h-8 w-8 text-ink-400" />
              <p className="mt-3 font-semibold text-ink-900">No tickets</p>
              <p className="mt-1 text-sm text-ink-600">
                {statusFilter ? `No ${statusFilter} tickets.` : "No support inquiries yet."}
              </p>
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className={[
                  "rounded-2xl border bg-surface p-4 text-left transition hover:border-brand-300",
                  selected?.id === t.id ? "border-brand-400 ring-1 ring-brand-200" : "border-ink-200",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-ink-900">{t.subject}</p>
                  <Chip tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status.replace(/_/g, " ")}</Chip>
                </div>
                <p className="mt-1 truncate text-sm text-ink-600">{t.email}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {t.category} · {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: detail */}
      <div className="lg:col-span-3">
        {!selected ? (
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-surface-muted px-6 text-center">
            <Icon name="chat" className="h-10 w-10 text-ink-400" />
            <p className="mt-3 font-semibold text-ink-900">Select a ticket</p>
            <p className="mt-1 text-sm text-ink-600">Choose a ticket on the left to view and respond.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 rounded-2xl border border-ink-200 bg-surface p-6 shadow-sm">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={STATUS_TONE[selected.status] ?? "neutral"}>{selected.status.replace(/_/g, " ")}</Chip>
                <Chip tone="brand">{selected.category}</Chip>
              </div>
              <h2 className="mt-3 text-xl font-bold text-ink-900">{selected.subject}</h2>
              <p className="mt-1 text-sm text-ink-600">
                From {selected.email} · {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-surface-muted px-4 py-4 text-sm leading-6 text-ink-800">
              {selected.message}
            </div>

            {selected.adminReply ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-4 text-sm leading-6 text-ink-800">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">Your reply</p>
                {selected.adminReply}
              </div>
            ) : null}

            {error ? <p className="text-sm font-medium text-danger-700">{error}</p> : null}

            <div className="flex flex-col gap-3 border-t border-ink-200 pt-4">
              <label className="text-sm font-medium text-ink-800">
                Reply
                <textarea
                  rows={4}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
                  placeholder="Write a response…"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" disabled={busy || pending || !reply.trim()} onClick={() => submitUpdate({ adminReply: reply })}>
                  Send reply
                </Button>
                <select
                  value={selected.status}
                  onChange={(e) => submitUpdate({ status: e.target.value as SupportTicketStatus })}
                  disabled={busy || pending}
                  className="h-9 rounded-xl border border-ink-200 bg-surface px-3 text-sm text-ink-800"
                  aria-label="Change status"
                >
                  {SUPPORT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}