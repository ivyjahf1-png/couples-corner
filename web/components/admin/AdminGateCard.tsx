"use client";

// AdminGateCard — the /admin unlock screen.
//
// Replaces the old "Admin panel is not yet available" error view. That view was
// a dead end: it explained a configuration problem but offered no way forward,
// so a correctly-configured operator whose database role was not yet set had
// nothing to click. This is a real sign-in surface instead.

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock, ShieldCheck } from "lucide-react";
import { unlockAdminPanelAction, type AdminUnlockResult } from "@/lib/actions/admin-gate";

function UnlockButton() {
  // `useFormStatus` must live in a CHILD of the <form> — reading it in the
  // parent would report the parent form's status, which is null here.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-950/40 transition hover:bg-brand-400 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Unlocking…" : "Unlock admin"}
    </button>
  );
}

export function AdminGateCard({ configured }: { configured: boolean }) {
  const [state, formAction] = useActionState<AdminUnlockResult | null, FormData>(
    unlockAdminPanelAction,
    null
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-700 bg-surface-muted text-brand-300">
          <Lock className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">Admin panel</h1>
        <p className="mt-1 text-sm text-ink-300">
          Enter the admin passphrase to continue.
        </p>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-4 rounded-2xl border border-ink-700 bg-surface p-5 shadow-xl"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-password" className="text-sm font-medium text-white">
            Passphrase
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            // `autoComplete="current-password"` lets a password manager offer
            // the stored secret. It is NOT `new-password`, which would prompt
            // the operator to invent one.
            autoComplete="current-password"
            autoFocus
            required
            className="rounded-xl border border-ink-700 bg-surface-muted px-3 py-2.5 text-sm text-white placeholder:text-ink-500 outline-none transition focus:border-brand-400"
            placeholder="••••••••••••"
          />
        </div>

        {/* `role="alert"` so the message is announced the moment it appears,
            rather than being a silent colour change. */}
        {state?.error ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          >
            {state.error}
          </p>
        ) : null}

        {!configured ? (
          <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            This deployment has no <code className="font-mono">ADMIN_PANEL_PASSWORD</code>{" "}
            set, so the panel cannot be unlocked. Add it to the environment and
            redeploy.
          </p>
        ) : null}

        <UnlockButton />
      </form>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-ink-400">
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        Sessions unlock for 8 hours on this browser.
      </p>
    </div>
  );
}
