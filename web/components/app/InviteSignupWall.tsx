"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { openAuthModal } from "@/components/auth/AuthModals";
import {
  INVITE_COOKIE,
  INVITE_STORAGE_KEY,
  INVITE_VISITOR_KEY,
  SIGNUP_WALL_DELAY_MS,
  normalizeInviteCode,
} from "@/lib/utils/invite";

/**
 * Delayed signup wall for visitors arriving via an invite link.
 *
 * WHAT THIS IS: a growth pattern. The visitor is dropped straight into the
 * immersive feed, watches real content play, and only AFTER 3 seconds is asked
 * to register. Raising the wall immediately would hide the product - the very
 * thing that makes someone want to sign up - behind a form.
 *
 * WHY THE TIMER CANNOT BE STRETCHED: the deadline is computed from
 * `performance.now()` at mount rather than accumulated per render, so a
 * re-render or a slow device cannot restart it. Pausing on `visibilitychange`
 * means a visitor who switches apps during those 3 seconds does not spend the
 * window in another tab.
 *
 * WHY IT CAN BE DISMISSED: a wall that cannot be dismissed is a dark pattern
 * and gets an app flagged in store review. Dismissal is remembered for the
 * session so it does not reappear on every navigation. "Keep watching" simply
 * stops the wall; the feed stays fully browsable either way.
 */
export function InviteSignupWall({ inviteCode }: { inviteCode: string | null }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    try {
      // Session marker: this browser has already seen the wall.
      window.sessionStorage.setItem(INVITE_VISITOR_KEY, "dismissed");
    } catch {
      /* private mode / storage disabled - the wall re-shows next visit */
    }
  }, []);

  useEffect(() => {
    // An invite-funnel device only: nothing to do without a referral.
    if (!inviteCode) return;

    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(INVITE_VISITOR_KEY) === "dismissed";
    } catch {
      /* storage unavailable: showing the wall is the safer default */
    }
    if (alreadySeen) {
      setDismissed(true);
      return;
    }

    // Persist the referral BEFORE the timer can fire, so attribution survives a
    // registration path that drops the query string. The server cookie is the
    // primary carrier; this is the browser-side copy RegisterForm reads.
    try {
      window.localStorage.setItem(INVITE_STORAGE_KEY, inviteCode);
    } catch {
      /* storage disabled: the server cookie still carries the referral */
    }

    const startedAt = performance.now();
    const arm = () => {
      const remaining = SIGNUP_WALL_DELAY_MS - (performance.now() - startedAt);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        // A background tab can leave a throttled timer pending; on resume the
        // visitor has been away, so do not ambush them immediately.
        if (document.visibilityState === "hidden") return;
        setVisible(true);
      }, Math.max(0, remaining));
    };
    arm();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      if (!timerRef.current) arm();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [inviteCode]);

  // Escape closes, matching the auth modal's own convention.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, close]);

  if (!inviteCode || dismissed || !visible) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/30 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-wall-title"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl">
        <button
          type="button"
          onClick={close}
          aria-label="Keep watching without signing up"
          className="absolute right-3 top-3 rounded-full p-2 text-ink-300 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          You&apos;re invited
        </p>
        <h2 id="invite-wall-title" className="mt-2 text-2xl font-bold leading-tight text-white">
          Join Couple&apos;s Corner to continue watching and connecting
        </h2>
        <p className="mt-2 text-sm text-ink-300">
          Create a free account to keep watching, react, and message the people
          you meet here.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => openAuthModal("register")}
            className="w-full rounded-xl bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-400"
          >
            Create free account
          </button>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="w-full rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            I already have an account
          </button>
          <button
            type="button"
            onClick={close}
            className="w-full rounded-xl px-5 py-2 text-sm text-ink-400 transition hover:text-white"
          >
            Keep watching for now
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Reads the referral code from the cookie on the client and renders the wall.
 *
 * This wrapper keeps the home page a Server Component. The cookie read happens
 * in a client effect after hydration, and the code is handed down as a prop.
 * The server DOES know the code (it set the cookie), but reading it client-side
 * means the wall can first consult the sessionStorage "already dismissed"
 * marker - otherwise a visitor who dismissed it would get a flash of modal on
 * every subsequent page load before the effect could correct it.
 */
export function InviteSignupWallFromCookie() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const raw = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${INVITE_COOKIE}=`))
      ?.slice(INVITE_COOKIE.length + 1);
    setCode(normalizeInviteCode(raw ? decodeURIComponent(raw) : null));
  }, []);

  return <InviteSignupWall inviteCode={code} />;
}
