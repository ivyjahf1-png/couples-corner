"use client";

import { useState } from "react";
import { Sparkles, Trophy, Zap, Settings, Plus, Minus } from "lucide-react";

export type LudoGameMode = "classic" | "aero" | "tally";
export type LudoMatchType = "2p" | "4p" | "friends" | "team" | "cpu";
export type LudoAiLevel = "easy" | "mid" | "hard";

export interface LudoMatchConfig {
  mode: LudoGameMode;
  matchType: LudoMatchType;
  players: number;
  bet: number;
  aiLevel: LudoAiLevel;
}

/** Coin cost of each consumable power-up (kept in sync with LudoEngine). */
export const POWER_COSTS = { roll2: 300, undo: 500, hilo: 800 } as const;

export function LudoHub({ onStartMatch }: { onStartMatch: (config: LudoMatchConfig) => void }) {
  const [activeTab, setActiveTab] = useState<"home" | "liveMatch">("home");
  const [gameMode, setGameMode] = useState<LudoGameMode>("classic");
  const [matchType, setMatchType] = useState<LudoMatchType>("4p");
  const [aiLevel, setAiLevel] = useState<LudoAiLevel>("mid");
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [betAmount, setBetAmount] = useState<number>(100000); // 100K Default

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-br from-[#0F172A] via-slate-900 to-black font-sans text-white select-none pb-24">
      {/* ── TOP HEADER CURRENCY & LEAGUE BAR ────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
            <span className="text-xs font-black text-white">Lv27</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-amber-400">COUPLE'S ⭐ LUDO</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-cyan-300">⚡ 583/600</span>
            </div>
          </div>
        </div>

        {/* Currencies */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-black/50 px-3 py-1 backdrop-blur">
            <span className="text-sm">🪙</span>
            <span className="text-xs font-black text-amber-300">10,000</span>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── VIEW SWITCHER (Home vs Live Match Setup) ─────────────── */}
      {activeTab === "home" ? (
        <div className="flex flex-1 flex-col p-4 gap-4">
          {/* Top Mission & League Banners */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-3 shadow-xl backdrop-blur-md">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider">LEAGUE</span>
                <p className="text-xs font-black text-white">PROMOTION 🚀</p>
              </div>
              <Trophy className="h-6 w-6 text-amber-400 animate-bounce" />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-3 shadow-xl backdrop-blur-md">
              <div>
                <span className="text-[10px] font-bold text-pink-400 tracking-wider">MISSIONS</span>
                <p className="text-xs font-black text-white">14h 03m left</p>
              </div>
              <Zap className="h-6 w-6 text-cyan-400 animate-pulse" />
            </div>
          </div>

          {/* Featured Event Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-900/40 via-orange-950/60 to-slate-900 p-4 shadow-2xl">
            <div className="absolute right-2 top-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
              ⏱️ 19d 14h
            </div>
            <span className="text-xs font-black text-amber-400 tracking-wider">SPECIAL ARENA</span>
            <p className="text-lg font-black text-white">Couple's ⭐ Ludo Championship</p>
          </div>

          {/* Main Game Mode Cards (Friends & Team Up) */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("liveMatch")}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-orange-500/40 bg-gradient-to-b from-orange-600/20 via-slate-900 to-black p-6 shadow-2xl transition hover:scale-105 active:scale-95"
            >
              <div className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
                ❤️
              </div>
              <div className="my-3 text-4xl">🎲</div>
              <span className="text-sm font-black tracking-widest text-white">FRIENDS</span>
              <span className="text-[10px] text-orange-300 font-bold mt-1">4D Multiplayer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("liveMatch")}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-600/20 via-slate-900 to-black p-6 shadow-2xl transition hover:scale-105 active:scale-95"
            >
              <div className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                ⚔️
              </div>
              <div className="my-3 text-4xl">🛡️</div>
              <span className="text-sm font-black tracking-widest text-white">TEAM UP</span>
              <span className="text-[10px] text-amber-300 font-bold mt-1">2v2 Sensory Arena</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── LIVE MATCH CONFIGURATION HUB ── */
        <div className="flex flex-1 flex-col p-4 gap-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 active:scale-95"
            >
              ← Back
            </button>
            <h2 className="text-sm font-black tracking-widest text-amber-400">Live Match Setup</h2>
            <div className="w-10" />
          </div>

          {/* Win Reward Banner */}
          <div className="flex flex-col items-center justify-center rounded-3xl border border-amber-400/40 bg-gradient-to-b from-amber-500/20 via-slate-900 to-black p-5 shadow-2xl">
            <span className="text-xs font-bold text-slate-400">WIN REWARD</span>
            <div className="flex items-center gap-2 my-1">
              <span className="text-3xl font-black italic text-amber-300">{(betAmount * 2 / 1000).toFixed(0)}K</span>
              <span className="text-xl">🪙</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              ⚡ +15 Energy Boost
            </div>
          </div>

          {/* Game Mode Selector (Classic, Aero, Tally) */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "classic", name: "CLASSIC", badge: "Hot" },
              { id: "aero", name: "AERO", badge: "2d" },
              { id: "tally", name: "TALLY", badge: "3d" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setGameMode(m.id as any)}
                className={`flex flex-col items-center rounded-2xl border p-3 transition active:scale-95 ${
                  gameMode === m.id
                    ? "border-amber-400 bg-gradient-to-br from-amber-500/30 to-slate-900 shadow-lg shadow-amber-500/20"
                    : "border-white/10 bg-slate-900/60"
                }`}
              >
                <span className="text-xs font-black text-white">{m.name}</span>
                <span className="mt-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                  {m.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Match Configuration Card */}
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-md">
            {/* Match Type Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black tracking-widest text-slate-400">MATCH TYPE</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "2p", name: "2 PLAYERS", icon: "👥" },
                  { id: "4p", name: "4 PLAYERS", icon: "🎮" },
                  { id: "friends", name: "FRIENDS", icon: "💖" },
                  { id: "team", name: "TEAM UP", icon: "🛡️" },
                  { id: "cpu", name: "vs CPU", icon: "🤖" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setMatchType(t.id as LudoMatchType);
                      setPlayerCount(t.id === "2p" ? 2 : 4);
                    }}
                    className={`flex flex-col items-center rounded-xl border py-2 transition active:scale-95 ${
                      matchType === t.id
                        ? "border-amber-400 bg-amber-500/20 text-white shadow-lg shadow-amber-500/20"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm">{t.icon}</span>
                    <span className="text-[9px] font-black">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Difficulty (only vs Computer) */}
            {matchType === "cpu" ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black tracking-widest text-slate-400">AI DIFFICULTY</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "easy", name: "EASY", sub: "Rookie bots" },
                    { id: "mid", name: "MID", sub: "Balanced" },
                    { id: "hard", name: "HARD", sub: "Relentless" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setAiLevel(d.id as LudoAiLevel)}
                      className={`rounded-xl border py-2 text-center transition active:scale-95 ${
                        aiLevel === d.id
                          ? "border-amber-400 bg-amber-500/20 text-white shadow-lg shadow-amber-500/20"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <span className="block text-xs font-black">{d.name}</span>
                      <span className="block text-[9px] text-slate-400">{d.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Bet Adjuster */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-slate-400">SELECT BET AMOUNT</span>
              <div className="flex items-center justify-between w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2">
                <button
                  type="button"
                  onClick={() => setBetAmount((b) => Math.max(10000, b - 50000))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white active:scale-95"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black text-amber-300">{(betAmount / 1000).toFixed(0)}K</span>
                  <span>🪙</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBetAmount((b) => b + 50000)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Coin Power-ups (Roll 2, Undo, Hi-Lo) */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="flex flex-col items-center rounded-xl border border-amber-500/25 bg-black/30 p-2 text-center">
                <span className="text-xs font-bold text-amber-400">🎲 ROLL 2</span>
                <span className="text-[9px] text-amber-200/70">🪙 {POWER_COSTS.roll2}</span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-amber-500/25 bg-black/30 p-2 text-center">
                <span className="text-xs font-bold text-amber-400">🔄 UNDO</span>
                <span className="text-[9px] text-amber-200/70">🪙 {POWER_COSTS.undo}</span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-cyan-500/25 bg-black/30 p-2 text-center">
                <span className="text-xs font-bold text-cyan-400">⚡ HI-LO</span>
                <span className="text-[9px] text-cyan-200/70">🪙 {POWER_COSTS.hilo}</span>
              </div>
            </div>
          </div>

          {/* Start Match CTA */}
          <button
            type="button"
            onClick={() => onStartMatch({ mode: gameMode, matchType, players: playerCount, bet: betAmount, aiLevel })}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 py-4 text-sm font-black tracking-widest text-white shadow-lg active:scale-95"
          >
            START MATCH · COUPLE'S ⭐ LUDO
          </button>
        </div>
      )}

      {/* Bottom Navigation Hub Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/10 bg-slate-900/90 py-2.5 backdrop-blur-xl">
        {[
          { id: "social", label: "SOCIAL", icon: "👥" },
          { id: "shop", label: "SHOP", icon: "🛒" },
          { id: "home", label: "HOME", icon: "🏠" },
          { id: "chest", label: "CHEST", icon: "📦" },
          { id: "assets", label: "ASSETS", icon: "💎" },
          { id: "events", label: "EVENTS", icon: "📅" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.id === "home") setActiveTab("home");
            }}
            className={`flex flex-col items-center gap-1 transition active:scale-95 ${
              tab.id === "home" ? "text-amber-400 scale-105" : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[9px] font-black tracking-wider">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}