"use client";

import { useState, useEffect, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { Chip } from "@/components/ui/Chip";
import type { UserSession } from "@/lib/server/security";
import {
  getUserSessionsAction,
  revokeSessionAction,
  revokeAllSessionsAction,
  type SecurityActionResult,
} from "@/lib/actions/security";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";

interface Props {
  uid: string;
}

export function AdminSessionsPanel({ uid }: Props) {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, startAction] = useTransition();

  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function loadSessions() {
    try {
      const data = await getUserSessionsAction(uid);
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }

  function handleRevoke(sessionId: string) {
    startAction(async () => {
      const result: SecurityActionResult = await revokeSessionAction(uid, sessionId);
      if (result.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, revoked: true } : s))
        );
      }
    });
  }

  function handleRevokeAll() {
    startAction(async () => {
      const result: SecurityActionResult = await revokeAllSessionsAction(uid);
      if (result.ok) {
        setSessions((prev) => prev.map((s) => ({ ...s, revoked: true })));
      }
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-900/40 text-orange-400">
            <Icon name="bell" className="h-5 w-5" />
          </span>
          <h3 className="text-lg font-semibold text-white">Active sessions</h3>
        </div>
        <Button
          size="sm"
          variant="danger"
          disabled={actionBusy || sessions.filter((s) => !s.revoked).length === 0}
          onClick={handleRevokeAll}
        >
          {actionBusy ? "Revoking…" : "Revoke all"}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-slate-400">No active sessions for this user.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-xl border border-orange-500/20 p-3"
            >
              <div className="flex items-center gap-3">
                <Icon
                  name={session.revoked ? "lock" : "sparkle"}
                  className={`h-5 w-5 ${session.revoked ? "text-red-400" : "text-emerald-400"}`}
                />
                <div>
                  <p className="font-medium text-white">{session.device}</p>
                  <p className="text-xs text-slate-400">
                    {session.ip ? `IP: ${session.ip}` : "IP: unknown"}
                    {session.lastSeenAt
                      ? ` · Last seen: ${new Date(session.lastSeenAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
              </div>
                            <div className="flex items-center gap-2">
                {session.revoked && <Chip tone="danger">Revoked</Chip>}
                {!session.revoked && (
                  <ConfirmationDialog
                    title="Revoke session?"
                    body="This device will be signed out immediately."
                    confirmLabel="Revoke"
                    tone="danger"
                    busy={actionBusy}
                    onConfirm={() => handleRevoke(session.id)}
                  >
                    {() => (
                      <Button size="sm" variant="ghost">
                        Revoke
                      </Button>
                    )}
                  </ConfirmationDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}