"use client";

import { useCallback, useEffect, useState } from "react";
import { notifyFailure } from "@/components/ui/FailureToasts";
import { DEFAULT_GAME_ID, findGame } from "@/lib/game/registry";

/**
 * THE HTML5 GAME LAUNCHER MODAL.
 *
 * â”€â”€ WHY AN EVENT-DRIVEN PROVIDER (same shape as ProfileViewModal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * The entry points are scattered across independent client trees and one SERVER
 * tree: the floating Game button (client), the feed's star action (client), and
 * the profile screen's Recommended Games tiles (a Server Component that cannot
 * take onClick at all). Threading a launch callback down through those
 * boundaries is impossible, so this module mirrors the pattern the app already
 * uses for auth and profile overlays: `openGame()` dispatches ONE custom event,
 * `GameModalProvider` mounted once in the root layout listens for it, asks
 * `/api/game/launch` for a signed URL, and renders the modal. Any surface opens
 * a game by calling `openGame(gameId)` â€” no prop drilling, no context plumbing
 * across RSC boundaries.
 *
 * â”€â”€ WHY THE URL ALWAYS COMES FROM THE SERVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * The iframe never receives a URL the client made up. The route validates the
 * id against `lib/game/registry` (the allow-list), embeds the SESSION's uid —
 * never a body-supplied one — and appends the provider token, which exists only
 * in server env. The client supplies a registry KEY and nothing else; the
 * server decides what loads, for whom, and with what credential.
 *
 * â”€â”€ DISMISSAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Escape and the header X both close it. There is no route-change dismissal
 * (unlike ProfileViewModal): while the modal is open the app chrome behind it
 * is unreachable, and the iframe owns its own internal navigation â€” which never
 * touches OUR pathname.
 *
 * Z-INDEX: `z-[300]` (Z.dialog) written as a literal because Tailwind extracts
 * classes by scanning source text; a composed `z-[${Z.dialog}]` is silently
 * dropped. Above sheets (200) and the fixed nav (50): a fullscreen game must
 * own the whole viewport.
 *
 * BALANCE HEADER: fetched from GET /api/wallet/purchase (the same endpoint the
 * header wallet chip polls), so the number in the modal is the live Supabase
 * `game_wallets` balance, not a cached prop. A failed fetch degrades to an
 * em dash rather than an error state â€” the game still plays without it.
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
 * keyboard activation works and the a11y tree says "button", not "link" â€” there
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
 * The modal shell: glass panel, header (title + live balance + close), and the
 * game iframe. Rendered ONLY by `GameModalProvider` below.
 *
 * `gameUrl` is null while the launch request is in flight — the iframe slot
 * shows a spinner instead of mounting an empty frame, so there is never a
 * blank canvas behind the header. `title` is display-only registry copy.
 */
function GameModal({
  gameUrl,
  title,
  onClose,
}: {
  gameUrl: string | null;
  title: string;
  onClose: () => void;
}) {
  /* LIVE WALLET BALANCE — same endpoint the header chip polls, so the figure
     here cannot drift from the rest of the app. Null until the fetch settles;
     the header renders an em dash rather than a guessed zero. */
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wallet/purchase", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { coinBalance?: number } | null) => {
        if (!cancelled && typeof data?.coinBalance === "number") {
          setBalance(data.coinBalance);
        }
      })
      .catch(() => {
        /* Offline or signed out — the em dash is the honest state. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Escape closes — the one dismissal gesture that works identically on every
     surface the modal opens over (mirrors ProfileViewModal). */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-[#080B18]/90 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} game`}
    >
      {/* GLASS HEADER — translucent band over the game canvas. `shrink-0` keeps
          it pinned when the iframe tries to grow; the X is the primary close
          (Escape is its keyboard equivalent, not discoverable on touch). */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-white/[0.06] px-4 py-3">
        <span className="text-lg" aria-hidden="true">
          🎮
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-white">{title}</h2>
        {/* WALLET BALANCE — live Supabase figure, thousands-separated.
            `tabular-nums` stops the digits jittering if it refreshes live. */}
        <span
          className="flex shrink-0 items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-200"
          aria-label="Coin balance"
        >
          🪙{" "}
          <span className="tabular-nums">{balance === null ? "—" : balance.toLocaleString()}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close game"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ✕
          </span>
        </button>
      </header>

      {/* LOADING vs GAME. While the launch POST is in flight the modal shows a
          spinner instead of mounting an iframe with no src — there is never a
          blank frame behind the header. */}
      {gameUrl === null ? (
        <div
          className="flex min-h-0 flex-1 items-center justify-center"
          role="status"
          aria-label="Launching game"
        >
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"
            aria-hidden="true"
          />
        </div>
      ) : (
        /* THE GAME. `min-h-0` + `flex-1` hand the iframe every remaining pixel
           without letting it squeeze the header. `border-0` removes the default
           frame. `allow` grants only what a browser game plausibly needs: audio
           that may start without a tap, and keeping the screen awake during
           play. `referrerPolicy` keeps our path and signed token out of any
           request the GAME itself makes outbound. The `key` remounts a FRESH
           document per game — React would otherwise reuse the frame and show
           the old game under the new title. */
        <iframe
          key={gameUrl}
          src={gameUrl}
          title={`${title} game`}
          className="min-h-0 w-full flex-1 border-0 bg-[#080B18]"
          allow="autoplay; screen-wake-lock"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}

/**
 * The global listener. Mount ONCE — the root layout does, beside the auth and
 * profile-view providers. Renders nothing when idle.
 *
 * LAUNCH FLOW: event → POST /api/game/launch → signed URL → modal. The POST
 * result is tagged with the gameId it was requested for and only applied if
 * that game is STILL the open one, so a rapid double-tap (or a stale response
 * landing after Escape) can never paint the wrong game into a modal the member
 * already closed. Failures surface through `notifyFailure` and leave the
 * launcher closed — a broken endpoint degrades to "nothing happened", never to
 * a modal with a dead iframe.
 */
export function GameModalProvider() {
  /* ONE object: which game is open and its URL (null while the launch request
     is in flight). */
  const [open, setOpen] = useState<{ gameId: string; gameUrl: string | null; title: string } | null>(
    null
  );

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ gameId?: string }>).detail;
      const requested = detail?.gameId?.trim() || DEFAULT_GAME_ID;
      /* Resolve against the client mirror of the registry FIRST: an unknown id
         is a call-site programming error, and it must not cost a round trip to
         learn that the server would reject it too. */
      const game = findGame(requested);
      if (!game) {
        notifyFailure("That game isn't available yet.");
        return;
      }

      setOpen({ gameId: game.id, gameUrl: null, title: game.title });

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
          /* Apply ONLY if this game is still open — see doc comment above. */
          setOpen((current) =>
            current && current.gameId === game.id ? { ...current, gameUrl: data.gameUrl } : current
          );
        })
        .catch(() => {
          notifyFailure("Couldn't start the game. Please try again.");
          setOpen((current) => (current && current.gameId === game.id ? null : current));
        });
    }

    window.addEventListener(OPEN_GAME_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GAME_EVENT, onOpen);
  }, []);

  const close = useCallback(() => {
    setOpen(null);
  }, []);

  if (open === null) return null;
  return <GameModal gameUrl={open.gameUrl} title={open.title} onClose={close} />;
}

