"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/landing/Icon";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { ModerationUserRow } from "@/lib/server/admin";
import { setUserStatusAction } from "@/lib/actions/admin";
import { TIER_LABELS, SUBSCRIPTION_TIERS, type SubscriptionTierName } from "@/lib/models/wallet";

interface Props { initialUsers: ModerationUserRow[]; }

const STATUS_TONE: Record<string, "success" | "neutral" | "danger" | "brand"> = {
  active: "success", suspended: "danger", deactivated: "neutral",
};

const TIER_TONE: Record<SubscriptionTierName, "success" | "neutral" | "brand"> = {
  free: "neutral",
  premium: "success",
  vip: "brand",
};

export function AdminUsersClient({ initialUsers }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick-edit modal state — tier + coin balance.
  const [editing, setEditing] = useState<ModerationUserRow | null>(null);
  const [editTier, setEditTier] = useState<SubscriptionTierName>("free");
  const [editBalance, setEditBalance] = useState("0");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openEdit(user: ModerationUserRow) {
    setEditing(user);
    setEditTier(user.subscriptionTier);
    setEditBalance(String(user.coinBalance));
    setEditError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: editing.uid,
          subscriptionTier: editTier,
          coinBalance: Number(editBalance),
          reason: "Manual adjustment from admin users table",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === editing.uid
            ? { ...u, subscriptionTier: editTier, coinBalance: Number(editBalance) }
            : u
        )
      );
      setEditing(null);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  function applyStatus(uid: string, status: "active" | "suspended") {
    setBusyId(uid);
    setPending(true);
    setError(null);
    void (async () => {
      try {
        await setUserStatusAction(uid, status, `${status === "suspended" ? "Moderation ban" : "Reactivated"} by admin`);
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update user status.");
      } finally {
        setBusyId(null);
        setPending(false);
      }
    })();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-500/20 bg-slate-900">
      {error ? (
        <p role="alert" className="border-b border-orange-500/20 bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-orange-500/20 bg-slate-900-muted">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">User</th>
              <th className="hidden px-4 py-3 font-medium text-slate-300 sm:table-cell">Status</th>
              <th className="hidden px-4 py-3 font-medium text-slate-300 md:table-cell">Role</th>
              <th className="hidden px-4 py-3 font-medium text-slate-300 md:table-cell">Tier</th>
              <th className="hidden px-4 py-3 font-medium text-slate-300 md:table-cell">Coins</th>
              <th className="hidden px-4 py-3 font-medium text-slate-300 lg:table-cell">Reports</th>
              <th className="px-4 py-3 font-medium text-slate-300">Risk score</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
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
                        <p className="truncate font-medium text-white">{user.displayName}</p>
                        <p className="truncate text-xs text-slate-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Chip tone={STATUS_TONE[user.status] ?? "neutral"}>{user.status}</Chip>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-400 md:table-cell">{user.role}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Chip tone={TIER_TONE[user.subscriptionTier] ?? "neutral"}>
                        {TIER_LABELS[user.subscriptionTier]}
                      </Chip>
                    </td>
                    <td className="hidden px-4 py-3 font-semibold text-amber-300 md:table-cell">
                      🪙 {user.coinBalance.toLocaleString()}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {hasReports ? (
                        <Chip tone="danger">{user.openReportCount} open</Chip>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={["inline-flex h-2 w-16 overflow-hidden rounded-full bg-slate-700", highRisk ? "text-red-400" : "text-emerald-400"].join(" ")}>
                          <span className={["h-full rounded-full", highRisk ? "bg-red-600" : "bg-emerald-600"].join(" ")} style={{ width: `${Math.min(user.riskScore, 100)}%` }} />
                        </span>
                        <span className="text-xs text-slate-400">{user.riskScore}</span>
                        {hasReports || highRisk ? (
                          <Icon name="flag" className="h-4 w-4 text-red-400" aria-label="Flagged" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="ghost" disabled={busyId === user.uid || pending} onClick={() => openEdit(user)}>
                          Edit
                        </Button>
                        {user.status === "active" ? (
                          <Button size="sm" variant="danger" disabled={busyId === user.uid || pending} onClick={() => applyStatus(user.uid, "suspended")}>
                            Ban
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled={busyId === user.uid || pending} onClick={() => applyStatus(user.uid, "active")}>
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick-edit modal — tier + coin balance via /api/admin/users/update */}
      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Edit user wallet"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setEditing(null);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-orange-500/30 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Edit membership</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close editor"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 truncate text-sm text-slate-400">
              {editing.displayName} · {editing.email}
            </p>

            <label className="mt-5 block text-sm font-medium text-slate-300" htmlFor="tier-select">
              VIP Membership tier
            </label>
            <select
              id="tier-select"
              value={editTier}
              onChange={(e) => setEditTier(e.target.value as SubscriptionTierName)}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white"
            >
              {SUBSCRIPTION_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {TIER_LABELS[tier]}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-sm font-medium text-slate-300" htmlFor="balance-input">
              Coin balance
            </label>
            <input
              id="balance-input"
              type="number"
              min={0}
              step={1}
              value={editBalance}
              onChange={(e) => setEditBalance(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white"
            />

            {editError ? (
              <p role="alert" className="mt-3 rounded-xl border border-red-500/40 bg-red-950/60 px-3 py-2 text-sm text-red-300">
                {editError}
              </p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <Button variant="ghost" disabled={saving} onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void saveEdit()}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}