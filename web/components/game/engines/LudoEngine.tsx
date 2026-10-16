"use client";
import { useEffect, useState } from "react";
import { Volume2, VolumeX, Sparkles, Undo2, Dice5, TrendingUp, Coins } from "lucide-react";
import type { LudoMatchConfig } from "../LudoHub";
import { POWER_COSTS } from "../LudoHub";

const COLORS = ["#FF1744", "#2979FF", "#00E676", "#FFEA00"];

/** Per-seat identity shown on each base gate: avatar, country flag, level. */
const SEATS = [
  { name: "YOU (David)", flag: "🇬🇧", avatar: "🧑", level: 27 },
  { name: "Tunde", flag: "🇳🇬", avatar: "🧔", level: 24 },
  { name: "Bella", flag: "🇰🇪", avatar: "👩", level: 22 },
  { name: "Aisha", flag: "🇳🇬", avatar: "👧", level: 26 },
];

// ── 4D/5D Sensory Simulation & Audio Engine ───────────────────────
class Sensory4DEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  public toggleMute(muted: boolean) {
    this.isMuted = muted;
  }

  public playSensoryDiceRoll() {
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.5);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  public playSensoryVictory() {
    if (this.isMuted || !this.ctx) return;
    const chords = [440, 554.37, 659.25, 880];
    chords.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.1 + 0.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.1);
      osc.stop(this.ctx.currentTime + idx * 0.1 + 0.8);
    });
  }

  public playSkyrocketWarp() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
      const noise = this.ctx.createBufferSource();
      const nBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < nBuf.length; i++) nData[i] = Math.random() * 2 - 1;
      noise.buffer = nBuf;
      const nf = this.ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.setValueAtTime(2200, t);
      nf.Q.setValueAtTime(2, t);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.18, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.1);
    } catch { /* ignore */ }
  }

  public playSensoryDefeat() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.7);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.7);
  }
}

const sensoryEngine = new Sensory4DEngine();

// 4D/5D Arrow jump mappings: landing on these tiles catapults the pawn forward
// and triggers playSkyrocketWarp (4D spatial warp sound).
const ARROW_JUMPS: Record<number, number> = {
  15: 33, 33: 42, 42: 47, 10: 22, 38: 48, 47: 57,
};

// AI move scoring: weigh advancement, capture potential, and safety.
function scoreMove(from: number, roll: number, aiLevel: LudoMatchConfig["aiLevel"], opp: number[]) {
  const target = Math.min(57, from + roll);
  let s = target; // prefer advancing
  // Capture bonus: would we land on an opponent?
  for (const o of opp) {
    if (o > 0 && o === target) s += aiLevel === "hard" ? 60 : aiLevel === "mid" ? 35 : 12;
  }
  // Arrow teleport bonus: does this hit a warp tile?
  if (ARROW_JUMPS[target] != null) s += aiLevel === "easy" ? 8 : 28;
  // Avoid ending on 0 (safe) only for smart AI.
  if (aiLevel !== "easy" && target === 57) s += 40; // go for the win
  return s;
}

export function LudoEngine({
  config,
  onWin,
  onLose,
}: {
  config: LudoMatchConfig;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const seats = config.players === 2 ? 2 : 4;
  const humanSeat = 0;

  const [pos, setPos] = useState<number[]>(() => Array(seats).fill(0));
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState(6);
  const [msg, setMsg] = useState("4D Sensory Matrix Active. Tap your gate to roll.");
  const [started, setStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [rechargeModal, setRechargeModal] = useState(false);
  const [particlePulse, setParticlePulse] = useState(false);

  // ── Coin economy & tactical power-ups ──
  const [coins, setCoins] = useState(config.bet);
  const [bonusCoins, setBonusCoins] = useState(0);
  const [captureStreak, setCaptureStreak] = useState(0);
  const [comboReady, setComboReady] = useState(false);
  const [doubleRoll, setDoubleRoll] = useState(false);
  const [hiloPick, setHiloPick] = useState<"high" | "low" | null>(null);
  const [hiloPending, setHiloPending] = useState<"high" | "low" | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<number[] | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const aiLevel = config.aiLevel;
  const isHumanTurn = turn === humanSeat;

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sensoryEngine.toggleMute(next);
  };

  const [winner, setWinner] = useState<number | null>(null);

  const aiSeats = config.matchType === "cpu" ? [1, 2, 3].slice(0, seats - 1) : [];
  const isAiSeat = (s: number) => aiSeats.includes(s);

  // Resolve a move: advance, follow arrow warps, and capture opponents on landing.
  function resolveMove(cur: number[], seat: number, roll: number) {
    const start = cur[seat]!;
    const target = Math.min(57, start + roll);
    const next = [...cur];
    next[seat] = target;
    let jumped = false;
    let jumpedTo = 0;
    if (target < 57 && ARROW_JUMPS[target] != null) {
      jumpedTo = ARROW_JUMPS[target]!;
      next[seat] = Math.min(57, jumpedTo);
      jumped = true;
    }
    let captured = 0;
    const land = next[seat]!;
    if (land > 0 && land < 57) {
      for (let o = 0; o < seats; o++) {
        if (o === seat) continue;
        if (next[o] === land) { next[o] = 0; captured++; }
      }
    }
    return { next, land, jumped, jumpedTo, captured, home: land >= 57 };
  }

  // Core roll for a seat. `boosted` biases high (tactical combo / AI power use).
  function doRoll(seat: number, opts?: { boosted?: boolean; double?: boolean; hilo?: "high" | "low" | null }) {
    if (isRolling || winner !== null) return;
    if (!started) { setStarted(true); onLose(config.bet); }
    setIsRolling(true);
    setParticlePulse(true);
    sensoryEngine.playSensoryDiceRoll();
    if (window.navigator?.vibrate) window.navigator?.vibrate([40, 20, 40, 20, 60]);

    const boosted = opts?.boosted ?? false;
    const useDouble = opts?.double ?? false;
    const hilo = opts?.hilo ?? null;

    setTimeout(() => {
      setIsRolling(false);
      setParticlePulse(false);

      let roll = 1 + Math.floor(Math.random() * 6);
      if (boosted && roll < 5) roll = 5 + Math.floor(Math.random() * 2);
      let move = roll;
      if (useDouble) { const extra = 1 + Math.floor(Math.random() * 6); move = roll + extra; setDoubleRoll(false); }
      setDice(roll);

      // Hi-Lo wager resolution
      if (hilo) {
        const high = roll >= 4;
        const correct = (hilo === "high") === high;
        if (correct) { setBonusCoins((b) => b + 1200); setMsg(`HI-LO WIN! Rolled ${roll} (${high ? "HIGH" : "LOW"}). +1200 combo coins 🎯`); }
        else { setMsg(`HI-LO miss. Rolled ${roll} (${high ? "HIGH" : "LOW"}). No bonus.`); }
        setHiloPending(null);
      }

      // Undo snapshot (human only, before move applied)
      if (seat === humanSeat) { setLastSnapshot([...pos]); setCanUndo(true); }

      const r = resolveMove(pos, seat, move);
      setPos(r.next);

      let comboMsg = "";
      if (r.captured > 0 && seat === humanSeat) {
        const streak = captureStreak + r.captured;
        setCaptureStreak(streak);
        const capCoins = 150 * r.captured;
        setBonusCoins((b) => b + capCoins);
        comboMsg = ` · ${r.captured} CAPTURE! +${capCoins} coins`;
        if (streak % 3 === 0) {
          setBonusCoins((b) => b + 500);
          sensoryEngine.playSensoryVictory();
          comboMsg += " · TACTICAL COMBO ×3! +500 🎉";
        }
      }

      if (r.jumped) sensoryEngine.playSkyrocketWarp();

      if (r.home) {
        setWinner(seat);
        if (seat === humanSeat) {
          sensoryEngine.playSensoryVictory();
          if (window.navigator?.vibrate) window.navigator?.vibrate([150, 80, 150, 80, 300]);
          onWin(500 + bonusCoins);
          setMsg(`4D RESONANCE! You reached home. +${500 + bonusCoins} coins 🏆`);
        } else {
          sensoryEngine.playSensoryDefeat();
          onLose(100);
          setMsg(`${SEATS[seat]!.name} warped home first. Defeat.`);
        }
        return;
      }

      const base = r.jumped
        ? `${SEATS[seat]!.name} rolled ${move} → SKYFLARE warp ${r.land - (r.jumpedTo - r.land)}→${r.jumpedTo}.`
        : `${SEATS[seat]!.name} rolled ${move}.`;
      if (!hilo) setMsg(base + comboMsg);

      // Extra turn on a six (classic Ludo rule).
      if (roll === 6) { setMsg((hilo ? "" : base + comboMsg) + " Rolled a 6 — extra turn!"); return; }
      setTurn((t) => (t + 1) % seats);
    }, 500);
  }

  // ── Power-up: Roll 2 (double dice move) ──
  function buyRoll2() {
    if (isRolling || winner !== null || !isHumanTurn) return;
    if (coins < POWER_COSTS.roll2) { setRechargeModal(true); return; }
    setCoins((c) => c - POWER_COSTS.roll2);
    setDoubleRoll(true);
    setMsg("ROLL 2 armed — your next roll moves double dice!");
  }

  // ── Power-up: Hi-Lo (predict high/low for bonus coins) ──
  function buyHilo(pick: "high" | "low") {
    if (isRolling || winner !== null || !isHumanTurn) return;
    if (coins < POWER_COSTS.hilo) { setRechargeModal(true); return; }
    setCoins((c) => c - POWER_COSTS.hilo);
    setHiloPending(pick);
    setMsg(`HI-LO locked: guessing ${pick.toUpperCase()}. Roll to settle!`);
  }

  // ── Power-up: Undo (revert last human move) ──
  function buyUndo() {
    if (!canUndo || lastSnapshot === null || isRolling || winner !== null) return;
    if (coins < POWER_COSTS.undo) { setRechargeModal(true); return; }
    setCoins((c) => c - POWER_COSTS.undo);
    setPos(lastSnapshot);
    setCanUndo(false);
    setLastSnapshot(null);
    setMsg("UNDO — pawn restored to its previous tile.");
  }

  // ── AI turns: auto-roll with difficulty-tuned behaviour ──
  useEffect(() => {
    if (winner !== null || isRolling) return;
    if (!isAiSeat(turn)) return;
    const t = window.setTimeout(() => {
      const boostChance = aiLevel === "hard" ? 0.7 : aiLevel === "mid" ? 0.4 : 0.12;
      const boosted = Math.random() < boostChance;
      doRoll(turn, { boosted });
    }, aiLevel === "hard" ? 550 : aiLevel === "mid" ? 800 : 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, winner, isRolling, aiLevel]);


  return (
    <div className={`relative overflow-hidden rounded-3xl border-2 border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-2xl transition-all duration-500 ${particlePulse ? "ring-4 ring-cyan-400/50 shadow-cyan-500/30" : ""}`}>
      {/* ── Header: mode + coin ledger + sound ── */}
      <div className="mb-5 flex items-center justify-between border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-[0.2em] text-cyan-300">4D/5D SENSORY LUDO</span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {config.mode} · {config.matchType === "cpu" ? `vs CPU (${aiLevel})` : config.matchType} · {seats}p
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-black/40 px-2.5 py-1">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-black text-amber-300">{coins.toLocaleString()}</span>
          </div>
          {bonusCoins > 0 && (
            <div className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-black text-cyan-300">
              +{bonusCoins.toLocaleString()}
            </div>
          )}
          <button
            type="button"
            onClick={toggleSound}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 transition hover:bg-cyan-900/60 active:scale-95"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* ── Base Gates: each player's home frame holds Avatar, Flag, Level.
             The ACTIVE player's gate hosts the rolling dice container. ── */}
      <div className="grid grid-cols-2 gap-3.5">
        {pos.map((s, i) => {
          const active = turn === i && winner === null;
          const isMe = i === humanSeat;
          return (
            <div
              key={i}
              onClick={() => { if (active && isMe && !isAiSeat(i)) doRoll(i, { double: doubleRoll, hilo: hiloPending }); }}
              className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${active ? "border-cyan-400 bg-gradient-to-br from-cyan-950/50 to-slate-900/80 shadow-[0_0_20px_rgba(6,182,212,0.2)] scale-[1.02]" : "border-white/10 bg-white/5 opacity-80"} ${active && isMe && !isAiSeat(i) ? "cursor-pointer" : ""}`}
              style={{ borderLeft: `6px solid ${COLORS[i]}` }}
            >
              {/* Avatar · Flag · Level badge */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-slate-800/70 text-2xl shadow-inner">{SEATS[i]!.avatar}</span>
                  <span className="absolute -bottom-1 -right-1 text-sm">{SEATS[i]!.flag}</span>
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-bold tracking-wide text-white">{SEATS[i]!.name}</span>
                  <span className="mt-0.5 inline-block rounded bg-amber-500/20 px-1.5 text-[9px] font-black text-amber-300">Lv {SEATS[i]!.level}</span>
                  {isAiSeat(i) && <span className="ml-1 inline-block rounded bg-cyan-500/20 px-1.5 text-[9px] font-black text-cyan-300">AI</span>}
                </div>
                {active && <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_10px_#22d3ee]" />}
              </div>

              {/* Progress track */}
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black italic tracking-tight text-white">{s}<span className="text-xs font-normal text-slate-400">/57</span></span>
                <div className="h-2 w-16 overflow-hidden rounded-full border border-white/10 bg-slate-900">
                  <div className="h-full rounded-full transition-all duration-500 shadow-md" style={{ width: `${(s / 57) * 100}%`, backgroundColor: COLORS[i] }} />
                </div>
              </div>

              {/* In-gate rolling dice: shown on the ACTIVE player's base gate */}
              {active && (
                <div className={`mt-3 flex items-center justify-center rounded-xl border-2 border-dashed border-cyan-400/50 bg-slate-950/50 py-2 transition-all duration-300 ${isRolling ? "animate-pulse" : ""}`}>
                  <div className={`relative grid h-16 w-16 place-items-center rounded-2xl border-2 border-cyan-400/60 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-3xl font-black text-cyan-100 shadow-[0_0_24px_rgba(6,182,212,0.35)] transition-all duration-500 ${isRolling ? "rotate-[360deg] scale-90 opacity-60" : "scale-100 rotate-0"}`}>
                    <span className="relative z-10">{dice}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>


      {/* ── Status message ── */}
      <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/30 px-4 py-3 text-center text-xs font-bold text-cyan-200 backdrop-blur-md shadow-inner">
        {msg}
      </div>

      {/* ── Roll control (gated to the human seat) ── */}
      <button
        type="button"
        onClick={() => doRoll(humanSeat, { double: doubleRoll, hilo: hiloPending })}
        disabled={isRolling || winner !== null || !isHumanTurn}
        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 py-4 text-sm font-black tracking-[0.155em] text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {winner !== null ? "MATCH OVER" : isRolling ? "PROCESSING 4D MATRIX..." : !isHumanTurn ? `${SEATS[turn]!.name} thinking...` : doubleRoll ? "ROLL 2 (DOUBLE)" : "ENGAGE 4D SENSORY ROLL"}
      </button>

      {/* ── Coin-rechargeable tactical power-ups ── */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={buyRoll2}
          disabled={isRolling || winner !== null || !isHumanTurn}
          className={`flex flex-col items-center gap-0.5 rounded-2xl border px-2 py-2.5 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${doubleRoll ? "border-purple-400 bg-purple-500/20 shadow-purple-500/30" : "border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/50"}`}
        >
          <Dice5 className="h-4 w-4 text-purple-300" />
          <span className="text-[10px] font-black text-purple-200">ROLL 2</span>
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-300"><Coins className="h-3 w-3" />{POWER_COSTS.roll2}</span>
        </button>
        <button
          type="button"
          onClick={buyUndo}
          disabled={!canUndo || isRolling || winner !== null}
          className="flex flex-col items-center gap-0.5 rounded-2xl border border-amber-500/30 bg-amber-950/30 px-2 py-2.5 transition hover:bg-amber-900/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="h-4 w-4 text-amber-300" />
          <span className="text-[10px] font-black text-amber-200">UNDO</span>
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-300"><Coins className="h-3 w-3" />{POWER_COSTS.undo}</span>
        </button>
        <div className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 ${hiloPending ? "border-cyan-400 bg-cyan-500/20" : "border-cyan-500/30 bg-cyan-950/30"}`}>
          <TrendingUp className="h-4 w-4 text-cyan-300" />
          <span className="text-[10px] font-black text-cyan-200">HI-LO</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => buyHilo("high")} disabled={isRolling || winner !== null || !isHumanTurn} className="rounded bg-cyan-800/60 px-1.5 py-0.5 text-[9px] font-black text-white active:scale-95 disabled:opacity-40">HI</button>
            <button type="button" onClick={() => buyHilo("low")} disabled={isRolling || winner !== null || !isHumanTurn} className="rounded bg-cyan-800/60 px-1.5 py-0.5 text-[9px] font-black text-white active:scale-95 disabled:opacity-40">LO</button>
          </div>
        </div>
      </div>

      {/* Capture streak / combo tracker */}
      {captureStreak > 0 && (
        <div className="mt-3 text-center text-[11px] font-black text-amber-300">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />CAPTURE STREAK {captureStreak}/3 — next combo pays +500 🎉
        </div>
      )}

      {/* ── Coin recharge modal (insufficient funds) ── */}
      {rechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={() => setRechargeModal(false)}>
          <div className="relative mx-4 w-full max-w-sm rounded-3xl border border-amber-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-8 text-center shadow-[0_0_60px_rgba(251,146,60,0.3)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
              <Coins className="h-7 w-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-black text-amber-200">NOT ENOUGH COINS</h3>
            <p className="mt-2 text-sm text-slate-300">Recharge your coin balance to keep deploying tactical power-ups in the 4D/5D arena.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" onClick={() => { setCoins((c) => c + 500); setRechargeModal(false); }} className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 font-black text-white shadow-lg hover:scale-105 transition active:scale-95">
                +500 Coins
              </button>
              <button type="button" onClick={() => setRechargeModal(false)} className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 font-black text-white shadow-lg hover:scale-105 transition active:scale-95">
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
