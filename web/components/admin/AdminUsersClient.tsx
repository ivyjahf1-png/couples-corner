"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/landing/Icon";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { ModerationUserRow } from "@/lib/server/admin";
import { setUserStatusAction } from "@/lib/actions/admin";

interface Props {
  initialUsers: ModerationUserRow[];
}

const STATUS_TONE: Record<string, "success" | "neutral" | "danger" | "brand"> = {
  active: "success",
  suspended: "danger",
  deactivated: "neutral",
};

const PAGE_SIZE = 15;

export function AdminUsersClient({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();

  function applyStatus(uid: string, status: "active" | "suspended") {
    setBusyId(uid);
    setActionError(null);
    startTransition(async () => {
      try {
        await setUserStatusAction(uid, status, `${status === "suspended" ? "Moderation ban" : "Reactivated"} by admin`);
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update user status.");
      } finally {
        setBusyId(null);
      }
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Search by name, email, role, or user ID…"
            aria-label="Search users"
            className="h-10 w-full rounded-xl border border-ink-200 bg-surface pl-9 pr-3 text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="h-10 rounded-xl border border-ink-200 bg-surface px-3 text-sm font-medium text-ink-900 focus:border-brand-400 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <p className="shrink-0 text-sm font-semibold text-ink-700" role="status">
          {filtered.length} of {users.length} users
        </p>
      </div>

      {actionError ? (
        <p role="alert" className="rounded-xl border border-danger-300 bg-danger-100 px-4 py-2.5 text-sm font-semibold text-danger-700">
          {actionError}
        </p>
      ) : null}

    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-200 bg-surface-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-900">User</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold text-ink-900 sm:table-cell">Status</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold text-ink-900 md:table-cell">Role</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold text-ink-900 lg:table-cell">Reports</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-900">Risk score</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <p className="font-semibold text-ink-900">{users.length === 0 ? "No users to moderate yet." : "No users match these filters."}</p>
                  {users.length > 0 ? (
                    <button type="button" onClick={() => { setQuery(""); setStatusFilter(""); setPage(1); }} className="mt-3 text-sm font-semibold text-brand-700 underline underline-offset-2">
                      Clear search and filters
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              paged.map((user) => {
                const highRisk = user.riskScore >= 50;
                const hasReports = user.openReportCount > 0;
                return (
                  <tr key={user.uid} className="transition hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">{user.displayName}</p>
                        <p className="truncate text-xs font-medium text-ink-600">{user.email}</p>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Chip tone={STATUS_TONE[user.status] ?? "neutral"}>{user.status}</Chip>
                    </td>
                    <td className="hidden px-4 py-3 font-medium text-ink-800 md:table-cell">{user.role}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {hasReports ? (
                        <Chip tone="danger">{user.openReportCount} open</Chip>
                      ) : (
                        <span className="font-medium text-ink-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-16 overflow-hidden rounded-full bg-ink-200">
                          <span
                            className={["h-full rounded-full", highRisk ? "bg-danger-500" : "bg-success-500"].join(" ")}
                            style={{ width: `${Math.min(user.riskScore, 100)}%` }}
                          />
                        </span>
                        <span className="text-xs font-semibold text-ink-800">{user.riskScore}</span>
                        {hasReports || highRisk ? (
                          <Icon name="flag" className="h-4 w-4 text-danger-600" aria-label="Flagged" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.status === "active" ? (
                        <Button size="sm" variant="danger" disabled={busyId === user.uid || pending} onClick={() => applyStatus(user.uid, "suspended")}>
                          {busyId === user.uid ? "Working…" : "Ban"}
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={busyId === user.uid || pending} onClick={() => applyStatus(user.uid, "active")}>
                          {busyId === user.uid ? "Working…" : "Reactivate"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-ink-200 bg-surface-muted px-4 py-3">
          <p className="text-xs font-semibold text-ink-700">Page {safePage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={safePage <= 1 || pending} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={safePage >= totalPages || pending} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}