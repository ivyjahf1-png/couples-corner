"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Sparkles, Undo2, Dice5, TrendingUp, Coins, ArrowLeft, RefreshCw } from "lucide-react";
import type { LudoMatchConfig } from "../LudoHub";
import { POWER_COSTS } from "../LudoHub";

const COLORS = ["#EF4444", "#10B981", "#F59E0B", "#3B82F6"]; // Red, Green, Yellow, Blue

const SEATS = [
  { name: "YOU (David)", flag: "🇬🇧", avatar: "👨‍💻", level: 27 },
  { name: "Tunde", flag: "🇳🇬", avatar: "🧔", level: 24 },
  { name: "Bella", flag: "🇰🇪", avatar: "👩", level: 22 },
  { name: "Aisha", flag: "🇳🇬", avatar: "👧", level: 26 },
];

// ── 5D Spatial Audio & Haptic Synthesizer ───────────────────────────
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
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  public playSensoryVictory() {
    if (this.isMuted || !this.ctx) return;
    const chords = [523.25, 659.25, 783.99, 1046.5];
    chords.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + idx * 0.08 + 0.6);
    });
  }

  public playSkyrocketWarp() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(1600, t + 0.15);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch { /* ignore */ }
  }

  public playSensoryDefeat() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }
}

const sensoryEngine = new Sensory4DEngine();

const ARROW_JUMPS: Record<number, number> = {
  15: 33, 33: 42, 42: 47, 10: 22, 38: 48, 47: 57,
};

export function LudoEngine({
  config,
  onWin,
  onLose,
}: {
  config: LudoMatchConfig;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const seats = config.players === 2 ? 2 : 4;
  const humanSeat = 0;

  const [pos, setPos] = useState<number[]>(() => Array(seats).fill(0));
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState(6);
  const [msg, setMsg] = useState("Couple's ⭐ Ludo Matrix Active. Tap your gate to roll.");
  const [started, setStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [rechargeModal, setRechargeModal] = useState(false);

  // ── Coin economy & tactical power-ups ──
  const [coins, setCoins] = useState(config.bet);
  const [bonusCoins, setBonusCoins] = useState(0);
  const [captureStreak, setCaptureStreak] = useState(0);
  const [doubleRoll, setDoubleRoll] = useState(false);
  const [hiloPending, setHiloPending] = useState<"high" | "low" | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<number[] | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);

  const aiLevel = config.aiLevel;
  const isHumanTurn = turn === humanSeat;
  const aiSeats = config.matchType === "cpu" ? [1, 2, 3].slice(0, seats - 1) : [];
  const isAiSeat = (s: number) => aiSeats.includes(s);

  // Render 15x15 Real-Life Ludo Board Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cell = size / 15;

    ctx.clearRect(0, 0, size, size);

    // 1. Draw 4 Home Base Quadrants
    ctx.fillStyle = COLORS[0]; ctx.fillRect(0, 0, cell * 6, cell * 6); // Red
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cell, cell, cell * 4, cell * 4);

    ctx.fillStyle = COLORS[1]; ctx.fillRect(cell * 9, 0, cell * 6, cell * 6); // Green
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cell * 10, cell, cell * 4, cell * 4);

    ctx.fillStyle = COLORS[2]; ctx.fillRect(cell * 9, cell * 9, cell * 6, cell * 6); // Yellow
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cell * 10, cell * 10, cell * 4, cell * 4);

    ctx.fillStyle = COLORS[3]; ctx.fillRect(0, cell * 9, cell * 6, cell * 6); // Blue
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cell, cell * 10, cell * 4, cell * 4);

    // 2. Draw Center Finish Matrix Triangles
    ctx.fillStyle = COLORS[0];
    ctx.beginPath(); ctx.moveTo(cell * 6, cell * 6); ctx.lineTo(cell * 7.5, cell * 7.5); ctx.lineTo(cell * 6, cell * 9); ctx.fill();
    ctx.fillStyle = COLORS[1];
    ctx.beginPath(); ctx.moveTo(cell * 6, cell * 6); ctx.lineTo(cell * 7.5, cell * 7.5); ctx.lineTo(cell * 9, cell * 6); ctx.fill();
    ctx.fillStyle = COLORS[2];
    ctx.beginPath(); ctx.moveTo(cell * 9, cell * 6); ctx.lineTo(cell * 7.5, cell * 7.5); ctx.lineTo(cell * 9, cell * 9); ctx.fill();
    ctx.fillStyle = COLORS[3];
    ctx.beginPath(); ctx.moveTo(cell * 6, cell * 9); ctx.lineTo(cell * 7.5, cell * 7.5); ctx.lineTo(cell * 9, cell * 9); ctx.fill();

    // 3. Draw Track Grid & Safe Paths
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.2;
    for (let i = 0; i <= 15; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke();
    }

    for (let i = 1; i < 6; i++) {
      ctx.fillStyle = COLORS[0]; ctx.fillRect(i * cell, cell * 7, cell, cell);
      ctx.fillStyle = COLORS[1]; ctx.fillRect(cell * 7, i * cell, cell, cell);
      ctx.fillStyle = COLORS[2]; ctx.fillRect((14 - i) * cell, cell * 7, cell, cell);
      ctx.fillStyle = COLORS[3]; ctx.fillRect(cell * 7, (14 - i) * cell, cell, cell);
    }

    // 4. Draw Player Pawn Seeds
    const seedCoords = [
      { x: cell * 2.5, y: cell * 2.5, color: COLORS[0] },
      { x: cell * 11.5, y: cell * 2.5, color: COLORS[1] },
      { x: cell * 11.5, y: cell * 11.5, color: COLORS[2] },
      { x: cell * 2.5, y: cell * 11.5, color: COLORS[3] },
    ];

    pos.forEach((p, idx) => {
      if (idx < seats) {
        const coord = seedCoords[idx]!;
        ctx.fillStyle = coord.color;
        ctx.beginPath();
        ctx.arc(coord.x, coord.y, cell * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });
  }, [pos, seats]);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sensoryEngine.toggleMute(next);
  };

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

  function doRoll(seat: number, opts?: { boosted?: boolean; double?: boolean; hilo?: "high" | "low" | null }) {
    if (isRolling || winner !== null) return;
    if (!started) { setStarted(true); onLose(config.bet); }
    setIsRolling(true);
    sensoryEngine.playSensoryDiceRoll();
    if (window.navigator?.vibrate) window.navigator.vibrate([40, 20, 40, 20, 60]);

    const boosted = opts?.boosted ?? false;
    const useDouble = opts?.double ?? false;
    const hilo = opts?.hilo ?? null;

    setTimeout(() => {
      setIsRolling(false);
      let roll = 1 + Math.floor(Math.random() * 6);
      if (boosted && roll < 5) roll = 5 + Math.floor(Math.random() * 2);
      let move = roll;
      if (useDouble) { const extra = 1 + Math.floor(Math.random() * 6); move = roll + extra; setDoubleRoll(false); }
      setDice(roll);

      if (hilo) {
        const high = roll >= 4;
        const correct = (hilo === "high") === high;
        if (correct) { setBonusCoins((b) => b + 1200); setMsg(`HI-LO WIN! Rolled ${roll} (${high ? "HIGH" : "LOW"}). +1200 coins 🎯`); }
        else { setMsg(`HI-LO miss. Rolled ${roll} (${high ? "HIGH" : "LOW"}). No bonus.`); }
        setHiloPending(null);
      }

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
          onWin(500 + bonusCoins);
          setMsg(`COUPLE'S ⭐ VICTORY! Reached home. +${500 + bonusCoins} coins 🏆`);
        } else {
          sensoryEngine.playSensoryDefeat();
          onLose(100);
          setMsg(`${SEATS[seat]!.name} warped home first.`);
        }
        return;
      }

      const base = r.jumped
        ? `${SEATS[seat]!.name} rolled ${move} → SKYFLARE warp!`
        : `${SEATS[seat]!.name} rolled ${move}.`;
      if (!hilo) setMsg(base + comboMsg);

      if (roll === 6) { setMsg(`${hilo ? "" : base + comboMsg} Rolled a 6 — extra turn!`); return; }
      setTurn((t) => (t + 1) % seats);
    }, 500);
  }

  function buyRoll2() {
    if (isRolling || winner !== null || !isHumanTurn) return;
    if (coins < POWER_COSTS.roll2) { setRechargeModal(true); return; }
    setCoins((c) => c - POWER_COSTS.roll2);
    setDoubleRoll(true);
    setMsg("ROLL 2 armed — your next roll moves double dice!");
  }

  function buyHilo(pick: "high" | "low") {
    if (isRolling || winner !== null || !isHumanTurn) return;
    if (coins < POWER_COSTS.hilo) { setRechargeModal(true); return; }
    setCoins((c) => c - POWER_COSTS.hilo);
    setHiloPending(pick);
    setMsg(`HI-LO locked: guessing ${pick.toUpperCase()}. Roll to settle!`);
  }

  function buyUndo() {
    if (!canUndo || lastSnapshot === null || isRolling || winner !== null) return;
    if (coins < POWER_COSTS.undo) { setRechargeModal(true); return; }
    setCoins((c) => c - POWER_COSTS.undo);
    setPos(lastSnapshot);
    setCanUndo(false);
    setLastSnapshot(null);
    setMsg("UNDO — pawn restored to previous tile.");
  }

  useEffect(() => {
    if (winner !== null || isRolling) return;
    if (!isAiSeat(turn)) return;
    const t = window.setTimeout(() => {
      const boostChance = aiLevel === "hard" ? 0.7 : aiLevel === "mid" ? 0.4 : 0.12;
      const boosted = Math.random() < boostChance;
      doRoll(turn, { boosted });
    }, aiLevel === "hard" ? 550 : aiLevel === "mid" ? 800 : 1100);
    return () => window.clearTimeout(t);
  }, [turn, winner, isRolling, aiLevel]);

  return (
    <div className="fixed inset-0 z-40 flex h-[100dvh] w-screen flex-col justify-between bg-[#0F172A] p-3 text-white select-none overflow-hidden">
      {/* Header Bar */}
      <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/90 p-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <span className="text-xs font-black tracking-widest text-amber-300">COUPLE'S ⭐ LUDO</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-black/40 px-3 py-1">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-black text-amber-300">{coins.toLocaleString()}</span>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="my-1 rounded-xl border border-amber-500/20 bg-amber-950/30 p-2 text-center text-xs font-bold text-amber-200">
        {msg}
      </div>

      {/* 15x15 Real-Life Ludo Board Canvas */}
      <div className="relative flex flex-col items-center justify-center w-full my-auto">
        <div className="relative aspect-square w-full max-w-[360px] rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl">
          <canvas ref={canvasRef} width={360} height={360} className="h-full w-full" />
        </div>
      </div>

      {/* In-Gate Base Rolling Dice Container */}
      <div className="flex w-full items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => doRoll(humanSeat, { double: doubleRoll, hilo: hiloPending })}
          disabled={isRolling || winner !== null || !isHumanTurn}
          className="flex flex-1 items-center justify-center gap-3 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 py-3.5 shadow-lg active:scale-95 disabled:opacity-50"
        >
          <span className="text-xl font-black text-white">{isRolling ? "🎲..." : `DICE: ${dice}`}</span>
          <span className="text-xs font-black tracking-widest text-amber-100">
            {isRolling ? "ROLLING..." : {notisHumanTurn ? `${SEATS[turn]!.name}...` : "TAP TO ROLL"}
          </span>
        </button>
      </div>

      {/* Tactical Coin Power-Ups */}
      <div className="mt-2 grid grid-cols-3 gap-2 pb-2">
        <button
          type="button"
          onClick={buyRoll2}
          disabled={isRolling || winner !== null || !isHumanTurn}
          className={`flex flex-col items-center gap-0.5 rounded-2xl border p-2 ${
            doubleRoll ? "border-amber-400 bg-amber-500/20 text-amber-300" : "border-white/10 bg-slate-900/60 text-slate-300"
          }`}
        >
          <div className="flex items-center gap-1">
            <Dice5 className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] font-black uppercase">Roll 2</span>
          </div>
          <span className="text-[9px] text-slate-400">{POWER_COSTS.roll2} coins</span>
        </button>

        <button
          type="button"
          onClick={() => buyHilo("high")}
          disabled={isRolling || winner !== null || !isHumanTurn}
          className="flex flex-col items-center gap-0.5 rounded-2xl border border-white/10 bg-slate-900/60 p-2 text-slate-300"
        >
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase">Hi-Lo</span>
          </div>
          <span className="text-[9px] text-slate-400">{POWER_COSTS.hilo} coins</span>
        </button>

        <button
          type="button"
          onClick={buyUndo}
          disabled={!canUndo || isRolling || winner !== null}
          className={`flex flex-col items-center gap-0.5 rounded-2xl border p-2 ${
            canUndo ? "border-cyan-400 bg-cyan-500/20 text-cyan-300" : "border-white/10 bg-slate-900/60 text-slate-300 opacity-50"
          }`}
        >
          <div className="flex items-center gap-1">
            <Undo2 className="h-4 w-4 text-cyan-400" />
            <span className="text-[10px] font-black uppercase">Undo</span>
          </div>
          <span className="text-[9px] text-slate-400">{POWER_COSTS.undo} coins</span>
        </button>
      </div>

      {/* Recharge Modal */}
      {rechargeModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="flex w-full max-w-xs flex-col items-center rounded-3xl border border-amber-500/40 bg-slate-950 p-6 text-center shadow-2xl">
            <Coins className="h-12 w-12 text-amber-400 animate-bounce" />
            <h3 className="mt-3 text-base font-black text-white">INSUFFICIENT COINS</h3>
            <p className="mt-1 text-xs text-slate-400">Claim free bonus coins to activate this power-up.</p>
            <button
              type="button"
              onClick={() => {
                setCoins((c) => c + 2000);
                setRechargeModal(false);
                setMsg("Claimed +2,000 Bonus Coins! 🎯");
              }}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-xs font-black text-white"
            >
              CLAIM +2,000 FREE COINS
            </button>
          </div>
        </div>
      )}

      {/* Victory / Defeat Modal */}
      {winner !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-lg">
          <div className="flex w-full max-w-xs flex-col items-center rounded-3xl border-2 border-amber-400 bg-slate-950 p-6 text-center shadow-2xl">
            <span className="text-5xl">{winner === humanSeat ? "🏆" : "💀"}</span>
            <h2 className="mt-4 text-2xl font-black text-white">{winner === humanSeat ? "VICTORY!" : "DEFEAT"}</h2>
            <button
              type="button"
              onClick={() => {
                setWinner(null);
                setPos(Array(seats).fill(0));
                setTurn(0);
              }}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-xs font-black text-white"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}