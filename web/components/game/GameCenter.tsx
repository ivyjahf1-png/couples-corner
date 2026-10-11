"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Flame, Gamepad2, Puzzle, Swords, Trophy, X } from "lucide-react";
import { HTML5_GAMES, type Html5Game } from "@/lib/game/registry";
import { openGame } from "@/components/game/GameModal";
import { openTruthOrDare, type TruthOrDareCategory } from "@/components/game/TruthOrDareModal";

/**
 * THE HIGH-END MATCHMAKING GAME SUITE.
 *
 * Organised into clean tabs — Puzzle & Match, Flirting & Icebreakers,
 * Multiplayer Classics — plus the Coin Thrills grid, so every registry entry
 * renders in exactly one home and nothing is homeless.
 *
 * Launch routing: iframe entries open through the signed `/api/game/launch`
 * flow via `openGame(id)`; native entries (Truth or Dare, Real Feelings,
 * compatibility quiz) dispatch `openTruthOrDare()` and never touch an
 * iframe. Event names for opening: `openGame(gameId)`,
 * `openTruthOrDare({ category })`.
 */

type GameTab = "puzzle" | "flirting" | "multiplayer" | "thrills";

const TABS: readonly { id: GameTab; label: string; emoji: string }[] = [
  { id: "puzzle", label: "Puzzle & Match", emoji: "🧩" },
  { id: "flirting", label: "Flirting & Icebreakers", emoji: "💌" },
  { id: "multiplayer", label: "Multiplayer Classics", emoji: "🎲" },
  { id: "thrills", label: "Coin Thrills", emoji: "🪙" },
];

/** Event name for opening the Game Center suite. */
export const OPEN_GAME_CENTER_EVENT = "couplescorner:open-game-center";

/** Open the Game Center suite from ANY client surface. Browser-only, never throws on the server. */
export function openGameCenter() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_GAME_CENTER_EVENT));
}

function sectionGames(section: "puzzle" | "multiplayer" | "thrill"): Html5Game[] {
  return HTML5_GAMES.filter((game) => (game.section ?? "puzzle") === section);
}

/** Native flirting entries (Truth or Dare, Real Feelings, quiz). */
function flirtingGames(): Html5Game[] {
  return HTML5_GAMES.filter((game) => game.kind === "native");
}

function GameCard({ game }: { game: Html5Game }) {
  const isNative = game.kind === "native";

  function handlePlay() {
    if (isNative) {
      const category: TruthOrDareCategory | undefined =
        game.id === "real-feelings" ? "deep" : game.id === "truth-or-dare" ? "soft" : undefined;
      openTruthOrDare(category ? { category } : undefined);
      return;
    }
    openGame(game.id);
  }

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-white/25 hover:shadow-xl">
      <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${game.gradient}`}>
        <span className="text-5xl drop-shadow-lg transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
          {game.emoji}
        </span>
        {game.categoryLabel && (
          <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
            {game.categoryLabel}
          </span>
        )}
        {game.coinGame && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
            <Coins className="h-3 w-3" aria-hidden="true" />
            Coins
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-bold text-white">{game.title}</h3>
        <p className="mt-0.5 line-clamp-2 min-h-8 text-xs leading-4 text-slate-400">{game.tagline}</p>
        <button
          type="button"
          onClick={handlePlay}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95"
          aria-label={`Play ${game.title}`}
        >
          <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
          {isNative ? "Open" : game.challengeable ? "Play 1v1" : "Play now"}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}


function GameCenterSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<GameTab>("puzzle");
  const puzzle = useMemo(() => sectionGames("puzzle"), []);
  const flirting = useMemo(() => flirtingGames(), []);
  const multiplayer = useMemo(() => sectionGames("multiplayer").filter((g) => g.kind !== "native"), []);
  const thrills = useMemo(() => sectionGames("thrill"), []);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Game Center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-gradient-to-b from-[#141B33] to-[#0B1120] shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Matchmaking Suite</p>
            <h2 className="text-xl font-bold text-white">Game Center</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Game Center"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-3" role="tablist" aria-label="Game categories">
          {TABS.map((entry) => {
            const active = entry.id === tab;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(entry.id)}
                className={[
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
                  active
                    ? "border-rose-300/70 bg-rose-500/20 text-rose-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white",
                ].join(" ")}
              >
                <span aria-hidden="true">{entry.emoji}</span>
                {entry.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {tab === "puzzle" && (
            <div role="tabpanel" aria-label="Puzzle and Match">
              <SectionHeader icon={<Puzzle className="h-4 w-4 text-cyan-300" />} title="Puzzle & Match" subtitle="Solo focus games to unwind together" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {puzzle.map((game) => (<GameCard key={game.id} game={game} />))}
              </div>
            </div>
          )}
          {tab === "flirting" && (
            <div role="tabpanel" aria-label="Flirting and Icebreakers">
              <SectionHeader icon={<Flame className="h-4 w-4 text-rose-300" />} title="Flirting & Connection" subtitle="Icebreakers that spark real talk" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {flirting.map((game) => (<GameCard key={game.id} game={game} />))}
              </div>
            </div>
          )}
          {tab === "multiplayer" && (
            <div role="tabpanel" aria-label="Multiplayer Classics">
              <SectionHeader icon={<Swords className="h-4 w-4 text-emerald-300" />} title="Multiplayer Classics" subtitle="Challenge your match head-to-head" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {multiplayer.map((game) => (<GameCard key={game.id} game={game} />))}
              </div>
            </div>
          )}
          {tab === "thrills" && (
            <div role="tabpanel" aria-label="Coin Thrills">
              <SectionHeader icon={<Trophy className="h-4 w-4 text-amber-300" />} title="Coin Thrills" subtitle="Stake coins and chase the pot" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {thrills.map((game) => (<GameCard key={game.id} game={game} />))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * Root-layout provider. Renders null until `openGameCenter()` fires.
 * The floating Game button and badges should call `openGameCenter()`;
 * `openGame(id)` still launches a single title directly.
 */
export function GameCenterProvider() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(OPEN_GAME_CENTER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GAME_CENTER_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open ]);

  if (!open) return null;
  return <GameCenterSheet onClose={() => setOpen(false)} />;
}

