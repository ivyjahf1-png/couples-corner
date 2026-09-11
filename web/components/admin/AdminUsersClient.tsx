"use client";

import { useState, useTransition } from "react";
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

export function AdminUsersClient({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyStatus(uid: string, status: "active" | "suspended") {
    setBusyId(uid);
    startTransition(async () => {
      await setUserStatusAction(uid, status, `${status === "suspended" ? "Moderation ban" : "Reactivated"} by admin`);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
      setBusyId(null);
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-200 bg-surface-muted">
            <tr>
              <th className="px-4 py-3 font-medium text-ink-700">User</th>
              <th className="hidden px-4 py-3 font-medium text-ink-700 sm:table-cell">Status</th>
              <th className="hidden px-4 py-3 font-medium text-ink-700 md:table-cell">Role</th>
              <th className="hidden px-4 py-3 font-medium text-ink-700 lg:table-cell">Reports</th>
              <th className="px-4 py-3 font-medium text-ink-700">Risk score</th>
              <th className="px-4 py-3 font-medium text-ink-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-ink-600">
                  No users to moderate yet.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const highRisk = user.riskScore >= 50;
                const hasReports = user.openReportCount > 0;
                return (
                  <tr key={user.uid}>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">{user.displayName}</p>
                        <p className="truncate text-xs text-ink-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Chip tone={STATUS_TONE[user.status] ?? "neutral"}>{user.status}</Chip>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-600 md:table-cell">{user.role}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {hasReports ? (
                        <Chip tone="danger">{user.openReportCount} open</Chip>
                      ) : (
                        <span className="text-ink-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "inline-flex h-2 w-16 overflow-hidden rounded-full bg-ink-200",
                            highRisk ? "text-danger-600" : "text-success-600",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "h-full rounded-full",
                              highRisk ? "bg-danger-500" : "bg-success-500",
                            ].join(" ")}
                            style={{ width: `${Math.min(user.riskScore, 100)}%` }}
                          />
                        </span>
                        <span className="text-xs text-ink-600">{user.riskScore}</span>
                        {hasReports || highRisk ? (
                          <Icon name="flag" className="h-4 w-4 text-danger-600" aria-label="Flagged" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.status === "active" ? (
                        <Button size="sm" variant="danger" disabled={busyId === user.uid || pending} onClick={() => applyStatus(user.uid, "suspended")}>
                          Ban
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={busyId === user.uid || pending} onClick={() => applyStatus(user.uid, "active")}>
                          Reactivate
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
    </div>
  );
}