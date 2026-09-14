"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { Chip } from "@/components/ui/Chip";
import {
  sendPasswordResetAction,
  setPasswordAction,
  type SecurityActionResult,
} from "@/lib/actions/security";
import { ConfirmationDialog } from "@/components/app/ConfirmationDialog";

interface Props {
  uid: string;
  email: string;
}

export function AdminPasswordPanel({ uid, email }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isResetting, startReset] = useTransition();
  const [isSetting, startSet] = useTransition();

  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    return null;
  }

  async function handleSendReset() {
    setError(null);
    setSuccess(null);
    startReset(async () => {
      const result: SecurityActionResult = await sendPasswordResetAction(uid, email);
      if (result.ok) {
        setSuccess(`Reset email sent to ${email}.`);
      } else {
        setError(result.error ?? "Failed to send reset email.");
      }
    });
  }

  async function handleSetPassword() {
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    startSet(async () => {
      const result: SecurityActionResult = await setPasswordAction(uid, newPassword);
      if (result.ok) {
        setSuccess("Password updated successfully.");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(result.error ?? "Failed to set password.");
      }
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/40 text-emerald-400">
          <Icon name="lock" className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold text-white">Password & Security</h3>
      </div>

      {error ? (
        <Chip tone="danger" className="mb-3">
          {error}
        </Chip>
      ) : null}
      {success ? (
        <Chip tone="success" className="mb-3">
          {success}
        </Chip>
      ) : null}

      {/* Send password reset email */}
      <div className="rounded-xl border border-orange-500/20 bg-slate-900-muted p-4">
        <h4 className="text-sm font-medium text-white">Send reset email</h4>
        <p className="mt-1 text-xs text-slate-300">
          Email {email} a password-reset link. Use this when the user asks for help signing in.
        </p>
                                        <div className="mt-3">
          <ConfirmationDialog
            title="Send reset email?"
            body={`A password reset email will be sent to ${email}.`}
            confirmLabel="Send reset email"
            busy={isResetting}
            onConfirm={handleSendReset}
          >
            {() => (
              <Button size="sm" variant="secondary" disabled={isResetting}>
                {isResetting ? "Sending…" : "Send reset email"}
              </Button>
            )}
          </ConfirmationDialog>
        </div>
      </div>

      {/* Set password directly */}
      <div className="mt-4 rounded-xl border border-orange-500/20 bg-slate-900-muted p-4">
        <h4 className="text-sm font-medium text-white">Set new password</h4>
        <p className="mt-1 text-xs text-slate-300">
          Force-set a new password for this user (e.g. after a breach or at user request).
          The user should be asked to change it on next login.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            className="h-10 rounded-xl border border-orange-500/20 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            className="h-10 rounded-xl border border-orange-500/20 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
          />
        </div>
                <div className="mt-3 flex justify-end">
          <ConfirmationDialog
            title="Set password?"
            body="This will immediately change the user's password. They will be signed out of all sessions."
            confirmLabel="Set new password"
            tone="danger"
            busy={isSetting}
            onConfirm={handleSetPassword}
          >
            {() => (
              <Button
                size="sm"
                variant="danger"
                disabled={isSetting || !newPassword || !confirmPassword}
              >
                {isSetting ? "Setting…" : "Set password"}
              </Button>
            )}
          </ConfirmationDialog>
        </div>
      </div>
    </Card>
  );
}