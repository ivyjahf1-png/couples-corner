"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PublicProfileScreen, type PublicProfileView } from "@/components/profile/PublicProfileScreen";
import { getPublicProfileViewAction } from "@/lib/actions/public-profile";

/**
 * THE GLOBAL PROFILE VIEW MODAL.
 *
 * ── WHY AN EVENT-DRIVEN PROVIDER ─────────────────────────────────────────────
 * The entry points (Explore card, Moment author pill, chat header avatar, Feed
 * post author, inbox avatar) are scattered across independent client trees —
 * none is an ancestor of any other, and most sit under Server Components that
 * cannot thread callbacks down. This mirrors the pattern the app already uses
 * for the auth overlays (`openAuthModal` + `AuthModalProvider` in
 * AuthModals.tsx): one custom event, one listener mounted once in the root
 * layout, and any surface opens the modal by calling `openProfileView(id)` —
 * no prop drilling, no context plumbing through RSC boundaries.
 *
 * ── WHY THE SAME PublicProfileScreen AS THE FULL PAGE ────────────────────────
 * The reference design (immersive photo header with pagination dots + 3-dot
 * menu, name/verified/age/distance/country row, ID + copy, Online pill, About
 * Me with Honor/Relation tabs, hobby pills, yellow Chat + black Follow bar) IS
 * `PublicProfileScreen`. Rebuilding it here would fork the design into two
 * copies that drift. The modal adds only the overlay shell (backdrop, Escape,
 * dismissal) and passes `onClose`/`inModal` so the screen adapts: the chevron
 * closes instead of navigating history, and the bottom bar drops its
 * fixed-tab-bar height reservation.
 *
 * Data comes through `getPublicProfileViewAction`, which shares the ONE view
 * builder with `/profile/[userId]` (lib/server/public-profile.ts) — the modal
 * and the full page can never disagree about photos, age or distance.
 *
 * ── DISMISSAL ────────────────────────────────────────────────────────────────
 * Escape, the backdrop, and the header chevron all close it. It also closes on
 * ROUTE CHANGE: the modal's own Chat button navigates to `/messages/<id>`, and
 * leaving the overlay open would bury the conversation it just opened.
 *
 * Z-INDEX: `z-[300]` (Z.dialog) — above sheets (200) and the fixed nav (50),
 * because the modal can open over surfaces that already have chrome and must
 * own the whole viewport while open. The literal class is written out because
 * Tailwind extracts classes by scanning source text; a composed
 * `z-[${Z.dialog}]` would be silently dropped from the build.
 */

/** Event name for opening the modal. Exported for symmetry with the auth modals. */
export const OPEN_PROFILE_VIEW_EVENT = "couplescorner:open-profile-view";

/**
 * Open the global profile modal for `userId`. Callable from ANY client
 * component. No-ops with an empty id so a caller with missing data can never
 * mount a modal that has nothing to fetch.
 */
export function openProfileView(userId: string | null | undefined) {
  const id = userId?.trim();
  if (!id || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_PROFILE_VIEW_EVENT, { detail: { userId: id } }));
}

/**
 * Drop-in `onClick` for links/avatars that should open the modal instead of
 * navigating: suppresses default navigation (the href remains the no-JS /
 * open-in-new-tab fallback) and dispatches the open event.
 *
 * Modifier/auxiliary clicks are NOT intercepted — ctrl/cmd/shift-click must
 * keep opening the href in a new tab, which is a browser behaviour no overlay
 * should hijack.
 */
export function profileViewClick(userId: string | null | undefined) {
  const id = userId?.trim() ?? "";
  return (event: {
    preventDefault(): void;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    button: number;
  }) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    /* NO ID → NO INTERCEPTION. The call site has nothing to open the modal
       with (demo data, a bot thread, a profile-less card), so cancelling the
       default here would turn a working link into a dead click. Guard FIRST. */
    if (!id) return;
    event.preventDefault();
    openProfileView(id);
  };
}

/** Load states for one modal open. */
type ModalState = "loading" | "ready" | "missing";

/**
 * The modal shell: overlay, backdrop, panel geometry. Rendered ONLY by
 * `ProfileViewProvider` below, never at a call site.
 */
function ProfileViewModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-stretch justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Profile"
    >
      {/* Full-viewport dismiss target behind the panel. `cursor-default` keeps it
          reading as a surface rather than a control. */}
      <button
        type="button"
        aria-label="Close profile"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      {/* THE PANEL. Full-bleed on phones (the reference design is a full-screen
          profile), a rounded centred card from `sm` up where there is room for a
          backdrop around it. A REAL height is required: the screen inside is a
          locked `h-full` flex column with its own internal scroller, so it must
          measure against a box rather than against its own content. */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden bg-slate-100 shadow-2xl sm:h-[calc(100dvh-3rem)] sm:rounded-3xl">
        <ProfileViewBody userId={userId} onClose={onClose} />
      </div>
    </div>
  );
}

/**
 * Fetch lifecycle + content. Split from the shell so the shell never re-runs
 * the fetch effect when only dismissal state changes.
 */
function ProfileViewBody({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [state, setState] = useState<ModalState>("loading");
  const [view, setView] = useState<PublicProfileView | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setView(null);
    getPublicProfileViewAction(userId)
      .then((result) => {
        if (cancelled) return;
        /* A null result is the builder refusing — private, blocked, or not a
           member. An honest state, never a crash or a silent blank. */
        if (result) {
          setView(result);
          setState("ready");
        } else {
          setState("missing");
        }
      })
      .catch(() => {
        if (!cancelled) setState("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* ESCAPE closes — the expectation for any dialog, and the one dismissal
     gesture that works identically on every surface the modal opens over. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (state === "ready" && view) {
    /* `key` remounts if a call site ever switches straight to another id, so
       the previous member's photos never show while the new fetch is in flight. */
    return <PublicProfileScreen key={view.uid} view={view} onClose={onClose} inModal />;
  }

  if (state === "missing") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-2xl" aria-hidden>
          ?
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">Profile not available</p>
          <p className="mt-1 text-sm text-slate-500">
            This member&apos;s profile is private, unavailable, or no longer exists.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Close
        </button>
      </div>
    );
  }

  /* Loading: match the screen's light canvas so the swap to the real profile
     does not flash a dark frame. */
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-100" role="status">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
        aria-hidden
      />
      <p className="text-sm font-medium text-slate-500">Loading profile…</p>
    </div>
  );
}

/**
 * The global listener. Mount ONCE — the root layout does, beside the auth
 * modal provider. Renders nothing when closed.
 *
 * ROUTE-CHANGE DISMISSAL: `usePathname` is the signal (the same one auth
 * modals already use via context). When the Chat button inside the modal pushes
 * `/messages/<id>`, the path changes and the overlay drops itself, revealing
 * the conversation it just opened. The pathname is snapshotted at OPEN time
 * rather than compared per-render, so navigating somewhere the modal does not
 * affect is indistinguishable from staying put — only a change while open
 * closes it.
 */
export function ProfileViewProvider() {
  const [userId, setUserId] = useState<string | null>(null);
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      const id = detail?.userId?.trim();
      if (!id) return;
      /* Snapshot the route we are opening OVER — see the doc comment above. */
      setOpenedAtPath(window.location.pathname);
      setUserId(id);
    }
    window.addEventListener(OPEN_PROFILE_VIEW_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PROFILE_VIEW_EVENT, onOpen);
  }, []);

  /* Close on navigation (including the modal's own Chat/Follow-driven routing). */
  useEffect(() => {
    if (userId && openedAtPath && pathname !== openedAtPath) {
      setUserId(null);
      setOpenedAtPath(null);
    }
  }, [pathname, openedAtPath, userId]);

  const close = useCallback(() => {
    setUserId(null);
    setOpenedAtPath(null);
  }, []);

  if (!userId) return null;
  return <ProfileViewModal userId={userId} onClose={close} />;
}
