"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import {
  listSecuritySessionsAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "@/lib/actions/security";
import type { SecuritySession } from "@/lib/server/account-security";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Active device sessions — list, sign out one, or sign out all others. */
export function SessionsList({ initialSessions }: { initialSessions: SecuritySession[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SecuritySession[]>(initialSessions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const othersCount = sessions.filter((s) => !s.isCurrent).length;

  const refresh = async () => {
    const result = await listSecuritySessionsAction();
    if (result.ok) {
      setSessions(result.sessions);
      router.refresh();
    } else {
      setError(result.error ?? "Could not refresh sessions.");
    }
  };

  const revoke = async (sessionId: string) => {
    setError(null);
    setBusyId(sessionId);
    try {
      const result = await revokeSessionAction(sessionId);
      if (!result.ok) {
        setError(result.error ?? "Could not sign out that device.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not sign out that device. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const revokeAll = async () => {
    setError(null);
    setBusyAll(true);
    try {
      const result = await revokeOtherSessionsAction();
      if (!result.ok) {
        setError(result.error ?? "Could not sign out other devices.");
        return;
      }
      setConfirmAll(false);
      await refresh();
    } catch {
      setError("Could not sign out other devices. Please try again.");
    } finally {
      setBusyAll(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <p className="text-sm text-ink-300">
          {sessions.filter((s) => !s.revoked).length} device
          {sessions.filter((s) => !s.revoked).length === 1 ? "" : "s"} signed in
        </p>
        {othersCount > 0 ? (
          <Button variant="secondary" size="sm" onClick={() => setConfirmAll(true)}>
            Sign out other devices
          </Button>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink-300">
          No device sessions recorded yet. They appear here as you sign in on each device.
        </p>
      ) : (
        <ul className="divide-y divide-ink-700 border-t border-ink-700">
          {sessions.map((session) => (
            <li
              key={session.id}
              className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                session.revoked ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-white">{session.device}</p>
                  {session.isCurrent ? (
                    <Chip tone="success" leadingDot>
                      This device
                    </Chip>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-ink-300">
                  Active {timeAgo(session.lastSeenAt)}
                  {session.ip ? ` · ${session.ip}` : ""}
                  {session.revoked ? " · signed out" : ""}
                </p>
              </div>
              {!session.isCurrent && !session.revoked ? (
                <div className="shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void revoke(session.id)}
                    disabled={busyId === session.id}
                  >
                    {busyId === session.id ? "Signing out…" : "Sign out"}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="px-5 pb-4 text-xs font-medium text-danger-300" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmationDialog
        open={confirmAll}
        title="Sign out all other devices?"
        body="Every device except this one will be signed out of Couples Corner. You can sign back in on those devices anytime."
        confirmLabel="Sign out others"
        tone="danger"
        busy={busyAll}
        onConfirm={() => void revokeAll()}
        onCancel={() => setConfirmAll(false)}
      />
    </div>
  );
}
