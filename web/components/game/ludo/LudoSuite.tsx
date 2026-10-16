"use client";
import { useState } from "react";
import { LudoSplash } from "./LudoSplash";
import { LudoHub, type LudoMatchConfig } from "../LudoHub";
import { LudoEngine } from "../engines/LudoEngine";
import { useGameWallet } from "../useGameWallet";

/**
 * LudoSuite — the full Ludo Superstar launch flow.
 *
 * Phase order:
 *  1. `splash`  — 10-second 4D/5D intro (two tumbling 3D dice + particles).
 *  2. `hub`     — pre-match hub: game mode, match type, AI difficulty, bet.
 *  3. `match`   — the in-gate dice engine, driven by the chosen config.
 *
 * Wallet `balance`/`applyDelta` from {@link useGameWallet} back the engine's
 * `onWin`/`onLose` so coins persist across the match.
 */
export function LudoSuite() {
  const [phase, setPhase] = useState<"splash" | "hub" | "match">("splash");
  const [config, setConfig] = useState<LudoMatchConfig | null>(null);
  const { balance, applyDelta } = useGameWallet();

  if (phase === "splash") {
    return <LudoSplash onDone={() => setPhase("hub")} />;
  }

  if (phase === "hub") {
    return (
      <div className="h-full w-full">
        <LudoHub
          onStartMatch={(cfg) => {
            setConfig(cfg);
            setPhase("match");
          }}
        />
      </div>
    );
  }

  if (!config) {
    setPhase("hub");
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-xl p-3">
      <button
        type="button"
        onClick={() => setPhase("hub")}
        className="mb-3 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
      >
        ← Back to Hub
      </button>
      <LudoEngine
        config={config}
        onWin={(n) => void applyDelta(n)}
        onLose={(n) => void applyDelta(-n)}
      />
      <p className="mt-2 text-center text-[10px] text-slate-500">
        Balance {balance.toLocaleString("en-US")} 🪙
      </p>
    </div>
  );
}
