"use client";
import { useState } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";

const COLORS = ["#FF1744", "#2979FF", "#00E676", "#FFEA00"];
const PLAYER_NAMES = ["YOU (David)", "CPU Tunde", "CPU Bella", "CPU Aisha"];

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

// 4D/5D Arrow jump mappings: landing on these tiles cats the pawn forward
// and triggers playSkyrocketWarp (4D spatial warp sound).
const ARROW_JUMPS: Record<number, number> = {
  15: 33, 33: 42,  42: 47,  10: 22,  38: 48,  47: 57,  // arrow tile jumps
};

export function LudoEngine({ onWin, onLose }: { onWin: (n: number) => void; onLose: (n: number) => void }) {
  const [pos, setPos] = useState([0, 0, 0, 0]);
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState(6);
  const [msg, setMsg] = useState("4D Sensory Matrix Active. Tap to roll.");
  const [started, setStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRolling, setIsRolling] = useState(false);  // 4D/5D rolling state
  const [rechargeModal, setRechargeModal] = useState(false);  // recharge prompt
  const [comboCharges, setComboCharges] = useState(3); // 3/3
  const [comboActive, setComboActive] = useState(false);
  const [particlePulse, setParticlePulse] = useState(false);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sensoryEngine.toggleMute(next);
  };

  function rollDice() {
    if (!started) {
      onLose(50);
      setStarted(true);
    }

    if (window.navigator?.vibrate) {
      window.navigator.vibrate([40, 20, 40, 20, 60]);
    }

    sensoryEngine.playSensoryDiceRoll();
    setIsRolling(true);
    setParticlePulse(true);

    setTimeout(() => {
      setIsRolling(false);
      setParticlePulse(false);

      const d = 1 + Math.floor(Math.random() * 6);
      setDice(d);
      const me = 0;
      const active = turn === me;
      const nextPos = [...pos];

      if (active) {
        nextPos[me] = Math.min(57, nextPos[me] + d);
        setPos(nextPos);
        if (nextPos[me] >= 57) {
          sensoryEngine.playSensoryVictory();
          if (window.navigator?.vibrate) window.navigator.vibrate([150, 80, 150, 80, 300]);
          onWin(500);
          setMsg("4D Resonance Achieved: Victory! +500 Coins 🏆");
          return;
        }
      } else {
        nextPos[turn] = Math.min(57, nextPos[turn] + d);
        setPos(nextPos);
        if (nextPos[turn] >= 57) {
          sensoryEngine.playSensoryDefeat();
          onLose(100);
          setMsg(`CPU ${PLAYER_NAMES[turn]} achieved victory. Defeat.`);
          return;
        }
      }

      const nextTurn = (turn + 1) % 4;

      // ── 4D ARROW TELEPORTATION: landing on arrow tile cats pawn forward ──
      let jumped = false;
      for (const [tile, jumpTo] of Object.entries(ARROW_JUMPS)) {
        if (nextPos[me] === Number(tile)) {
          sensoryEngine.playSkyrocketWarp();
          nextPos[me] = Math.min(57, jumpTo);
          if (window.navigator?.vibrate) window.navigator.vibrate([120, 40, 120, 40, 160]);
          jumped = true;
          setMsg(`4D SKYFLARE CATAPULT! ${PLAYER_NAMES[me]} warped from ${tile} → ${jumpTo}.`);
          break;
        }
      }
      if (jumped && nextPos[me] >= 57) {
        sensoryEngine.playSensoryVictory();
        if (window.navigator?.vibrate) window.navigator.vibrate([180, 80, 180, 80, 320]);
        onWin(500);
        setMsg(`4D RESONANCE ACHIEVED: SKYFLARE VICTORY! +500 Coins. +${comboCharges} Combo charge(s)!`);
        setComboCharges(3);
        return;
      }
      if (jumped && nextPos[me] > 0) { setComboCharges(c => Math.max(0, c - 1)); }

      if (nextPos[me] >= 57) {
        sensoryEngine.playSensoryVictory();
        if (window.navigator?.vibrate) window.navigator.vibrate([150, 80, 150, 80, 300]);
        onWin(500);
        setMsg(`4D RESONANCE ACHIEVED: Victory! +500 Coins.`);
        setComboCharges(3);
        return;
      }
    }, 450);
  }

  // ── 4D/5D TACTICAL COMBO BOOST ─────────────────────────────────────────
  function useComboBoost() {
    if (isRolling) return;
    if (comboCharges <= 0 && !rechargeModal) {
      // Combo depleted: prompt to buy coins/gems to recharge the 4D booster
      setRechargeModal(true);
      return;
    }
    setComboActive(true);

    // Guarantee a high roll: 5 or 6 with haptic spike
    const hapticPulse = [40, 30, 40, 30, 60, 30];
    if (window.navigator?.vibrate) window.navigator.vibrate(hapticPulse);

    setTimeout(() => {
      setComboActive(false);
      const roll = comboCharges > 0 ? (Math.random() < 0.66 ? 5 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 6) + 1) : dice;
      setDice(roll);
      sensoryEngine.playSensoryDiceRoll();

      const me = 0;
      const active = turn === me;
      const nextPos = [...pos];
      const dist = Math.min(57, nextPos[me] + roll);
      nextPos[me] = dist;

      // Arrow warp bonus if it lands on an arrow tile
      let jumped = false;
      let jumpedTile = 0;
      let jumpedTo = 0;
      for (const [tile, jumpTo] of Object.entries(ARROW_JUMPS)) {
        if (nextPos[me] === Number(tile)) {
          sensoryEngine.playSkyrocketWarp();
          nextPos[me] = Math.min(57, jumpTo);
          if (window.navigator?.vibrate) window.navigator.vibrate([120, 40, 120, 40, 160]);
          jumped = true;
          break;
        }
      }

      setPos(nextPos);
      if (jumped) {
        setComboCharges(c => Math.max(0, c - 1));
        setMsg(`4D SKYFLARE CATAPULT! Combo Boost +${roll}! Pawn warped from ${jumpedTile} → ${jumpedTo}!`);
      } else if (dist >= 57) {
        sensoryEngine.playSensoryVictory();
        if (window.navigator?.vibrate) window.navigator.vibrate([180, 80, 180, 80, 320]);
        onWin(500);
        setMsg(`4D RESONANCE ACHIEVED: Victory! +500 Coins.`);
        setComboCharges(3);
      } else {
        setMsg(`Tactical Combo Boost: rolled ${roll} (combo ${comboCharges - (jumped ? 1 : 0)}).`);
        setComboCharges(c => Math.max(0, c - 1));
        const nt = (turn + 1) % 4;
        setTurn(nt);
      }
    }, 450);
  }

  // ── 4D/5D COMBO RECHARGE MODAL ─────────────────────────────────────────
  const closeRecharge = () => setRechargeModal(false);

  return (
    <div className={`relative overflow-hidden rounded-3xl border-2 border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-2xl transition-all duration-500 ${particlePulse ? "ring-4 ring-cyan-400/50 shadow-cyan-500/30" : ""}`}>
      
      <div className="mb-5 flex items-center justify-between border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
          <span className="text-xs font-black tracking-[0.2em] text-cyan-300">4D/5D SENSORY MATRIX LUDO</span>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 transition hover:bg-cyan-900/60 active:scale-95"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {pos.map((s, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
              turn === i 
                ? "border-cyan-400 bg-gradient-to-br from-cyan-950/50 to-slate-900/80 shadow-[0_0_20px_rgba(6,182,212,0.2)] scale-[1.02]" 
                : "border-white/10 bg-white/5 opacity-80"
            }`}
            style={{ borderLeft: `6px solid ${COLORS[i]}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wide text-white">{PLAYER_NAMES[i]}</span>
              {turn === i && <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_10px_#22d3ee]" />}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black italic tracking-tight text-white">
                {s}<span className="text-xs font-normal text-slate-400">/57</span>
              </span>
              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-900 border border-white/10">
                <div 
                  className="h-full rounded-full transition-all duration-500 shadow-md" 
                  style={{ width: `${(s / 57) * 100}%`, backgroundColor: COLORS[i] }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="my-6 flex flex-col items-center justify-center gap-4">
        <div className={`relative flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-cyan-400/60 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-5xl font-black text-cyan-100 shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all duration-300 ${isRolling ? "rotate-[360deg] scale-90 opacity-40 blur-[1px]" : "scale-100 rotate-0"}`}>
          <div className="absolute inset-0 rounded-3xl bg-cyan-500/10 animate-pulse" />
          <span className="relative z-10">{dice}</span>
        </div>

        <button
          type="button"
          onClick={rollDice}
          disabled={isRolling}
          className="w-full max-w-sm rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 py-4 text-sm font-black tracking-[0.155em] text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all duration-300 active:scale-95 disabled:opacity-50"
        >
          {isRolling ? "PROCESSING 4D MATRIX..." : "ENGAGE 4D SENSORY ROLL"}
        </button>
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/30 px-4 py-3 text-center text-xs font-bold text-cyan-200 backdrop-blur-md shadow-inner">
        {msg}
      </div>

      {/* ── 4D Tactical Combo Boost ──────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={useComboBoost}
          disabled={isRolling || comboActive}
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-black tracking-[0.12em] text-white shadow-lg transition-all duration-300 active:scale-95 ${
            comboActive
              ? "bg-gradient-to-r from-amber-500 to-orange-600 shadow-orange-500/50 animate-pulse"
              : "bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:shadow-orange-500/40 hover:scale-[1.02]"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Sparkles className="h-4 w-4" />
          {comboActive ? "CHARGING 4D BOOST..." : "TACTICAL COMBO BOOST"}
          <span className="text-xs opacity-80">({comboCharges}/3)</span>
        </button>
        <button
          type="button"
          onClick={rollDice}
          disabled={isRolling}
          className="w-full max-w-sm rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 py-4 text-sm font-black tracking-[0.155em] text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all duration-300 active:scale-95 disabled:opacity-50"
        >
          {isRolling ? "PROCESSING 4D MATRIX..." : "ENGAGE 4D SENSORY ROLL"}
        </button>
      </div>

      {/* ── 4D/5D COMBO RECHARGE MODAL ───────────────────────────────────── */}
      {rechargeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={closeRecharge}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl border border-amber-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-8 text-center shadow-[0_0_60px_rgba(251,146,60,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
              <Sparkles className="h-7 w-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-black text-amber-200">4D COMBO REBOOT NEEDED</h3>
            <p className="mt-2 text-sm text-slate-300">Your tactical boost capacitor is empty. Buy coins or gem shards to recharge the 4D/5D booster and keep catapulting.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => { /* placeholder for coin UI */ setRechargeModal(false); }}
                className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 font-black text-white shadow-lg hover:scale-105 transition"
              >
                Buy 500 Coins
              </button>
              <button
                type="button"
                onClick={() => { /* placeholder for gem UI */ setRechargeModal(false); }}
                className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 font-black text-white shadow-lg hover:scale-105 transition"
              >
                Use Gems
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}