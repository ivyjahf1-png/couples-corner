"use client";

import { useState, useEffect, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { Chip } from "@/components/ui/Chip";
import type { UserMfaFactor } from "@/lib/server/security";
import {
  getUserMfaFactorsAction,
  unenrollMfaFactorAction,
  type SecurityActionResult,
} from "@/lib/actions/security";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";

interface Props {
  uid: string;
}

const FACTOR_TONE: Record<string, "success" | "brand" | "neutral" | "danger"> = {
  verified: "success",
  unverified: "neutral",
};

export function AdminMfaPanel({ uid }: Props) {
  const [factors, setFactors] = useState<UserMfaFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, startAction] = useTransition();

  useEffect(() => {
    void loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function loadFactors() {
    try {
      const data = await getUserMfaFactorsAction(uid);
      setFactors(data);
    } finally {
      setLoading(false);
    }
  }

  function handleUnenroll(factorId: string) {
    startAction(async () => {
      const result: SecurityActionResult = await unenrollMfaFactorAction(uid, factorId);
      if (result.ok) {
        setFactors((prev) => prev.filter((f) => f.id !== factorId));
      }
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-900/40 text-orange-400">
            <Icon name="lock" className="h-5 w-5" />
          </span>
          <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading MFA factors…</p>
      ) : factors.length === 0 ? (
        <p className="text-sm text-slate-400">No MFA factors enrolled for this user.</p>
      ) : (
        <div className="space-y-3">
          {factors.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center justify-between rounded-xl border border-orange-500/20 bg-slate-900-muted p-3"
            >
              <div className="flex items-center gap-3">
                <Icon name="shield" className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="font-medium text-white">
                    {factor.friendlyName || "TOTP Authenticator"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Status: <Chip tone={FACTOR_TONE[factor.status]}>{factor.status}</Chip>
                    {factor.createdAt ? ` · Created ${new Date(factor.createdAt).toLocaleDateString()}` : null}
                  </p>
                </div>
              </div>
              {factor.status === "verified" && (
                <ConfirmationDialog
                  title="Unenroll 2FA?"
                  body="This will remove the user's verified authenticator app. They'll need to re-enroll on their next sign-in."
                  confirmLabel="Remove 2FA"
                  tone="danger"
                  busy={actionBusy}
                  onConfirm={() => handleUnenroll(factor.id)}
                >
                  {() => (
                    <Button size="sm" variant="danger">
                      Remove
                    </Button>
                  )}
                </ConfirmationDialog>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}