"use client";

import { useCallback, useEffect, useState } from "react";
import { notifyFailure } from "@/components/ui/FailureToasts";
import { DEFAULT_GAME_ID, findGame } from "@/lib/game/registry";

/**
 * THE HTML5 GAME LAUNCHER MODAL.
 *
 * ── WHY AN EVENT-DRIVEN PROVIDER (same shape as ProfileViewModal) ───────────
 * The entry points are scattered across independent client trees and one SERVER
 * tree: the floating Game button (client), the feed's star action (client), and
 * the profile screen's Recommended Games tiles (a Server Component that cannot
 * take onClick at all). Threading a launch callback down through those
 * boundaries is impossible, so this module mirrors the pattern the app already
 * uses for auth and profile overlays: `openGame()` dispatches ONE custom event,
 * `GameModalProvider` mounted once in the root layout listens for it, asks
 * `/api/game/launch` for the URL, and renders the modal. Any surface opens a
 * game by calling `openGame(gameId)` — no prop drilling, no context plumbing
 * across RSC boundaries.
 *
 * ── WHY THE URL ALWAYS COMES FROM THE SERVER ────────────────────────────────
 * The iframe never receives a URL the client made up. The route validates the
 * id against `lib/game/registry` (the allow-list), embeds the SESSION's uid —
 * never a body-supplied one — and appends the provider token, which exists
 * only in server env. The client supplies a registry KEY and nothing else; the
 * server decides what loads, for whom, and with what credential.
 *
 * ── DISMISSAL ────────────────────────────────────────────────────────────────
 * Escape and the header button both close it. There is no route-change
 * dismissal (unlike ProfileViewModal): while the modal is open the app chrome
 * behind it is unreachable, and the iframe owns its own internal navigation —
 * which never touches OUR pathname.
 *
 * Z-INDEX: `z-[300]` (Z.dialog) written as a literal because Tailwind extracts
 * classes by scanning source text; a composed `z-[${Z.dialog}]` is silently
 * dropped. It is deliberately NOT `z-50`: the floating Game button lives at
 * `z-[60]`, and a dialog pinned below it would paint UNDER the very control
 * that opens games — the button would stay tappable through the overlay and
 * land on top of the iframe.
 */

/** Event name for opening the launcher. Exported for symmetry with auth/profile modals. */
export const OPEN_GAME_EVENT = "couplescorner:open-game";

/**
 * Open the HTML5 game launcher for `gameId` (defaults to the registry's
 * default game when omitted). Callable from ANY client component. No-ops
 * outside the browser so a server-rendered call can never throw.
 */
export function openGame(gameId?: string) {
  if (typeof window === "undefined") return;
  const id = gameId?.trim() || DEFAULT_GAME_ID;
  window.dispatchEvent(new CustomEvent(OPEN_GAME_EVENT, { detail: { gameId: id } }));
}

/**
 * Click-to-launch wrapper for SERVER COMPONENTS (and client ones).
 *
 * ProfileScreen's Recommended Games band renders this: a real `<button>` (so
 * keyboard activation works and the a11y tree says "button", not "link" — there
 * is no route to navigate to anymore), styled entirely via the `className`
 * the call site supplies, with the tile artwork passed through as `children`.
 */
export function GameLaunchButton({
  gameId,
  className,
  ariaLabel,
  children,
}: {
  /** Registry id to launch. */
  gameId: string;
  /** Full class string for the button — the call site owns the visuals. */
  className?: string;
  /** Accessible name; the call site's tile art is aria-hidden. */
  ariaLabel?: string;
  /** Visual content (tile artwork, labels). */
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => openGame(gameId)}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  );
}

/**
 * The modal shell: fullscreen canvas, a minimal header (label + Close), and
 * the game iframe. Rendered ONLY by `GameModalProvider` below.
 *
 * THREE STATES, ALL RENDERED HERE.
 *   loading — a spinner. `gameUrl` arrives before the iframe paints, and a
 *             black frame for the ~300ms a real HTML5 build takes to boot reads
 *             as a hang.
 *   ready   — the game, once `onLoad` fires. NOT before: an iframe's `onLoad`
 *             also fires for an error page, so load alone proves nothing.
 *   failed  — a real message with a Close action.
 *
 * WHY THE LOAD TIMEOUT IS LOAD-BEARING. The route now preflights the embed, but
 * that check fails OPEN on a network error — a provider outage must not
 * permanently disable the suite. So the client keeps the backstop: if nothing
 * has loaded in 15s the build is treated as dead and the fallback replaces the
 * frame. Between the two checks a dead embed can never sit on screen
 * indefinitely, which is what produced the "Not found at origin" screenshot.
 */
export default function GameModal({
  gameUrl,
  gameTitle,
  coinBalance,
  onClose,
}: {
  gameUrl: string;
  gameTitle: string;
  coinBalance: number | null;
  onClose: () => void;
}) {
  type LoadState = "loading" | "ready" | "failed";
  const [loadState, setLoadState] = useState<LoadState>("loading");
  /* Bumping this re-keys the iframe src so "Try again" forces the browser to
     reload the embed from scratch — changing `src` is the only way to make it
     re-request; resetting state alone leaves the already-loaded frame in place. */
  const [reloadKey, setReloadKey] = useState(0);
  /* Full-screen toggle. Defaults to a CONTAINED glassmorphic card so the game
     sits inside a dark rounded panel over a dimmed backdrop; toggling expands
     the shell to fill the viewport for immersive play. This is a presentation
     toggle only — it never touches the iframe src, so gameplay/load state is
     completely unaffected by expanding or collapsing. */
  const [fullscreen, setFullscreen] = useState(false);

  /* Escape closes — the one dismissal gesture that works identically on every
     surface the modal opens over (mirrors ProfileViewModal). */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* A NEW URL IS A NEW LOAD. The provider reuses this component across games,
     so without this reset a second launch would inherit the first one's `ready`
     and flash game B's frame over the still-loading game A. */
  useEffect(() => {
    setLoadState("loading");
    const timer = window.setTimeout(() => {
      setLoadState((current) => (current === "loading" ? "failed" : current));
    }, 15_000);
    return () => window.clearTimeout(timer);
  }, [gameUrl, reloadKey]);

  return (
    <div
      className={[
        "fixed inset-0 z-[300] flex flex-col bg-black/80 backdrop-blur-sm",
        /* Contained mode: centre a glassmorphic card with breathing room.
           Fullscreen mode: the card fills the viewport edge-to-edge. */
        fullscreen ? "items-stretch p-0" : "items-center justify-center p-4",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label="Game Zone"
    >
      <div
        className={[
          /* THE GLASSMORPHIC GAME CARD — dark Midnight Slate panel, slate
             border, rounded, padded — exactly the container the brief asked
             for. In fullscreen it becomes edge-to-edge and unrounded. */
          "flex min-h-0 w-full max-w-3xl flex-col overflow-hidden border border-slate-800 bg-[#0F172A] shadow-2xl",
          fullscreen ? "h-full max-w-none rounded-none p-0" : "h-[85vh] rounded-2xl p-2",
        ].join(" ")}
      >
        <div className="mb-2 flex items-center justify-between rounded-xl border-b border-white/10 bg-[#0b0f19] px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">{gameTitle}</span>
            <span className="text-[10px] text-white/50">{coinBalance !== null ? `🪙 ${coinBalance.toLocaleString()}` : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* FULL-SCREEN TOGGLE — presentation only; never touches the game. */}
            <button
              type="button"
              onClick={() => setFullscreen((value) => !value)}
              aria-pressed={fullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
              className="rounded-full bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20"
            >
              {fullscreen ? "Exit full screen" : "Full screen"}
            </button>
            {/* BACK button — closes the modal and returns to the feed/profile
                WITHOUT a route change (setOpen(null) only unmounts the dialog),
                so the surrounding page state is preserved and never reloads. */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20"
            >
              Back
            </button>
          </div>
        </div>

        {/* THE GAME. The wrapper is `flex-1 min-h-0` so it claims exactly the
            space left under the header and never overflows the dialog; the
            iframe then fills that box with `h-full w-full`. `border-0` removes
            the default frame. `allow` grants only what a browser game plausibly
            needs: audio that may start without a tap and keeping the screen
            awake during play. */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <iframe
          src={reloadKey === 0 ? gameUrl : `${gameUrl}${gameUrl.includes("?") ? "&" : "?"}retry=${reloadKey}`}
          title="Game Zone"
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; screen-wake-lock"
          onLoad={() => setLoadState("ready")}
          onError={() => setLoadState("failed")}
        />

        {loadState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b0f19]">
            <span
              className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-rose-500"
              aria-hidden="true"
            />
            <p className="text-sm text-slate-400">Loading {gameTitle}…</p>
          </div>
        )}

        {loadState === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b0f19] px-8 text-center">
            <p className="text-4xl" aria-hidden="true">🎮</p>
            <p className="text-base font-semibold text-white">
              {gameTitle} couldn&apos;t start
            </p>
            <p className="max-w-sm text-sm text-slate-400">
              The game build didn&apos;t respond. Check your connection and try
              again, or pick another title from the Game Center.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
              >
                Back to games
              </button>
              <button
                type="button"
                /* Retry re-keys the iframe src (reloadKey++), which is the only
                   way to force the browser to re-request the embed — the load
                   effect reruns and the 15s timeout restarts with it. */
                onClick={() => setReloadKey((key) => key + 1)}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

/**
 * The global listener. Mount ONCE — the root layout does, beside the auth and
 * profile-view providers. Renders nothing until a launch URL arrives.
 *
 * LAUNCH FLOW: event → registry check → POST /api/game/launch → URL → modal.
 * The open state is keyed by gameId and a response is applied only if that
 * game is STILL the one being opened, so a rapid double-tap can never paint
 * game A into a modal the member already retargeted at game B. Failures
 * surface through `notifyFailure` and leave the launcher closed — a broken
 * endpoint degrades to "nothing happened", never to a modal with a dead
 * iframe.
 */
export function GameModalProvider() {
  /* Which game is being launched, and its URL once resolved. `gameUrl: null`
     means the request is in flight: the modal deliberately does not render
     yet — there is no src-less frame to show. */
  const [open, setOpen] = useState<{ gameId: string; gameUrl: string | null; coinBalance: number | null } | null>(null);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ gameId?: string }>).detail;
      const requested = detail?.gameId?.trim() || DEFAULT_GAME_ID;
      /* Resolve against the client mirror of the registry FIRST: an unknown id
         is a call-site programming error, and it must not cost a round trip to
         learn what the server would also reject. */
      const game = findGame(requested);
      if (!game) {
        notifyFailure("That game isn't available yet.");
        return;
      }

      setOpen({ gameId: game.id, gameUrl: null, coinBalance: null });

       fetch("/api/game/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`launch failed (${res.status})`);
          return res.json() as Promise<{ gameUrl: string }>;
        })
        .then((data) => {
          /* Apply ONLY if this game is still the open one — see doc above. */
          setOpen((current) =>
            current && current.gameId === game.id ? { ...current, gameUrl: data.gameUrl } : current
          );
        })
        .catch(() => {
          notifyFailure("Couldn't start the game. Please try again.");
          setOpen((current) => (current && current.gameId === game.id ? null : current));
        });

      fetch("/api/wallet/purchase", {
        method: "GET",
      })
        .then((res) => {
          if (!res.ok) throw new Error(`wallet read failed (${res.status})`);
          return res.json() as Promise<{ coinBalance: number }>;
        })
        .then((wallet) => {
          /* Apply ONLY if this game is still the open one — see doc above. */
          setOpen((current) =>
            current && current.gameId === game.id
              ? { ...current, coinBalance: wallet.coinBalance }
              : current
          );
        })
        .catch(() => {
          notifyFailure("Couldn't read your wallet. Please try again.");
          setOpen((current) => (current && current.gameId === game.id ? null : current));
        });
    }

    window.addEventListener(OPEN_GAME_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GAME_EVENT, onOpen);
  }, []);

  const close = useCallback(() => {
    setOpen(null);
  }, []);

  /* `gameUrl === null` = request in flight (or failed): render nothing rather
     than a modal with an empty iframe. */
  if (open === null || open.gameUrl === null) return null;
  return (
    <GameModal
      gameUrl={open.gameUrl}
      gameTitle={findGame(open.gameId)?.title ?? "Game"}
      coinBalance={open.coinBalance}
      onClose={close}
    />
  );
}

