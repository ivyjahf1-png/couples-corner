
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Settings,
  MoreVertical,
  Zap,
  Smile,
  ChevronLeft,
  ChevronRight,
  Shield,
  Trophy,
  Wrench,
  UserCheck,
} from "lucide-react";

// Types
export interface DriverRank {
  rank: number;
  name: string;
  country: string;
  flag: string;
  avatarUrl: string;
  carName: string;
  carColor: string;
}

export interface Vehicle {
  id: string;
  name: string;
  category: "Supercar" | "SUV" | "Luxury";
  speed: number;
  handling: number;
  nitro: number;
  color: string;
}

const VEHICLE_ROSTER: Vehicle[] = [
  { id: "v1", name: "Apex Chiron Supercar", category: "Supercar", speed: 98, handling: 92, nitro: 95, color: "#2563eb" },
  { id: "v2", name: "G-Wagon V8 AMG", category: "SUV", speed: 85, handling: 88, nitro: 90, color: "#1e293b" },
  { id: "v3", name: "Benz GLE 63 S", category: "SUV", speed: 89, handling: 86, nitro: 88, color: "#475569" },
  { id: "v4", name: "Lexus RX F-Sport", category: "Luxury", speed: 84, handling: 90, nitro: 85, color: "#dc2626" },
  { id: "v5", name: "BMW M8 Competition", category: "Supercar", speed: 94, handling: 95, nitro: 91, color: "#059669" },
];

const LEADERBOARD: DriverRank[] = [
  { rank: 1, name: "David", country: "Nigeria", flag: "🇳🇬", avatarUrl: "/avatars/david.png", carName: "Apex Chiron", carColor: "from-blue-600 to-cyan-400" },
  { rank: 2, name: "Bella", country: "UK", flag: "🇬🇧", avatarUrl: "/avatars/bella.png", carName: "M8 Competition", carColor: "from-purple-600 to-pink-500" },
  { rank: 3, name: "Tunde", country: "Nigeria", flag: "🇳🇬", avatarUrl: "/avatars/tunde.png", carName: "G-Wagon AMG", carColor: "from-emerald-600 to-teal-400" },
  { rank: 4, name: "Aisha", country: "Canada", flag: "🇨🇦", avatarUrl: "/avatars/aisha.png", carName: "Lexus RX", carColor: "from-amber-500 to-yellow-400" },
];

export function RacingEngine({ onBack }: { onBack?: () => void }) {
  // Game States
  const [speed, setSpeed] = useState<number>(248);
  const [gear, setGear] = useState<number>(5);
  const [nitroGauge, setNitroGauge] = useState<number>(85);
  const [isNitroActive, setIsNitroActive] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [steeringDirection, setSteeringDirection] = useState<"left" | "right" | "straight">("straight");
  const [lap, setLap] = useState<number>(2);
  const [time, setTime] = useState<string>("01:24.56");
  const [chatMessage, setChatMessage] = useState<string>("Tunde: Let's go! 🚀");
  const [activeTab, setActiveTab] = useState<"race" | "garage" | "tuning" | "cities">("race");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulated 60 FPS WebGL / Canvas Rendering with Dynamic Speed Blur & Wet Road Reflection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Night City Wet Asphalt Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, "#030712");
      bgGrad.addColorStop(0.5, "#0b1329");
      bgGrad.addColorStop(1, "#020617");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dynamic Speed Light Streaks (Wet Reflections)
      const speedMultiplier = isNitroActive ? 2.5 : 1.2;
      for (let i = 0; i < 25; i++) {
        const y = (frame * (12 * speedMultiplier) + i * 35) % canvas.height;
        const x = (canvas.width / 2) + (Math.sin(i + frame * 0.05) * 180);
        const streakGrad = ctx.createLinearGradient(x, y, x, y + 80);
        streakGrad.addColorStop(0, "rgba(59, 130, 246, 0.8)");
        streakGrad.addColorStop(1, "rgba(236, 72, 153, 0)");

        ctx.fillStyle = streakGrad;
        ctx.fillRect(x - 1.5, y, 3, 70);
      }

      // Draw Horizon Neon Lights
      ctx.shadowBlur = 15;
      ctx.shadowColor = isNitroActive ? "#06b6d4" : "#ec4899";
      ctx.fillStyle = isNitroActive ? "#0891b2" : "#be185d";
      ctx.fillRect(0, canvas.height * 0.4, canvas.width, 2);
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isNitroActive]);

  // Handle Steering Touch Interactions
  const handleSteer = (dir: "left" | "right") => {
    setSteeringDirection(dir);
    if (window.navigator?.vibrate) window.navigator.vibrate(15);
    setTimeout(() => setSteeringDirection("straight"), 200);
  };

  // Trigger Nitro Boost
  const handleNitroBoost = () => {
    if (nitroGauge < 20) return;
    setIsNitroActive(true);
    setSpeed((s) => Math.min(s + 45, 315));
    if (window.navigator?.vibrate) window.navigator.vibrate([40, 30, 40]);

    setTimeout(() => {
      setIsNitroActive(false);
      setSpeed(248);
    }, 2500);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-950 font-sans text-white select-none">
      {/* ── 1. REAL-TIME CANVAS / 4D SIMULATION LAYER ───────────────── */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" width={600} height={1000} />

      {/* Nitro Speed Blur Overlay */}
      {isNitroActive && (
        <div className="pointer-events-none absolute inset-0 bg-cyan-500/10 backdrop-blur-[1px] transition-all duration-300 animate-pulse" />
      )}

      {/* ── 2. TOP HEADER HUD BAR ────────────────────────────────────── */}
      <header className="relative z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-4 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black italic tracking-wider text-cyan-400">NEED FOR SPEED</span>
            <span className="rounded bg-gradient-to-r from-cyan-500 to-blue-600 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-white shadow-lg">
              3D
            </span>
          </div>
          <span className="text-[10px] font-medium tracking-wide text-slate-400">High Speed • Real Racing • 3D</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            {isSoundMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── 3. LIVE HUD OVERLAYS (RANKING, LAP, MINIMAP) ─────────────── */}
      <div className="relative z-20 flex flex-1 flex-col justify-between p-3">
        <div className="flex justify-between items-start gap-2">
          {/* LEFT: Live Leaderboard Stack */}
          <div className="flex flex-col gap-1.5 w-36">
            {LEADERBOARD.map((item) => (
              <div
                key={item.rank}
                className={`flex items-center gap-2 rounded-xl border p-1.5 backdrop-blur-md transition-all ${
                  item.rank === 1
                    ? "border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-slate-900/80 shadow-lg shadow-amber-500/10"
                    : "border-white/10 bg-slate-900/70"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-xs font-black italic ${
                    item.rank === 1
                      ? "bg-amber-400 text-slate-950"
                      : item.rank === 2
                      ? "bg-purple-500 text-white"
                      : item.rank === 3
                      ? "bg-emerald-500 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {item.rank}
                </span>

                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/20">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.carColor} opacity-40`} />
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-bold">
                    {item.name[0]}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{item.name}</p>
                  <p className="truncate text-[9px] text-slate-400">{item.flag} {item.country}</p>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: Position, Lap, Timer & Circular Minimap */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-slate-950/80 px-3 py-1.5 shadow-xl backdrop-blur-md">
              <div className="text-right">
                <span className="block text-[9px] font-black tracking-widest text-cyan-400">POSITION</span>
                <span className="text-lg font-black italic text-white">1<span className="text-xs text-slate-400">/4</span></span>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="text-right">
                <span className="block text-[9px] font-black tracking-widest text-cyan-400">LAP</span>
                <span className="text-lg font-black italic text-white">{lap}<span className="text-xs text-slate-400">/3</span></span>
              </div>
            </div>

            {/* Timer */}
            <div className="rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300 backdrop-blur-md">
              ⏱️ {time}
            </div>

            {/* Circular Mini-Map */}
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-cyan-400/40 bg-slate-950/90 shadow-2xl backdrop-blur-md">
              <div className="absolute inset-0 border border-dashed border-cyan-500/20 rounded-full m-2" />
              {/* Player Dots */}
              <div className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400 animate-ping" />
              <div className="absolute top-1/3 left-2/3 h-2 w-2 rounded-full bg-purple-400" />
              <div className="absolute top-2/3 left-1/3 h-2 w-2 rounded-full bg-emerald-400" />
            </div>

            {/* Road Sign Overlay */}
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/80 px-2 py-1 text-[10px] font-bold text-emerald-300 backdrop-blur-md">
              DOWNTOWN 3 KM ↗️
            </div>
          </div>
        </div>

        {/* ── 4. BOTTOM CONTROLS & SPEEDOMETER HUB ───────────────────── */}
        <div className="flex items-end justify-between gap-2 pt-4">
          {/* LEFT CONTROLS: Touch Steering */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onTouchStart={() => handleSteer("left")}
                onClick={() => handleSteer("left")}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-500/40 bg-slate-900/80 text-white backdrop-blur-md active:bg-cyan-500/30 active:scale-95 transition"
              >
                <ChevronLeft className="h-8 w-8 text-cyan-400" />
              </button>
              <button
                type="button"
                onTouchStart={() => handleSteer("right")}
                onClick={() => handleSteer("right")}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-500/40 bg-slate-900/80 text-white backdrop-blur-md active:bg-cyan-500/30 active:scale-95 transition"
              >
                <ChevronRight className="h-8 w-8 text-cyan-400" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-950/70 px-3 py-1 text-xs font-bold text-cyan-300 backdrop-blur-md">
              <Zap className="h-3.5 w-3.5 text-cyan-400 animate-bounce" /> Nitro Ready!
            </div>
          </div>

          {/* RIGHT CONTROLS: Speedometer & Nitro Button */}
          <div className="flex items-end gap-3">
            {/* Nitro Button */}
            <button
              type="button"
              onClick={handleNitroBoost}
              className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 shadow-2xl transition active:scale-95 ${
                isNitroActive
                  ? "border-cyan-300 bg-cyan-500 text-white shadow-cyan-500/50 animate-pulse"
                  : "border-cyan-400/60 bg-gradient-to-br from-cyan-600/80 to-blue-800/80 text-cyan-200"
              }`}
            >
              <Zap className="h-6 w-6" />
              <span className="text-[10px] font-black tracking-widest">N2O</span>
            </button>

            {/* Circular Speedometer */}
            <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-cyan-500/40 bg-slate-950/90 shadow-2xl backdrop-blur-md">
              <span className="text-3xl font-black italic tracking-tight text-white">{speed}</span>
              <span className="text-[9px] font-bold tracking-widest text-cyan-400">KM/H</span>
              <div className="mt-1 rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                GEAR {gear}
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. LIVE SOCIAL CHAT BAR ─────────────────────────────────── */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-medium text-slate-200">{chatMessage}</span>
          </div>
          <button type="button" className="text-slate-400 hover:text-white">
            <Smile className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}