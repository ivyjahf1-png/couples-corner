"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import type { SecurityActionResult } from "@/lib/actions/security";

export interface BlockedUserRow {
  uid: string;
  email: string;
  displayName: string | null;
  status: string;
  createdAt: string;
}

interface Props {
  initialBlocked: BlockedUserRow[];
  onUnblock: (uid: string) => Promise<SecurityActionResult>;
}

export function AdminBlockedUsers({ initialBlocked, onUnblock }: Props) {
  const [blocked, setBlocked] = useState<BlockedUserRow[]>(initialBlocked);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  async function handleUnblock(uid: string) {
    setBusyUid(uid);
    try {
      const result = await onUnblock(uid);
      if (result.ok) {
        setBlocked((prev) => prev.filter((u) => u.uid !== uid));
      }
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Blocked user accounts</h3>

      {blocked.length === 0 ? (
        <p className="text-sm text-slate-400">No blocked users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-orange-500/20 bg-slate-900-muted">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-300">User</th>
                <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                <th className="px-4 py-3 font-medium text-slate-300">Joined</th>
                <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {blocked.map((user) => (
                <tr key={user.uid}>
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">
                        {user.displayName ?? "Anonymous"}
                      </p>
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone="danger">{user.status}</Chip>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                                    <td className="px-4 py-3">
                    <ConfirmationDialog
                      title="Unblock user?"
                      body={`Unblock ${user.displayName ?? user.email}? They will be able to sign in again.`}
                      confirmLabel="Unblock"
                      tone="secondary"
                      busy={busyUid === user.uid}
                      onConfirm={() => handleUnblock(user.uid)}
                    >
                      {() => (
                        <Button size="sm" variant="secondary" disabled={busyUid === user.uid}>
                          Unblock
                        </Button>
                      )}
                    </ConfirmationDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}