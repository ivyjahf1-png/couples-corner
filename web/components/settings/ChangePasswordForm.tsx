"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { changePasswordAction } from "@/lib/actions/security";

const inputClasses =
  "h-10 w-full max-w-xs rounded-xl border border-ink-200 bg-surface px-3 text-sm text-ink-900 focus:border-brand-400 focus:outline-none";

/** "Change password" form wired to Supabase Auth (verify current → update). */
export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      const result = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not change your password.");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not change your password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Change password
        </Button>
        {success ? (
          <p className="text-xs font-medium text-success-700" role="status">
            Password updated.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="w-full max-w-xs flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
        Current password
        <input
          type="password"
          required
          autoComplete="current-password"
          className={inputClasses}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          aria-label="Current password"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
        New password
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClasses}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          aria-label="New password"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
        Confirm new password
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClasses}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          aria-label="Confirm new password"
        />
      </label>

      {error ? (
        <p className="text-xs font-medium text-danger-700" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-xs font-medium text-success-700" role="status">
          Password updated.
        </p>
      ) : null}

      <div className="mt-1 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
