"use client";

/**
 * THE GAME RUNNER — the interactive half of `/games/<gameId>`.
 *
 * The route is a Server Component: it resolves the catalog entry by id, runs the
 * `notFound()` check and passes down already-validated values. This component
 * owns only what genuinely needs a browser — the fullscreen toggle's handler and
 * its `fullscreenchange` sync — so no catalog data or validation logic is
 * duplicated into the client bundle.
 *
 * WHY THE URL IS A PROP AND NOT RE-DERIVED HERE. The page already looked the
 * entry up by id and confirmed it against `isSafeGameUrl`. Re-resolving in the
 * client would reintroduce the exact attack the catalog module exists to
 * prevent — untrusted input reaching an iframe `src`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";

/** The `FOCUS` ring every interactive control in the app shell uses. */
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]";

interface GameRunnerProps {
  /** Catalog id, for the label only. Never used as an address. */
  gameId: string;
  title: string;
  category: string;
  /** Already allow-list-checked by the page. */
  gameUrl: string;
}

export function GameRunner({ gameId, title, category, gameUrl }: GameRunnerProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  /**
   * THE NATIVE FULLSCREEN API, NOT A CSS FAUX-FULLSCREEN.
   *
   * `GameModal` toggles a class that merely stretches a fixed overlay. That is
   * the wrong mechanism here: a real `requestFullscreen` hides the browser's own
   * chrome and the mobile address bar, which is what a player actually wants
   * from a fullscreen button.
   *
   * Both spellings are needed: the standard one on Chrome/Edge/Firefox/Android,
   * `webkitRequestFullscreen` on Safari and iOS, which never implemented the
   * unprefixed method. Both are guarded because neither is typed on Element.
   */
  const enterFullscreen = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    const request =
      stage.requestFullscreen ??
      (stage as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void })
        .webkitRequestFullscreen;

    try {
      await request?.call(stage);
    } catch {
      /* The user agent can refuse — no gesture, an iframe policy, or a call made
         while already transitioning. Nothing useful to surface: the state sync
         below simply never fires, so the button stays honest. */
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const exit =
      document.exitFullscreen ??
      (document as Document & { webkitExitFullscreen?: () => Promise<void> | void })
        .webkitExitFullscreen;

    try {
      await exit?.call(document);
    } catch {
      /* Ignored for the same reason as above. */
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void exitFullscreen();
    else void enterFullscreen();
  }, [enterFullscreen, exitFullscreen]);

  /**
   * MIRROR THE DOCUMENT'S REAL FULLSCREEN STATE.
   *
   * The request can fail, and a player can leave fullscreen with the browser's
   * own Esc / swipe-back gesture. A locally-tracked boolean would drift out of
   * sync and the button would claim a state the document is not in.
   * `fullscreenElement` is the single source of truth; the vendor-prefixed event
   * is what Safari and older iOS actually fire.
   */
  useEffect(() => {
    function sync() {
      setFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  /* Leaving the route while fullscreen would strand the rest of the app inside a
     fullscreen document, because there is no gesture left to escape it. */
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) void exitFullscreen();
    };
  }, [exitFullscreen]);

  return (
    <div className="flex flex-col gap-4">
      {/* CONTROL BAR — Back, the title badge and the fullscreen toggle, the three
          controls the brief asked for. A normal flex child of the page's own
          column, not fixed, so it scrolls with the stage rather than competing
          with the shell's fixed bottom nav.

          ── BACK GOES TO THE ARCADE (/games), WHERE GAMES ARE BROWSED ──────
          The profile shelf and the Arcade both link here through `/games/<id>`,
          so returning to `/games` sends the member back to the shelf they picked
          from rather than dead-ending on the dashboard. `/games` is a real route
          (`app/(app)/games/page.tsx`) that renders the full self-hosted catalog. */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0F172A] p-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/games"
            aria-label="Back to games"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white ${FOCUS}`}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>

          {/* TITLE BADGE — the game's name plus its shelf grouping. */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-bold text-white">{title}</span>
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
              {category}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-pressed={fullscreen}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 ${FOCUS}`}
        >
          {fullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
          )}
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>

      {/* THE RUNNER — the exact Midnight Slate panel the brief specified. In
          fullscreen the height must come from the document rather than a fixed
          650px, otherwise the browser's own fullscreen chrome would be measured
          against a box that no longer fills the screen. */}
      <div
        ref={stageRef}
        className="h-[650px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A]"
        style={fullscreen ? { height: "100dvh" } : undefined}
      >
        <iframe
          key={gameId}
          src={gameUrl}
          title={title}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; screen-wake-lock"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
