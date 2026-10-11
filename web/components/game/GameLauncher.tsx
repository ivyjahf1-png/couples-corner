"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Gamepad2, Send, Swords, X } from "lucide-react";
import { notifyFailure, notifySuccess } from "@/components/ui/FailureToasts";
import { openGame } from "@/components/game/GameModal";
import { openTruthOrDare, type TruthOrDareCategory } from "@/components/game/TruthOrDareModal";
import { findGame } from "@/lib/game/registry";
import { sendMessageAction } from "@/lib/actions/messaging";

/**
 * THE MULTIPLAYER GAME LAUNCHER.
 *
 * Two halves with one job — get two people into the same game:
 *
 * 1. `GameChallengeButton` — rendered inside a chat room. One tap posts a
 *    "Challenge to Play X" card into the thread as a NORMAL text message
 *    through `sendMessageAction`, so the challenge renders on every message
 *    surface (thread, inbox preview, realtime feed) with no new message type,
 *    migration, or renderer. The recipient taps "Play now" on the challenge
 *    bubble… which is just this same launcher opening the same registry id.
 * 2. `GameLauncherSheet` — the embedded-game container: a high-quality
 *    fullscreen canvas/iframe with top navigation (title + coin counter), a
 *    functioning Close button, and Escape-to-dismiss. Iframe games resolve
 *    their URL through the signed `/api/game/launch` route via `openGame()`;
 *    native games (Truth or Dare, Real Feelings, quiz) dispatch their own
 *    modal event instead and never touch an iframe src.
 */

/** Challenge message prefix — lets a chat bubble recognise itself as a challenge. */
export const GAME_CHALLENGE_PREFIX = "🎮 Game challenge:";

/** Build the challenge body posted into the chat thread. */
export function buildChallengeBody(gameId: string): string | null {
  const game = findGame(gameId);
  if (!game) return null;
  return `${GAME_CHALLENGE_PREFIX} ${game.title} — tap Play to join me! [play:${game.id}]`;
}

/**
 * "Challenge to Play" button for chat rooms.
 *
 * Posts the challenge card into `conversationId` as a text message. The
 * `[play:gameId]` token at the tail is the machine-readable half: message
 * renderers can turn it into a Play button, and humans reading raw text
 * still see a friendly invite.
 */
export function GameChallengeButton({
  conversationId,
  gameId,
  label,
}: {
  conversationId: string;
  gameId: string;
  label?: string;
}) {
  const [sending, setSending] = useState(false);
  const game = findGame(gameId);

  async function handleChallenge() {
    if (sending || !game) return;
    const body = buildChallengeBody(gameId);
    if (!body) {
      notifyFailure("That game isn't available yet.");
      return;
    }
    setSending(true);
    try {
      const result = await sendMessageAction({ conversationId, body });
      if (result.ok) {
        notifySuccess(`Challenge sent — ${game.title} awaits!`);
      } else {
        notifyFailure(result.error ?? "Couldn't send the challenge.");
      }
    } catch {
      notifyFailure("Couldn't send the challenge. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!game) return null;

  return (
    <button
      type="button"
      onClick={handleChallenge}
      disabled={sending}
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-60"
      title={`Challenge your match to ${game.title}`}
      aria-label={label ?? `Challenge to play ${game.title}`}
    >
      <Swords className="h-3.5 w-3.5" aria-hidden="true" />
      {sending ? "Sending…" : (label ?? `Challenge: ${game.title}`)}
    </button>
  );
}

/** Launch any registry entry the smart way: iframe games via signed launcher, native via modal event. */
export function launchGameEntry(gameId: string) {
  const game = findGame(gameId);
  if (!game) {
    notifyFailure("That game isn't available yet.");
    return;
  }
  if (game.kind === "native") {
    const category: TruthOrDareCategory | undefined =
      game.id === "real-feelings" ? "deep" : game.id === "truth-or-dare" ? "soft" : undefined;
    openTruthOrDare(category ? { category } : undefined);
    return;
  }
  openGame(game.id);
}

/** Event name for opening the launcher sheet directly with a minted URL. */
export const OPEN_GAME_SHEET_EVENT = "couplescorner:open-game-sheet";

/** Open the fullscreen sheet around an already-minted game URL. */
export function openGameSheet(options: { gameUrl: string; gameTitle: string; coinBalance?: number | null }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_GAME_SHEET_EVENT, { detail: options }));
}

function GameLauncherSheet({
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
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-[#0B1120]" role="dialog" aria-modal="true" aria-label={gameTitle}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0F172A]/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
            <Gamepad2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-white">{gameTitle}</h2>
            <p className="text-[11px] text-slate-400">Couples Corner Arcade</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {coinBalance !== null && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200"
              title="Your coin balance"
            >
              <Coins className="h-3.5 w-3.5" aria-hidden="true" />
              {coinBalance.toLocaleString()}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${gameTitle}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 bg-black">
        <iframe
          src={gameUrl}
          title={gameTitle}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; gamepad"
          allowFullScreen
          loading="eager"
        />
      </div>
    </div>
  );
}


/** Root-layout provider for the fullscreen sheet. Null until `openGameSheet()` fires. */
export function GameLauncherProvider() {
  const [open, setOpen] = useState<{ gameUrl: string; gameTitle: string; coinBalance: number | null } | null>(null);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ gameUrl?: string; gameTitle?: string; coinBalance?: number | null }>).detail;
      if (!detail?.gameUrl) return;
      setOpen({
        gameUrl: detail.gameUrl,
        gameTitle: detail.gameTitle?.trim() || "Game",
        coinBalance: typeof detail.coinBalance === "number" ? detail.coinBalance : null,
      });
    }
    window.addEventListener(OPEN_GAME_SHEET_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GAME_SHEET_EVENT, onOpen);
  }, []);

  const close = useCallback(() => setOpen(null), []);

  if (open === null) return null;
  return <GameLauncherSheet gameUrl={open.gameUrl} gameTitle={open.gameTitle} coinBalance={open.coinBalance} onClose={close} />;
}

/** Inline challenge card rendered wherever a bubble carries a `[play:gameId]` token. */
export function GameChallengeCard({ gameId }: { gameId: string }) {
  const game = findGame(gameId);
  if (!game || game.kind === "native") return null;
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-600/30 to-teal-700/30">
      <div className="flex items-center gap-3 p-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl ${game.gradient}`} aria-hidden="true">
          {game.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{game.title}</p>
          <p className="truncate text-xs text-emerald-200/80">{game.tagline}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => launchGameEntry(game.id)}
        className="flex w-full items-center justify-center gap-2 border-t border-emerald-300/20 bg-emerald-500/20 px-3 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/30"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        Play now
      </button>
    </div>
  );
}

