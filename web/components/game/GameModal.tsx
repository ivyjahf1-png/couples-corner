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
 * `gameUrl` is a RESOLVED string by contract — the provider mounts this only
 * once the launch POST has returned, so there is no src-less frame and no
 * loading state to render here.
 */
export default function GameModal({
  gameUrl,
  onClose,
}: {
  gameUrl: string;
  onClose: () => void;
}) {
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
      className="fixed inset-0 z-[300] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Game Zone"
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0b0f19] p-3">
        <span className="text-sm font-bold text-white">Game Zone</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-3 py-1 text-sm text-white"
        >
          Close
        </button>
      </div>
      {/* THE GAME. `flex-1` + `w-full` give the iframe every remaining pixel;
          `border-0` removes the default frame. `allow` grants only what a
          browser game plausibly needs: audio that may start without a tap and
          keeping the screen awake during play. */}
      <iframe
        src={gameUrl}
        title="Game Zone"
        className="w-full flex-1 border-0"
        allow="autoplay; screen-wake-lock"
      />
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
  const [open, setOpen] = useState<{ gameId: string; gameUrl: string | null } | null>(null);

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

      setOpen({ gameId: game.id, gameUrl: null });

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
  return <GameModal gameUrl={open.gameUrl} onClose={close} />;
}

