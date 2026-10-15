"use client";
import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Flame, Zap, ShieldAlert, Trophy, RotateCcw } from "lucide-react";
import type { SelectedCar, SelectedTrack } from "@/components/game/racing/RacingHub";

// ── Track surface palettes (asphalt / wet / cyber) ────────────────────
const SURFACE_STYLES: Record<"asphalt" | "wet" | "cyber", { sky: string; road: string; lane: string }> = {
  asphalt: { sky: "#020617", road: "#0f172a", lane: "#06b6d4" },
  wet: { sky: "#050d1a", road: "#0b1e33", lane: "#7dd3fc" },
  cyber: { sky: "#070316", road: "#1a0b3d", lane: "#e879f9" },
};

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(34,211,238,${alpha})`;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

// ── 4D/5D Spatial Audio Synthesizer for Racing Engine ─────────────────
class Racing4DAudio {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private panner: StereoPannerNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  public toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public startEngineSound() {
    if (this.isMuted || !this.ctx || this.engineOsc) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.setValueAtTime(80, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    // Spatial lane panning: the engine drone follows the car across the road
    if (typeof this.ctx.createStereoPanner === "function") {
      this.panner = this.ctx.createStereoPanner();
      this.panner.pan.setValueAtTime(0, this.ctx.currentTime);
      this.engineOsc.connect(filter);
      filter.connect(this.panner);
      this.panner.connect(this.engineGain);
    } else {
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
    }
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  public updateRPM(speedRatio: number) {
    if (this.isMuted || !this.ctx || !this.engineOsc) return;
    const freq = 80 + speedRatio * 320; // 80Hz to 400Hz idle-to-max engine pitch
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
  }

  /** Pans the engine drone with the car's lane for 4D spatial presence. */
  public updateSpatialPan(pan: number) {
    if (this.isMuted || !this.ctx || !this.panner) return;
    this.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime, 0.08);
  }

  public playNitroWarpSound() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  public playCrashImpact() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public stopEngineSound() {
    if (this.engineOsc) {
      this.engineOsc.stop();
      this.engineOsc.disconnect();
      this.engineOsc = null;
    }
    if (this.panner) {
      this.panner.disconnect();
      this.panner = null;
    }
  }
}

const audioEngine = new Racing4DAudio();

export function RacingEngine({
  onWin,
  onLose,
  car,
  track,
  upgrades,
}: {
  onWin?: (coins: number) => void;
  onLose?: (coins: number) => void;
  car?: SelectedCar;
  track?: SelectedTrack;
  upgrades?: { nitro: number; armor: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(120); // KM/H
  const [nitro, setNitro] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [msg, setMsg] = useState("4D Apex Velocity Engine. Tap Accelerate to Launch.");

  const playerLaneRef = useRef(1); // 0: Left, 1: Center, 2: Right
  const obstaclesRef = useRef<Array<{ lane: number; y: number; speed: number; color: string }>>([]);
  const roadOffsetRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const armorChargesRef = useRef(0);
  const crashedRef = useRef(false);

  const [armorLeft, setArmorLeft] = useState(0);

  // Showroom loadout: dealership paint, top speed, tank upgrades, track theme
  const maxSpeed = car?.speed ?? 320;
  const maxNitro = 100 + (upgrades?.nitro ?? 0) * 25;
  const surfaceStyle = SURFACE_STYLES[track?.surface ?? "asphalt"];
  const bodyColor = car?.color ?? "#22d3ee";

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioEngine.toggleMute(next);
  };

  const handleStart = () => {
    setIsPlaying(true);
    setIsGameOver(false);
    setScore(0);
    setSpeed(140);
    setNitro(maxNitro);
    playerLaneRef.current = 1;
    obstaclesRef.current = [];
    armorChargesRef.current = upgrades?.armor ?? 0;
    setArmorLeft(upgrades?.armor ?? 0);
    crashedRef.current = false;
    audioEngine.startEngineSound();
    setMsg(
      track
        ? `Race active on ${track.name}! Dodge traffic and engage Nitro warp!`
        : "Race Active! Dodge traffic and engage Nitro warp!",
    );
  };

  const triggerNitro = () => {
    if (nitro < 20 || !isPlaying || isGameOver) return;

    setNitro((n) => Math.max(0, n - 35));
    setSpeed((s) => Math.min(maxSpeed, s + 60));
    audioEngine.playNitroWarpSound();

    if (window.navigator?.vibrate) {
      window.navigator.vibrate([60, 30, 60, 30, 100]);
    }
  };

  const moveLane = (dir: -1 | 1) => {
    if (!isPlaying || isGameOver) return;
    const next = Math.max(0, Math.min(2, playerLaneRef.current + dir));
    playerLaneRef.current = next;

    if (window.navigator?.vibrate) {
      window.navigator.vibrate(30);
    }
  };

  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Update Road Speed & Progression
      roadOffsetRef.current = (roadOffsetRef.current + speed * dt * 4) % 80;
      setScore((s) => s + Math.floor(speed * dt * 0.5));
      audioEngine.updateRPM(speed / maxSpeed);
      audioEngine.updateSpatialPan((playerLaneRef.current - 1) * 0.6);

      // Spawn Obstacles
      if (Math.random() < 0.035) {
        const lane = Math.floor(Math.random() * 3);
        const exists = obstaclesRef.current.some((o) => o.lane === lane && o.y < 150);
        if (!exists) {
          obstaclesRef.current.push({
            lane,
            y: -100,
            speed: 60 + Math.random() * 40,
            color: ["#FF1744", "#00E676", "#FFEA00", "#E040FB"][Math.floor(Math.random() * 4)]!,
          });
        }
      }

      // Update Obstacles & Collision Check
      const laneX = [canvas.width * 0.25, canvas.width * 0.5, canvas.width * 0.75];
      const playerY = canvas.height - 110;
      const pX = laneX[playerLaneRef.current]!;

      obstaclesRef.current.forEach((obs, idx) => {
        obs.y += (speed - obs.speed) * dt * 4;

        const oX = laneX[obs.lane]!;
        // Collision Detection Box
        if (Math.abs(obs.y - playerY) < 65 && Math.abs(oX - pX) < 40) {
          if (armorChargesRef.current > 0) {
            // ARMOR PLATE absorbs the impact — glancing blow, race continues
            armorChargesRef.current -= 1;
            setArmorLeft(armorChargesRef.current);
            obs.y = canvas.height + 500; // shunt the traffic car off-screen
            setSpeed((s) => Math.max(80, s - 40));
            audioEngine.playCrashImpact();
            if (window.navigator?.vibrate) window.navigator.vibrate(80);
            setMsg(`ARMOR PLATE ABSORBED IMPACT! ${armorChargesRef.current} plate(s) remaining.`);
          } else if (!crashedRef.current) {
            // CRASH HIT (guarded so a multi-car pile-up only settles once)
            crashedRef.current = true;
            audioEngine.playCrashImpact();
            audioEngine.stopEngineSound();
            if (window.navigator?.vibrate) window.navigator.vibrate([150, 50, 200]);

            setIsGameOver(true);
            setIsPlaying(false);
            onLose?.(100);
            setMsg("CRASH DETECTED! 4D Chassis Structural Failure.");
          }
        }
      });

      // Filter out offscreen traffic
      obstaclesRef.current = obstaclesRef.current.filter((o) => o.y < canvas.height + 100);

      // ── DRAW CANVAS FRAME ─────────────────────────────────────────
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Dynamic Horizon Cyber-Grid & Road
      ctx.fillStyle = surfaceStyle.sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Perspective Road Track
      ctx.fillStyle = surfaceStyle.road;
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.2, 0);
      ctx.lineTo(canvas.width * 0.8, 0);
      ctx.lineTo(canvas.width * 0.95, canvas.height);
      ctx.lineTo(canvas.width * 0.05, canvas.height);
      ctx.fill();

      // Road Lane Markers (4D Moving Lines)
      ctx.strokeStyle = surfaceStyle.lane;
      ctx.setLineDash([30, 30]);
      ctx.lineDashOffset = -roadOffsetRef.current;
      ctx.lineWidth = 4;

      // Left Divider
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.38, 0);
      ctx.lineTo(canvas.width * 0.35, canvas.height);
      ctx.stroke();

      // Right Divider
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.62, 0);
      ctx.lineTo(canvas.width * 0.65, canvas.height);
      ctx.stroke();

      ctx.setLineDash([]); // Reset line dash

      // 2. Render Traffic Vehicles
      obstaclesRef.current.forEach((obs) => {
        const oX = laneX[obs.lane]!;
        ctx.save();
        ctx.translate(oX, obs.y);

        // Car Body Shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(-22, 10, 44, 70);

        // Vehicle Chassis
        ctx.fillStyle = obs.color;
        ctx.beginPath();
        ctx.roundRect(-20, 0, 40, 65, 8);
        ctx.fill();

        // Windshield & Lights
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-14, 15, 28, 18);

        ctx.fillStyle = "#ff1744";
        ctx.fillRect(-16, 58, 10, 5);
        ctx.fillRect(6, 58, 10, 5);

        ctx.restore();
      });

      // 3. Render 4D Player Cyber-Racer
      ctx.save();
      ctx.translate(pX, playerY);

      // Neon Underglow Pulse
      const glowGrad = ctx.createRadialGradient(0, 30, 5, 0, 30, 45);
      glowGrad.addColorStop(0, hexToRgba(bodyColor, 0.8));
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(-45, -10, 90, 80);

      // Player Car Chassis (dealership paint)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-22, -30, 44, 75, 10);
      ctx.fill();

      // Windshield & Cockpit
      ctx.fillStyle = "#020617";
      ctx.fillRect(-15, -10, 30, 22);

      // Headlights
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = bodyColor;
      ctx.shadowBlur = 15;
      ctx.fillRect(-18, -28, 10, 6);
      ctx.fillRect(8, -28, 10, 6);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isGameOver, speed, onLose, maxSpeed, surfaceStyle, bodyColor]);

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border-2 border-cyan-500/30 bg-slate-950 p-4 shadow-[0_0_50px_rgba(6,182,212,0.15)] select-none">
      
      {/* Dynamic Header */}
      <div className="mb-3 flex w-full items-center justify-between border-b border-cyan-500/20 pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400 animate-pulse" />
            <span className="text-xs font-black tracking-widest text-cyan-300">APEX VELOCITY 4D</span>
          </div>
          {(car || track) && (
            <p className="truncate text-[9px] font-bold text-slate-400">
              {car?.name ?? "Stock Racer"} · {track?.name ?? "Open Road"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSound}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
        </button>
      </div>

      {/* Telemetry Dashboard Stats */}
      <div className="mb-3 grid w-full grid-cols-4 gap-2 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <span className="text-[9px] font-black text-slate-400">SPEED</span>
          <p className="text-lg font-black text-cyan-300">{speed} <span className="text-[10px]">KM/H</span></p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <span className="text-[9px] font-black text-slate-400">DISTANCE</span>
          <p className="text-lg font-black text-amber-300">{score} <span className="text-[10px]">M</span></p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <span className="text-[9px] font-black text-slate-400">NITRO</span>
          <p className="text-lg font-black text-rose-400">{Math.round((nitro / maxNitro) * 100)}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <span className="text-[9px] font-black text-slate-400">ARMOR</span>
          <p className="text-lg font-black text-emerald-300">{armorLeft}</p>
        </div>
      </div>

      {/* Main 4D Canvas Horizon Viewport */}
      <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-cyan-500/30 bg-black">
        <canvas ref={canvasRef} width={360} height={380} className="h-full w-full object-cover" />

        {/* Start Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center backdrop-blur-md">
            <Trophy className="h-12 w-12 text-amber-400 animate-bounce mb-2" />
            <h3 className="text-lg font-black text-white">APEX VELOCITY 4D</h3>
            <p className="mt-1 text-xs text-slate-300">Dodge high-speed traffic, trigger Nitro warps, and master sensory steering.</p>
            <button
              type="button"
              onClick={handleStart}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-xs font-black tracking-widest text-white shadow-lg active:scale-95"
            >
              ENGAGE LAUNCH
            </button>
          </div>
        )}

        {/* Crash / Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center backdrop-blur-md">
            <ShieldAlert className="h-12 w-12 text-rose-500 animate-pulse mb-2" />
            <h3 className="text-lg font-black text-white">CHASSIS CRASHED!</h3>
            <p className="mt-1 text-xs text-slate-300">Reached {score} meters before structural impact.</p>
            <button
              type="button"
              onClick={handleStart}
              className="mt-5 flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 py-3.5 text-xs font-black tracking-widest text-white shadow-lg active:scale-95"
            >
              <RotateCcw className="h-4 w-4" /> RESTART RACE
            </button>
          </div>
        )}
      </div>

      {/* 5D Tactile Driving Controls */}
      <div className="mt-4 grid w-full grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => moveLane(-1)}
          className="rounded-2xl border border-cyan-500/40 bg-cyan-950/40 py-4 text-center font-black text-cyan-300 active:scale-90"
        >
          ◀️ STEER LEFT
        </button>

        <button
          type="button"
          onClick={triggerNitro}
          className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/50 bg-gradient-to-b from-rose-600/40 to-slate-950 py-2 font-black text-rose-300 active:scale-90"
        >
          <Flame className="h-5 w-5 text-rose-400 animate-bounce" />
          <span className="text-[10px] tracking-wider">NITRO WARP</span>
        </button>

        <button
          type="button"
          onClick={() => moveLane(1)}
          className="rounded-2xl border border-cyan-500/40 bg-cyan-950/40 py-4 text-center font-black text-cyan-300 active:scale-90"
        >
          STEER RIGHT ▶️
        </button>
      </div>

      {/* Telemetry Log */}
      <div className="mt-3 w-full rounded-xl border border-cyan-500/20 bg-cyan-950/30 px-3 py-2 text-center text-[11px] font-bold text-cyan-200">
        {msg}
      </div>
    </div>
  );
}