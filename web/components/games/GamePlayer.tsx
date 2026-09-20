"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameEntry } from "@/lib/games";
import { LudoGame } from "@/components/games/LudoGame";

/**
 * Game player container — /games/[id].
 *
 * - Full-screen on mobile; a centered, framed viewport on desktop.
 * - Hosts either an external HTML5 game in a sandboxed iframe or the
 *   built-in canvas Ludo engine.
 * - Overlay toolbar: live coin balance, audio toggle, and exit to the hub.
 * - Secure coin-staking hook: the buy-in and win payout both go through
 *   /api/games/reward — amounts are derived server-side from the registry.
 */

type PlayerState = "buy-in" | "playing" | "settled";

export function GamePlayer({
  game,
  related,
  coinBalance: initialBalance,
  authenticated,
}: {
  game: GameEntry;
  related: GameEntry[];
  coinBalance: number;
  authenticated: boolean;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [state, setState] = useState<PlayerState>(game.stake > 0 ? "buy-in" : "playing");
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stakeTakenRef = useRef(game.stake <= 0);

  const showToast = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3200);
  }, []);

  /** Deduct the registry-defined buy-in before the first launch. */
  const placeStake = useCallback(async () => {
    if (game.stake <= 0) {
      stakeTakenRef.current = true;
      setState("playing");
      return;
    }
    if (!authenticated) {
      showToast("Sign in to play for coins.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/games/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stake", gameId: game.slug }),
      });
      const data = (await res.json()) as { balance?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not place stake");
      if (typeof data.balance === "number") setBalance(data.balance);
      stakeTakenRef.current = true;
      setState("playing");
      showToast(`Buy-in placed: ${game.stake} coins. Good luck!`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not place stake");
    } finally {
      setBusy(false);
    }
  }, [game.slug, game.stake, authenticated, showToast]);

  /** Settle the session with the server (win/loss only — no client amounts). */
  const settle = useCallback(
    async (won: boolean) => {
      if (!stakeTakenRef.current || !authenticated) return;
      try {
        const res = await fetch("/api/games/reward", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "settle", gameId: game.slug, won }),
        });
        const data = (await res.json()) as { balance?: number; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Settlement failed");
        if (typeof data.balance === "number") setBalance(data.balance);
        setState("settled");
        showToast(won ? "Victory! Coins credited 🏆" : "Good game — stake lost.");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Settlement failed");
      }
    },
    [game.slug, authenticated, showToast]
  );

  /** External HTML5 games talk over postMessage: {type:"cc-game-over",won}. */
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; won?: boolean } | null;
      if (data?.type === "cc-game-over" && typeof data.won === "boolean") {
        void settle(data.won);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [settle]);

  /** Best-effort mute/unmute for iframe-hosted HTML5 games. */
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: muted ? "cc-mute" : "cc-unmute" },
      "*"
    );
  }, [muted]);

  const toggleFullscreen = useCallback(() => {
    const node = containerRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      setFullscreen(false);
    } else {
      void node.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    }
  }, []);

  const viewport = fullscreen
    ? "fixed inset-0 z-[70] bg-slate-950"
    : "mx-auto w-full max-w-4xl";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] px-3 py-4 text-white sm:px-6 sm:py-8">
      <div ref={containerRef} className={viewport}>
        {/* ── Overlay toolbar ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur-md sm:rounded-t-3xl">
          <div className="flex items-center gap-3">
            <Link
              href="/games"
              aria-label="Exit back to the Game Center"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 transition hover:border-orange-400/60 hover:text-orange-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Exit
            </Link>
            <span className="hidden text-sm font-bold text-white/80 sm:inline">{game.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live coin balance */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-sm font-bold text-amber-200" aria-live="polite">
              🪙 {balance.toLocaleString()}
            </span>
            {/* Audio toggle */}
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-pressed={muted}
              aria-label={muted ? "Unmute game audio" : "Mute game audio"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/90 transition hover:border-orange-400/60 hover:text-orange-200"
            >
              {muted ? "🔇" : "🔊"}
            </button>
            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/90 transition hover:border-orange-400/60 hover:text-orange-200"
            >
              {fullscreen ? "🗗" : "⛶"}
            </button>
          </div>
        </div>

        {/* ── Game viewport ───────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-2xl shadow-black/40 backdrop-blur-md sm:rounded-b-3xl">
          {/* Buy-in gate */}
          {state === "buy-in" ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="text-6xl" aria-hidden="true">{game.emoji}</span>
              <h2 className="text-2xl font-extrabold">{game.title}</h2>
              <p className="max-w-sm text-sm text-white/60">
                This table plays for coins. Place a {game.stake}-coin buy-in to start —
                winners cash out up to {game.reward} coins, verified server-side.
              </p>
              <button
                type="button"
                onClick={placeStake}
                disabled={busy}
                className="rounded-xl bg-[#FF5722] px-8 py-3 text-base font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:bg-[#F4511E] focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
              >
                {busy ? "Placing buy-in…" : `Buy in · 🪙 ${game.stake}`}
              </button>
            </div>
          ) : game.kind === "builtin-ludo" ? (
            /* Built-in canvas Ludo engine — VS-Bot multiplayer logic. */
            <LudoGame
              muted={muted}
              onGameOver={(won) => {
                void settle(won);
              }}
            />
          ) : game.iframeSrc ? (
            /* External HTML5 game — sandboxed, responsive, full-height. */
            <iframe
              ref={iframeRef}
              src={game.iframeSrc}
              title={game.title}
              className="h-[70vh] min-h-[420px] w-full bg-black"
              allow="autoplay; fullscreen; gamepad"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            />
          ) : (
            <PlaceholderGame
              game={game}
              onBack={() => setState(game.stake > 0 ? "buy-in" : "playing")}
            />
          )}

          {/* Settled — play again */}
          {state === "settled" ? (
            <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-slate-950/80 p-4">
              <p className="text-sm text-white/70">Session settled. Ready for another round?</p>
              <button
                type="button"
                onClick={() => {
                  stakeTakenRef.current = false;
                  setState(game.stake > 0 ? "buy-in" : "playing");
                }}
                className="rounded-xl bg-[#FF5722] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#F4511E]"
              >
                Play again
              </button>
            </div>
          ) : null}
        </div>

        <RelatedGames related={related} hidden={fullscreen} />
      </div>

      {/* Toast */}
      {message ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/90 px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md"
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}

/** HTML5 slot placeholder — shown until a hosted build is wired in. */
function PlaceholderGame({ game, onBack }: { game: GameEntry; onBack: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="text-6xl opacity-70" aria-hidden="true">{game.emoji}</span>
      <h2 className="text-xl font-bold">{game.title}</h2>
      <p className="max-w-sm text-sm text-white/55">
        The HTML5 build for this game is being prepared. Your buy-in window will
        open here as soon as it goes live.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-orange-400 underline-offset-4 hover:underline"
      >
        Back
      </button>
    </div>
  );
}

/** "More games" strip below the viewport (hidden in fullscreen). */
function RelatedGames({ related, hidden }: { related: GameEntry[]; hidden: boolean }) {
  if (hidden) return null;
  return (
    <nav aria-label="More games" className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
        More games
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {related.map((entry) => (
          <Link
            key={entry.slug}
            href={`/games/${entry.slug}`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-white/25 hover:bg-white/10"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${entry.gradient} text-xl shadow-lg`}
              aria-hidden="true"
            >
              {entry.emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{entry.title}</span>
              <span className="block text-xs text-white/50">🪙 {entry.stake} buy-in</span>
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
