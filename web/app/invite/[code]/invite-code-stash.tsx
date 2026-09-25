"use client";

import { useEffect } from "react";
import { INVITE_STORAGE_KEY } from "@/lib/utils/invite";

/**
 * Persists the invite code so RegisterForm can recover it when a visitor
 * reaches /register without the `?invite=` query string — for example via
 * direct navigation, or a social sign-up that drops the query string.
 *
 * Kept as a separate Client Component so `page.tsx` stays a Server Component
 * with real `await params()` and `notFound()` handling.
 */
export function InviteCodeStash({ code }: { code: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(INVITE_STORAGE_KEY, code);
    } catch {
      /* Private browsing / storage disabled - the query param still works. */
    }
  }, [code]);
  return null;
}