"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { Icon } from "@/components/landing/Icon";

/**
 * Logout button for the profile / settings page.
 *
 * POSTs to /api/auth/logout, which revokes the Supabase session server-side
 * and clears the auth cookies; then performs a hard client-side navigation to
 * /login (router.replace so the user can't click "back" into an authenticated
 * view with stale cache).
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok && res.status !== 401) {
        // Non-fatal: the cookie clear may have succeeded even if the server
        // sign-out failed — still send the user to login.
        setError("Sign-out may be incomplete — redirecting anyway…");
      }
    } catch {
      setError("Network error — redirecting anyway…");
    } finally {
      // Hard replace: drop any cached authenticated pages from history.
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
        }
      >
        <Icon name="logout" className="h-4 w-4" />
        {busy ? "Signing out…" : "Log out"}
      </button>
      {error && <p className="mt-2 text-xs text-red-300/80">{error}</p>}
    </>
  );
}
