"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";
import {
  disableMfaAction,
  startMfaEnrollmentAction,
  verifyMfaEnrollmentAction,
} from "@/lib/actions/security";

/**
 * Two-factor authentication section — real Supabase Auth TOTP MFA.
 * Enable: enroll → scan QR → verify 6-digit code. Disable: unenroll factor.
 */
export function MfaSection({
  enabled,
  factorId,
  loadError,
}: {
  enabled: boolean;
  factorId: string | null;
  loadError?: string | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState(enabled);
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    challengeId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(loadError ?? null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const startEnrollment = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await startMfaEnrollmentAction();
      if (!result.ok) {
        setError(result.error ?? "Could not start 2FA setup.");
        return;
      }
      if (result.ok) {
        setEnrollment({
          factorId: result.factorId,
          challengeId: result.challengeId,
          qrCode: result.qrCode,
          secret: result.secret,
        });
      }
    } catch {
      setError("Could not start 2FA setup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!enrollment) return;
    setError(null);
    setBusy(true);
    try {
      const result = await verifyMfaEnrollmentAction(
        enrollment.factorId,
        enrollment.challengeId,
        code
      );
      if (!result.ok) {
        setError(result.error ?? "Verification failed.");
        return;
      }
      setEnrollment(null);
      setCode("");
      setActive(true);
      router.refresh();
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!factorId) return;
    setError(null);
    setBusy(true);
    try {
      const result = await disableMfaAction(factorId);
      if (!result.ok) {
        setError(result.error ?? "Could not turn off 2FA.");
        return;
      }
      setActive(false);
      setConfirmDisable(false);
      router.refresh();
    } catch {
      setError("Could not turn off 2FA. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {active ? (
        <div className="flex items-center gap-3">
          <Chip tone="success" leadingDot>
            Active
          </Chip>
          <Button variant="secondary" size="sm" onClick={() => setConfirmDisable(true)}>
            Turn off
          </Button>
        </div>
      ) : enrollment ? (
        <div className="flex w-full max-w-sm flex-col gap-3 text-left">
          <p className="text-sm font-medium text-white">Set up an authenticator app</p>
          <ol className="list-inside list-decimal text-sm text-ink-300">
            <li>Scan this QR code with Google Authenticator, 1Password, or similar.</li>
            <li>Enter the 6-digit code it shows to finish setup.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="Two-factor authentication QR code"
            className="h-48 w-48 self-center rounded-xl border border-ink-700 bg-surface p-2"
          />
          <p className="text-xs text-ink-400">
            Can&apos;t scan? Enter this key manually:{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-ink-100">
              {enrollment.secret}
            </code>
          </p>
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            className="h-10 w-full rounded-xl border border-ink-700 bg-surface px-3 text-center font-mono text-lg tracking-[0.3em] text-white focus:border-brand-500/60 focus:outline-none"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            aria-label="6-digit verification code"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEnrollment(null);
                setError(null);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={() => void verify()} disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify and enable"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Chip tone="neutral">Off</Chip>
          <Button size="sm" onClick={() => void startEnrollment()} disabled={busy}>
            {busy ? "Setting up…" : "Enable 2FA"}
          </Button>
        </div>
      )}

      {error ? (
        <p className="max-w-sm text-right text-xs font-medium text-danger-300" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmationDialog
        open={confirmDisable}
        title="Turn off two-factor authentication?"
        body="Your account will be protected by your password only. You can re-enable 2FA at any time."
        confirmLabel="Turn off 2FA"
        tone="danger"
        busy={busy}
        onConfirm={() => void disable()}
        onCancel={() => setConfirmDisable(false)}
      />
    </div>
  );
}
