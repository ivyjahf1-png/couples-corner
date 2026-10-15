"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Coins, Wrench } from "lucide-react";
import { RacingHub } from "@/components/game/racing/RacingHub";
import type { RaceUpgrades, SelectedCar, SelectedTrack } from "@/components/game/racing/RacingHub";
import { RacingEngine } from "@/components/game/engines/RacingEngine";

interface Loadout {
  car: SelectedCar;
  track: SelectedTrack;
  upgrades: RaceUpgrades;
}

export default function ApexRacingPage() {
  const [phase, setPhase] = useState<"hub" | "race">("hub");
  const [coins, setCoins] = useState(10_000);
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [raceId, setRaceId] = useState(0);

  return (
    <main className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white select-none">
      {/* ── TOP CHROME ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyan-500/20 bg-slate-950/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Link
            href="/games"
            aria-label="Back to Game Center"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 transition hover:bg-cyan-900/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-widest text-cyan-300">APEX RACING 4D/5D</span>
            <span className="text-[9px] font-bold text-slate-400">
              {phase === "hub"
                ? "DEALERSHIP · MECHANIC · CITY TRACKS"
                : loadout
                  ? `${loadout.car.name} · ${loadout.track.name}`
                  : "RACE"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-black/50 px-3 py-1">
          <Coins className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-black text-amber-300">{coins.toLocaleString()}</span>
        </div>
      </div>

      {/* ── PHASE 1: RACING HUB (dealership → mechanic → city track) ── */}
      {phase === "hub" || !loadout ? (
        <RacingHub
          coins={coins}
          onSpend={(cost) => setCoins((c) => Math.max(0, c - cost))}
          onLaunchRace={(car, track, upgrades) => {
            setLoadout({ car, track, upgrades });
            setRaceId((id) => id + 1);
            setPhase("race");
          }}
        />
      ) : (
        /* ── PHASE 2: 4D CANVAS RACE WITH THE SELECTED LOADOUT ────── */
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 pb-16">
          <button
            type="button"
            onClick={() => setPhase("hub")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/40 bg-cyan-950/40 py-2.5 text-[10px] font-black tracking-widest text-cyan-300 transition active:scale-95"
          >
            <Wrench className="h-3.5 w-3.5" /> BACK TO GARAGE &amp; MECHANIC
          </button>
          <RacingEngine
            key={raceId}
            car={loadout.car}
            track={loadout.track}
            upgrades={loadout.upgrades}
            onWin={(amount) => setCoins((c) => c + amount)}
            onLose={(amount) => setCoins((c) => Math.max(0, c - amount))}
          />
        </div>
      )}
    </main>
  );
}
